package com.vichovong.restaurant_pos.feature.order.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Snapshot values as copied at send-time — never the live menu row. */
public record OrderRoundLineResponse(
        UUID id,
        UUID menuItemId,
        String nameEn,
        String nameKm,
        BigDecimal basePrice,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal,
        String remark,
        boolean voided,
        List<OrderRoundSelectionResponse> selections
) {
}
