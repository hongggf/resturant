package com.vichovong.restaurant_pos.feature.order.controller;

import com.vichovong.restaurant_pos.common.dto.ApiResponse;
import com.vichovong.restaurant_pos.feature.order.dto.GuestOrdersResponse;
import com.vichovong.restaurant_pos.feature.order.service.GuestOrderService;
import com.vichovong.restaurant_pos.security.GuestPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guest round endpoints — the session id always comes from the guest token,
 * never from the URL, so one table cannot address another's orders.
 */
@RestController
@RequestMapping("/api/v1/guest")
@PreAuthorize("hasRole('GUEST')")
@RequiredArgsConstructor
public class GuestOrderController {

    private final GuestOrderService guestOrderService;

    @PostMapping("/cart/send")
    public ResponseEntity<ApiResponse<GuestOrdersResponse>> send(
            @AuthenticationPrincipal GuestPrincipal guest) {
        return ResponseEntity.ok(ApiResponse.success("Order sent",
                guestOrderService.send(guest.sessionId())));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<GuestOrdersResponse>> getOrders(
            @AuthenticationPrincipal GuestPrincipal guest) {
        return ResponseEntity.ok(ApiResponse.success(
                guestOrderService.getOrders(guest.sessionId())));
    }
}
