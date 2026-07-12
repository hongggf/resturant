package com.vichovong.restaurant_pos.feature.order.service;

import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundRequest;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundResponse;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;

import java.util.List;
import java.util.UUID;

/**
 * Staff round management (cashier spec §3–§5). Rounds are immutable snapshots —
 * "edit" never mutates a line: it voids, cancels, or adds a new round.
 */
public interface CashierRoundService {

    /** FIFO across all tables, ordered by sentAt — sentAt IS the queue. */
    List<CashierRoundResponse> getQueue(RoundStatus status);

    List<CashierRoundResponse> getSessionRounds(UUID sessionId);

    /** SENT -> READY. A future kitchen module takes over this same transition. */
    CashierRoundResponse markReady(UUID roundId);

    /** SENT/READY -> CANCELLED with a required reason; excluded from bill and queue. */
    CashierRoundResponse cancel(UUID roundId, String reason);

    /**
     * Whole-line void with a required reason: sets void fields and recomputes the
     * round's totals from non-voided lines. The row is never deleted.
     */
    CashierRoundResponse voidLine(UUID roundId, UUID lineId, String reason, String username);

    /**
     * Cashier manual ordering: same validation, pricing, and snapshot path as the
     * guest cart-send, but submitted directly as a round in one call.
     */
    CashierRoundResponse submitRound(UUID sessionId, CashierRoundRequest request);
}
