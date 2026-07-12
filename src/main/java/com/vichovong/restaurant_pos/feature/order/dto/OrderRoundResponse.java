package com.vichovong.restaurant_pos.feature.order.dto;

import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderRoundResponse(
        UUID id,
        int roundNumber,
        RoundStatus status,
        BigDecimal subtotal,
        BigDecimal vatRate,
        BigDecimal vatAmount,
        BigDecimal grandTotal,
        Instant sentAt,
        List<OrderRoundLineResponse> lines
) {
}
