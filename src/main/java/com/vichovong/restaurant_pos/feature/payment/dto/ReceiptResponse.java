package com.vichovong.restaurant_pos.feature.payment.dto;

import java.time.Instant;

/**
 * Full receipt payload returned by payment confirm (cashier spec §6) —
 * "confirm to print" is one call. Rendering/PDF is the frontend + Phase 8 job.
 */
public record ReceiptResponse(
        String restaurantName,
        Instant openedAt,
        Instant closedAt,
        BillResponse bill,
        PaymentResponse payment
) {
}
