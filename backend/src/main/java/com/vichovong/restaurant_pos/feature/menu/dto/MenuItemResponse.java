package com.vichovong.restaurant_pos.feature.menu.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record MenuItemResponse(
        UUID id,
        String nameEn,
        String nameKm,
        String descriptionEn,
        String descriptionKm,
        BigDecimal price,
        String currencyCode,
        String imageUrl,
        boolean available,
        UUID categoryId,
        String categoryNameEn,
        Instant createdAt,
        Instant updatedAt
) {
}
