package com.vichovong.restaurant_pos.feature.order.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.cart.dto.CartLineAddRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartResponse;
import com.vichovong.restaurant_pos.feature.cart.entity.CartLineItem;
import com.vichovong.restaurant_pos.feature.cart.entity.CartLineModifierSelection;
import com.vichovong.restaurant_pos.feature.cart.service.CartPricingService;
import com.vichovong.restaurant_pos.feature.cart.service.CartValidationService;
import com.vichovong.restaurant_pos.feature.menu.entity.MenuItem;
import com.vichovong.restaurant_pos.feature.modifier.entity.ModifierOption;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundRequest;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundResponse;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRound;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRoundLineItem;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;
import com.vichovong.restaurant_pos.feature.order.mapper.OrderRoundMapper;
import com.vichovong.restaurant_pos.feature.order.repository.OrderRoundRepository;
import com.vichovong.restaurant_pos.feature.order.service.CashierRoundService;
import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import com.vichovong.restaurant_pos.feature.user.entity.User;
import com.vichovong.restaurant_pos.feature.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashierRoundServiceImpl implements CashierRoundService {

    private final OrderRoundRepository orderRoundRepository;
    private final TableSessionRepository tableSessionRepository;
    private final UserRepository userRepository;
    private final CartValidationService cartValidationService;
    private final CartPricingService cartPricingService;
    private final OrderRoundSnapshotter orderRoundSnapshotter;
    private final OrderRoundMapper orderRoundMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CashierRoundResponse> getQueue(RoundStatus status) {
        return orderRoundRepository.findByStatusOrderBySentAtAsc(status).stream()
                .map(orderRoundMapper::toCashierRoundResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierRoundResponse> getSessionRounds(UUID sessionId) {
        requireSession(sessionId);
        return orderRoundRepository.findBySessionIdOrderByRoundNumberAsc(sessionId).stream()
                .map(orderRoundMapper::toCashierRoundResponse)
                .toList();
    }

    @Override
    @Transactional
    public CashierRoundResponse markReady(UUID roundId) {
        OrderRound round = requireRound(roundId);
        if (round.getStatus() != RoundStatus.SENT) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only a SENT round can be marked ready (current: " + round.getStatus() + ")");
        }
        round.setStatus(RoundStatus.READY);
        return orderRoundMapper.toCashierRoundResponse(round);
    }

    @Override
    @Transactional
    public CashierRoundResponse cancel(UUID roundId, String reason) {
        OrderRound round = requireRound(roundId);
        if (round.getStatus() != RoundStatus.SENT && round.getStatus() != RoundStatus.READY) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only a SENT or READY round can be cancelled (current: " + round.getStatus() + ")");
        }
        round.setStatus(RoundStatus.CANCELLED);
        round.setCancelledAt(Instant.now());
        round.setCancelReason(reason);
        return orderRoundMapper.toCashierRoundResponse(round);
    }

    @Override
    @Transactional
    public CashierRoundResponse voidLine(UUID roundId, UUID lineId, String reason, String username) {
        OrderRound round = requireRound(roundId);
        if (round.getStatus() != RoundStatus.SENT && round.getStatus() != RoundStatus.READY) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Lines can only be voided on a SENT or READY round (current: " + round.getStatus() + ")");
        }
        OrderRoundLineItem line = round.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round line not found: " + lineId));
        if (line.isVoided()) {
            throw new ApiException(HttpStatus.CONFLICT, "Line is already voided");
        }

        line.setVoidedAt(Instant.now());
        line.setVoidedBy(userRepository.findByUsername(username).orElse(null));
        line.setVoidReason(reason);
        recomputeTotals(round);
        return orderRoundMapper.toCashierRoundResponse(round);
    }

    @Override
    @Transactional
    public CashierRoundResponse submitRound(UUID sessionId, CashierRoundRequest request) {
        // Same row lock as the guest send: serializes round numbering and close-out
        TableSession session = tableSessionRepository.findByIdForUpdate(sessionId)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "Table session is closed"));
        session.setLastActivityAt(Instant.now());

        // Transient cart lines (never persisted) reuse the guest validation and
        // pricing verbatim — no draft cart needed staff-side (cashier spec §5)
        List<CartLineItem> lines = new ArrayList<>(request.lines().size());
        for (CartLineAddRequest lineRequest : request.lines()) {
            MenuItem item = cartValidationService.requireOrderableItem(lineRequest.menuItemId());
            List<ModifierOption> options = cartValidationService.validateSelections(item, lineRequest.selections());

            CartLineItem line = new CartLineItem();
            line.setSession(session);
            line.setMenuItem(item);
            line.setQuantity(lineRequest.quantity());
            line.setRemark(lineRequest.remark());
            for (int i = 0; i < options.size(); i++) {
                CartLineModifierSelection selection = new CartLineModifierSelection();
                selection.setCartLineItem(line);
                selection.setModifierOption(options.get(i));
                selection.setQuantity(lineRequest.selections().get(i).quantity());
                line.getSelections().add(selection);
            }
            lines.add(line);
        }

        CartResponse priced = cartPricingService.price(session, lines);
        // No guest device behind a staff-entered round
        OrderRound round = orderRoundSnapshotter.snapshot(session,
                orderRoundRepository.findMaxRoundNumber(sessionId) + 1, null, lines, priced);

        orderRoundRepository.save(round);
        return orderRoundMapper.toCashierRoundResponse(round);
    }

    /** Bill maths stay consistent: totals always derive from non-voided lines and the round's own vatRate. */
    private void recomputeTotals(OrderRound round) {
        BigDecimal subtotal = round.getLines().stream()
                .filter(l -> !l.isVoided())
                .map(OrderRoundLineItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatAmount = subtotal.multiply(round.getVatRate()).setScale(2, RoundingMode.HALF_UP);
        round.setSubtotal(subtotal);
        round.setVatAmount(vatAmount);
        round.setGrandTotal(subtotal.add(vatAmount));
    }

    private OrderRound requireRound(UUID roundId) {
        return orderRoundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found: " + roundId));
    }

    private void requireSession(UUID sessionId) {
        if (!tableSessionRepository.existsById(sessionId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Session not found: " + sessionId);
        }
    }
}
