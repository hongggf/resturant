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
import com.vichovong.restaurant_pos.feature.cart.service.CartValidationService;
import com.vichovong.restaurant_pos.feature.cart.service.GuestCartService;
import com.vichovong.restaurant_pos.feature.menu.entity.MenuItem;
import com.vichovong.restaurant_pos.feature.modifier.entity.ModifierOption;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.service.GuestSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuestCartServiceImpl implements GuestCartService {

    private final CartLineItemRepository cartLineItemRepository;
    private final GuestSessionService guestSessionService;
    private final CartValidationService cartValidationService;
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
        MenuItem item = cartValidationService.requireOrderableItem(request.menuItemId());
        List<ModifierOption> options = cartValidationService.validateSelections(item, request.selections());

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
        MenuItem item = cartValidationService.requireOrderableItem(line.getMenuItem().getId());
        List<ModifierOption> options = cartValidationService.validateSelections(item, request.selections());

        line.setQuantity(request.quantity());
        line.setRemark(request.remark());
        line.getSelections().clear();
        // Flush orphan deletes before re-inserting: Hibernate orders inserts first,
        // which breaks uq_cart_line_modifier_option when a selection is kept
        cartLineItemRepository.saveAndFlush(line);
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
