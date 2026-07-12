package com.vichovong.restaurant_pos.feature.order.controller;

import com.vichovong.restaurant_pos.common.dto.ApiResponse;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundRequest;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundResponse;
import com.vichovong.restaurant_pos.feature.order.dto.ReasonRequest;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;
import com.vichovong.restaurant_pos.feature.order.service.CashierRoundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
@RequiredArgsConstructor
public class CashierRoundController {

    private final CashierRoundService cashierRoundService;

    @GetMapping("/rounds")
    public ResponseEntity<ApiResponse<List<CashierRoundResponse>>> getQueue(
            @RequestParam(defaultValue = "SENT") RoundStatus status) {
        return ResponseEntity.ok(ApiResponse.success(cashierRoundService.getQueue(status)));
    }

    @GetMapping("/sessions/{sessionId}/rounds")
    public ResponseEntity<ApiResponse<List<CashierRoundResponse>>> getSessionRounds(
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(ApiResponse.success(cashierRoundService.getSessionRounds(sessionId)));
    }

    @PutMapping("/rounds/{id}/ready")
    public ResponseEntity<ApiResponse<CashierRoundResponse>> markReady(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Round marked ready",
                cashierRoundService.markReady(id)));
    }

    @PutMapping("/rounds/{id}/cancel")
    public ResponseEntity<ApiResponse<CashierRoundResponse>> cancel(
            @PathVariable UUID id, @Valid @RequestBody ReasonRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Round cancelled",
                cashierRoundService.cancel(id, request.reason())));
    }

    @PutMapping("/rounds/{id}/lines/{lineId}/void")
    public ResponseEntity<ApiResponse<CashierRoundResponse>> voidLine(
            @PathVariable UUID id, @PathVariable UUID lineId,
            @Valid @RequestBody ReasonRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Line voided",
                cashierRoundService.voidLine(id, lineId, request.reason(), authentication.getName())));
    }

    @PostMapping("/sessions/{sessionId}/rounds")
    public ResponseEntity<ApiResponse<CashierRoundResponse>> submitRound(
            @PathVariable UUID sessionId, @Valid @RequestBody CashierRoundRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order sent",
                cashierRoundService.submitRound(sessionId, request)));
    }
}
