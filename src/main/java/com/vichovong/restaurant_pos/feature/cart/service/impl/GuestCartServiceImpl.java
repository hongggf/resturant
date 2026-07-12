package com.vichovong.restaurant_pos.feature.cart.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.cart.dto.CartLineAddRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartLineUpdateRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartResponse;
import com.vichovong.restaurant_pos.feature.cart.dto.CartSelectionRequest;
import com.vichovong.restaurant_pos.feature.cart.entity.CartLineItem;
import com.vichovong.restaurant_pos.feature.cart.entity.CartLineModifierSelection;
import com.vichovong.restaurant_pos.feature.cart.repository.CartLineItemRepository;
import com.vichovong.restaurant_pos.feature.cart.service.CartPricingService;
import com.vichovong.restaurant_pos.feature.cart.service.GuestCartService;
import com.vichovong.restaurant_pos.feature.menu.entity.MenuItem;
import com.vichovong.restaurant_pos.feature.menu.repository.MenuItemRepository;
import com.vichovong.restaurant_pos.feature.modifier.entity.MenuItemModifierGroup;
import com.vichovong.restaurant_pos.feature.modifier.entity.ModifierGroup;
import com.vichovong.restaurant_pos.feature.modifier.entity.ModifierOption;
import com.vichovong.restaurant_pos.feature.modifier.repository.MenuItemModifierGroupRepository;
import com.vichovong.restaurant_pos.feature.modifier.repository.ModifierOptionRepository;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.service.GuestSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuestCartServiceImpl implements GuestCartService {

    private final CartLineItemRepository cartLineItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final ModifierOptionRepository modifierOptionRepository;
    private final MenuItemModifierGroupRepository menuItemModifierGroupRepository;
    private final GuestSessionService guestSessionService;
    private final CartPricingService cartPricingService;

    @Override
    @Transactional
    public CartResponse getCart(UUID sessionId) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        return priceCart(session);
    }

    @Override
    @Transactional
    public CartResponse addLine(UUID sessionId, CartLineAddRequest request) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        MenuItem item = requireOrderableItem(request.menuItemId());
        List<ModifierOption> options = validateSelections(item, request.selections());

        CartLineItem line = new CartLineItem();
        line.setSession(session);
        line.setMenuItem(item);
        line.setQuantity(request.quantity());
        line.setRemark(request.remark());
        applySelections(line, request.selections(), options);

        cartLineItemRepository.save(line);
        return priceCart(session);
    }

    @Override
    @Transactional
    public CartResponse updateLine(UUID sessionId, UUID lineId, CartLineUpdateRequest request) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        CartLineItem line = requireLine(lineId, sessionId);
        MenuItem item = requireOrderableItem(line.getMenuItem().getId());
        List<ModifierOption> options = validateSelections(item, request.selections());

        line.setQuantity(request.quantity());
        line.setRemark(request.remark());
        line.getSelections().clear();
        applySelections(line, request.selections(), options);

        cartLineItemRepository.save(line);
        return priceCart(session);
    }

    @Override
    @Transactional
    public CartResponse removeLine(UUID sessionId, UUID lineId) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        cartLineItemRepository.delete(requireLine(lineId, sessionId));
        return priceCart(session);
    }

    @Override
    @Transactional
    public CartResponse clear(UUID sessionId) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        cartLineItemRepository.deleteBySessionId(sessionId);
        return priceCart(session);
    }

    private CartResponse priceCart(TableSession session) {
        return cartPricingService.price(session,
                cartLineItemRepository.findBySessionIdOrderByCreatedAtAsc(session.getId()));
    }

    private CartLineItem requireLine(UUID lineId, UUID sessionId) {
        // Scoped to the token's session so one table can never touch another table's cart
        return cartLineItemRepository.findByIdAndSessionId(lineId, sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart line not found: " + lineId));
    }

    private MenuItem requireOrderableItem(UUID menuItemId) {
        MenuItem item = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found: " + menuItemId));
        if (!item.isAvailable()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Menu item is not available: " + item.getNameEn());
        }
        return item;
    }

    /**
     * Server-authoritative re-validation against current menu/modifier rows (spec §B2):
     * rejects duplicate options, foreign/unavailable options, and any attached active
     * group whose minChoice/maxChoice bounds are not met. Choice counts are distinct
     * options per group; option quantity covers "2x" of the same add-on.
     */
    private List<ModifierOption> validateSelections(MenuItem item, List<CartSelectionRequest> selections) {
        List<CartSelectionRequest> requested = selections == null ? List.of() : selections;

        Map<UUID, ModifierGroup> activeGroups = menuItemModifierGroupRepository
                .findByMenuItemIdOrderBySortOrderAsc(item.getId()).stream()
                .map(MenuItemModifierGroup::getModifierGroup)
                .filter(ModifierGroup::isActive)
                .collect(Collectors.toMap(ModifierGroup::getId, Function.identity()));

        Set<UUID> seenOptionIds = new HashSet<>();
        Map<UUID, Integer> choicesPerGroup = new HashMap<>();
        List<ModifierOption> resolved = new ArrayList<>(requested.size());

        for (CartSelectionRequest selection : requested) {
            if (!seenOptionIds.add(selection.modifierOptionId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Duplicate modifier option: " + selection.modifierOptionId());
            }
            ModifierOption option = modifierOptionRepository.findById(selection.modifierOptionId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "Unknown modifier option: " + selection.modifierOptionId()));
            ModifierGroup group = option.getModifierGroup();
            if (!activeGroups.containsKey(group.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Modifier option does not apply to this menu item: " + option.getNameEn());
            }
            if (!option.isAvailable()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Modifier option is not available: " + option.getNameEn());
            }
            choicesPerGroup.merge(group.getId(), 1, Integer::sum);
            resolved.add(option);
        }

        for (ModifierGroup group : activeGroups.values()) {
            int chosen = choicesPerGroup.getOrDefault(group.getId(), 0);
            if (chosen < group.getMinChoice()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "\"" + group.getNameEn() + "\" requires at least " + group.getMinChoice() + " choice(s)");
            }
            if (group.getMaxChoice() != null && chosen > group.getMaxChoice()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "\"" + group.getNameEn() + "\" allows at most " + group.getMaxChoice() + " choice(s)");
            }
        }
        return resolved;
    }

    private void applySelections(CartLineItem line, List<CartSelectionRequest> requests,
                                 List<ModifierOption> options) {
        if (requests == null) {
            return;
        }
        for (int i = 0; i < requests.size(); i++) {
            CartLineModifierSelection selection = new CartLineModifierSelection();
            selection.setCartLineItem(line);
            selection.setModifierOption(options.get(i));
            selection.setQuantity(requests.get(i).quantity());
            line.getSelections().add(selection);
        }
    }
}
