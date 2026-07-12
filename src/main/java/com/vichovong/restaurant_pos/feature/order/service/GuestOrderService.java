package com.vichovong.restaurant_pos.feature.order.service;

import com.vichovong.restaurant_pos.feature.order.dto.GuestOrdersResponse;

import java.util.UUID;

public interface GuestOrderService {

    /**
     * Sends the session's draft cart as the next order round: locks the session
     * row, re-validates every line against current menu/modifier rows, snapshots
     * names and prices into an immutable round, and clears the cart — all in one
     * transaction (spec §B2 lifecycle). Returns the updated sent-orders view.
     */
    GuestOrdersResponse send(UUID sessionId);

    /** All rounds of the session plus the running grand total across non-cancelled rounds. */
    GuestOrdersResponse getOrders(UUID sessionId);
}
