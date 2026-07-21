package com.vichovong.restaurant_pos.feature.table.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One colored square on the cashier status board (cashier spec §2). State is
 * derived, never stored: IDLE (no session or no live rounds), ORDERED (any
 * SENT round), SERVED (rounds exist, all READY).
 */
public record TableOverviewResponse(
        UUID tableId,
        String tableNumber,
        TableState state,
        UUID sessionId,
        int openRoundCount,
        BigDecimal runningTotal
) {

    public enum TableState {
        IDLE,
        ORDERED,
        SERVED
    }
}
