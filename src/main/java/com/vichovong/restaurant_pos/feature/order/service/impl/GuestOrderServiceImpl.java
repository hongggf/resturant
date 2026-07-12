package com.vichovong.restaurant_pos.feature.order.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.cart.dto.CartLineResponse;
import com.vichovong.restaurant_pos.feature.cart.dto.CartResponse;
import com.vichovong.restaurant_pos.feature.cart.dto.CartSelectionRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartSelectionResponse;
import com.vichovong.restaurant_pos.feature.cart.entity.CartLineItem;
import com.vichovong.restaurant_pos.feature.cart.repository.CartLineItemRepository;
import com.vichovong.restaurant_pos.feature.cart.service.CartPricingService;
import com.vichovong.restaurant_pos.feature.cart.service.CartValidationService;
import com.vichovong.restaurant_pos.feature.currency.service.ExchangeRateService;
import com.vichovong.restaurant_pos.feature.menu.entity.MenuItem;
import com.vichovong.restaurant_pos.feature.order.dto.GuestOrdersResponse;
import com.vichovong.restaurant_pos.feature.order.dto.OrderRoundLineResponse;
import com.vichovong.restaurant_pos.feature.order.dto.OrderRoundResponse;
import com.vichovong.restaurant_pos.feature.order.dto.OrderRoundSelectionResponse;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRound;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRoundLineItem;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRoundModifierSelection;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;
import com.vichovong.restaurant_pos.feature.order.repository.OrderRoundRepository;
import com.vichovong.restaurant_pos.feature.order.service.GuestOrderService;
import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import com.vichovong.restaurant_pos.feature.table.service.GuestSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuestOrderServiceImpl implements GuestOrderService {

    // v1: single-restaurant deployment, menu prices are USD; KHR is display-only
    private static final String BASE_CURRENCY = "USD";
    private static final String DISPLAY_CURRENCY = "KHR";

    private final OrderRoundRepository orderRoundRepository;
    private final CartLineItemRepository cartLineItemRepository;
    private final TableSessionRepository tableSessionRepository;
    private final GuestSessionService guestSessionService;
    private final CartValidationService cartValidationService;
    private final CartPricingService cartPricingService;
    private final ExchangeRateService exchangeRateService;

    @Override
    @Transactional
    public GuestOrdersResponse send(UUID sessionId) {
        // Row lock serializes concurrent sends and close-out for this session (spec §B2);
        // status is re-checked under the lock so a just-closed session can't be sent to.
        TableSession session = tableSessionRepository.findByIdForUpdate(sessionId)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "Table session is closed"));
        session.setLastActivityAt(Instant.now());

        List<CartLineItem> lines = cartLineItemRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (lines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        // Re-validate every line against current menu/modifier rows — items or options
        // may have become unavailable since they were added to the cart
        for (CartLineItem line : lines) {
            MenuItem item = cartValidationService.requireOrderableItem(line.getMenuItem().getId());
            cartValidationService.validateSelections(item, toSelectionRequests(line));
        }

        CartResponse priced = cartPricingService.price(session, lines);

        OrderRound round = new OrderRound();
        round.setSession(session);
        round.setRoundNumber(orderRoundRepository.findMaxRoundNumber(sessionId) + 1);
        round.setStatus(RoundStatus.SENT);
        round.setSubtotal(priced.subtotal());
        round.setVatRate(priced.vatRate());
        round.setVatAmount(priced.vatAmount());
        round.setGrandTotal(priced.grandTotal());
        round.setSentAt(Instant.now());
        snapshotLines(round, lines, priced.lines());

        orderRoundRepository.save(round);
        cartLineItemRepository.deleteBySessionId(sessionId);

        return buildOrdersResponse(session);
    }

    @Override
    @Transactional
    public GuestOrdersResponse getOrders(UUID sessionId) {
        TableSession session = guestSessionService.requireActiveSession(sessionId);
        return buildOrdersResponse(session);
    }

    private List<CartSelectionRequest> toSelectionRequests(CartLineItem line) {
        return line.getSelections().stream()
                .map(s -> new CartSelectionRequest(s.getModifierOption().getId(), s.getQuantity()))
                .toList();
    }

    /**
     * Copies names and prices from the priced cart into snapshot rows (spec §B core
     * invariant) so later menu edits never change this round. The priced lines are
     * built from {@code lines} in order, so index pairing is safe.
     */
    private void snapshotLines(OrderRound round, List<CartLineItem> lines, List<CartLineResponse> pricedLines) {
        for (int i = 0; i < lines.size(); i++) {
            CartLineItem cartLine = lines.get(i);
            CartLineResponse priced = pricedLines.get(i);

            OrderRoundLineItem line = new OrderRoundLineItem();
            line.setOrderRound(round);
            line.setMenuItem(cartLine.getMenuItem());
            line.setNameEn(priced.nameEn());
            line.setNameKm(priced.nameKm());
            line.setBasePrice(priced.basePrice());
            line.setUnitPrice(priced.unitPrice());
            line.setQuantity(priced.quantity());
            line.setLineTotal(priced.lineTotal());
            line.setRemark(priced.remark());

            List<CartSelectionResponse> pricedSelections = priced.selections();
            for (int j = 0; j < pricedSelections.size(); j++) {
                CartSelectionResponse pricedSelection = pricedSelections.get(j);

                OrderRoundModifierSelection selection = new OrderRoundModifierSelection();
                selection.setOrderRoundLineItem(line);
                selection.setModifierOption(cartLine.getSelections().get(j).getModifierOption());
                selection.setNameEn(pricedSelection.nameEn());
                selection.setNameKm(pricedSelection.nameKm());
                selection.setUnitPrice(pricedSelection.unitPrice());
                selection.setQuantity(pricedSelection.quantity());
                line.getSelections().add(selection);
            }
            round.getLines().add(line);
        }
    }

    private GuestOrdersResponse buildOrdersResponse(TableSession session) {
        List<OrderRound> rounds = orderRoundRepository.findBySessionIdOrderByRoundNumberAsc(session.getId());

        BigDecimal runningGrandTotal = rounds.stream()
                .filter(r -> r.getStatus() != RoundStatus.CANCELLED)
                .map(OrderRound::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new GuestOrdersResponse(
                session.getId(),
                rounds.stream().map(this::toRoundResponse).toList(),
                BASE_CURRENCY,
                runningGrandTotal,
                toKhr(runningGrandTotal)
        );
    }

    private OrderRoundResponse toRoundResponse(OrderRound round) {
        return new OrderRoundResponse(
                round.getId(),
                round.getRoundNumber(),
                round.getStatus(),
                round.getSubtotal(),
                round.getVatRate(),
                round.getVatAmount(),
                round.getGrandTotal(),
                round.getSentAt(),
                round.getLines().stream().map(this::toLineResponse).toList()
        );
    }

    private OrderRoundLineResponse toLineResponse(OrderRoundLineItem line) {
        return new OrderRoundLineResponse(
                line.getId(),
                line.getMenuItem() == null ? null : line.getMenuItem().getId(),
                line.getNameEn(),
                line.getNameKm(),
                line.getBasePrice(),
                line.getUnitPrice(),
                line.getQuantity(),
                line.getLineTotal(),
                line.getRemark(),
                line.isVoided(),
                line.getSelections().stream().map(this::toSelectionResponse).toList()
        );
    }

    private OrderRoundSelectionResponse toSelectionResponse(OrderRoundModifierSelection selection) {
        return new OrderRoundSelectionResponse(
                selection.getModifierOption() == null ? null : selection.getModifierOption().getId(),
                selection.getNameEn(),
                selection.getNameKm(),
                selection.getUnitPrice(),
                selection.getQuantity()
        );
    }

    private BigDecimal toKhr(BigDecimal usdAmount) {
        try {
            return exchangeRateService.convert(usdAmount, BASE_CURRENCY, DISPLAY_CURRENCY);
        } catch (ApiException e) {
            // No configured rate must not break the orders view — the client just skips dual display
            return null;
        }
    }
}
