package com.vichovong.restaurant_pos.feature.cart.service;

import com.vichovong.restaurant_pos.feature.cart.dto.CartLineAddRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartLineUpdateRequest;
import com.vichovong.restaurant_pos.feature.cart.dto.CartResponse;

import java.util.UUID;

public interface GuestCartService {

    CartResponse getCart(UUID sessionId);

    CartResponse addLine(UUID sessionId, CartLineAddRequest request);

    CartResponse updateLine(UUID sessionId, UUID lineId, CartLineUpdateRequest request);

    CartResponse removeLine(UUID sessionId, UUID lineId);

    CartResponse clear(UUID sessionId);
}
