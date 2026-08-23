package com.vichovong.restaurant_pos.feature.order.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.cart.service.CartPricingService;
import com.vichovong.restaurant_pos.feature.cart.service.CartValidationService;
import com.vichovong.restaurant_pos.feature.order.dto.CashierRoundResponse;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRound;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRoundLineItem;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;
import com.vichovong.restaurant_pos.feature.order.mapper.OrderRoundMapper;
import com.vichovong.restaurant_pos.feature.order.repository.OrderRoundRepository;
import com.vichovong.restaurant_pos.feature.table.entity.DiningTable;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import com.vichovong.restaurant_pos.feature.user.entity.User;
import com.vichovong.restaurant_pos.feature.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashierRoundServiceImplTest {

    @Mock
    private OrderRoundRepository orderRoundRepository;
    @Mock
    private TableSessionRepository tableSessionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CartValidationService cartValidationService;
    @Mock
    private CartPricingService cartPricingService;
    @Mock
    private OrderRoundSnapshotter orderRoundSnapshotter;
    @Mock
    private OrderRoundMapper orderRoundMapper;

    @InjectMocks
    private CashierRoundServiceImpl cashierRoundService;

    private OrderRound sentRound;
    private TableSession session;

    @BeforeEach
    void setUp() {
        DiningTable table = new DiningTable();
        table.setTableNumber("T-01");

        session = new TableSession();
        session.setId(UUID.randomUUID());
        session.setTable(table);

        sentRound = new OrderRound();
        sentRound.setId(UUID.randomUUID());
        sentRound.setSession(session);
        sentRound.setStatus(RoundStatus.SENT);
        sentRound.setRoundNumber(1);
        sentRound.setVatRate(new BigDecimal("0.10"));
        sentRound.setSubtotal(new BigDecimal("10.00"));
        sentRound.setVatAmount(new BigDecimal("1.00"));
        sentRound.setGrandTotal(new BigDecimal("11.00"));
        sentRound.setLines(new ArrayList<>());
    }

    @Test
    @DisplayName("markReady: transitions SENT round to READY")
    void markReady_sentRound_transitionsToReady() {
        when(orderRoundRepository.findById(sentRound.getId())).thenReturn(Optional.of(sentRound));

        CashierRoundResponse expectedResponse = new CashierRoundResponse(
                sentRound.getId(), session.getId(), "T-01", 1, RoundStatus.READY,
                sentRound.getSubtotal(), sentRound.getVatRate(), sentRound.getVatAmount(), sentRound.getGrandTotal(),
                Instant.now(), null, null, List.of()
        );
        when(orderRoundMapper.toCashierRoundResponse(sentRound)).thenReturn(expectedResponse);

        CashierRoundResponse response = cashierRoundService.markReady(sentRound.getId());

        assertThat(sentRound.getStatus()).isEqualTo(RoundStatus.READY);
        assertThat(response.status()).isEqualTo(RoundStatus.READY);
    }

    @Test
    @DisplayName("markReady: throws CONFLICT when round is not SENT (e.g., READY or COMPLETED)")
    void markReady_notSentRound_throwsConflict() {
        sentRound.setStatus(RoundStatus.READY);
        when(orderRoundRepository.findById(sentRound.getId())).thenReturn(Optional.of(sentRound));

        assertThatThrownBy(() -> cashierRoundService.markReady(sentRound.getId()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("cancel: cancels SENT or READY round and records reason")
    void cancel_sentRound_setsStatusToCancelledWithReason() {
        when(orderRoundRepository.findById(sentRound.getId())).thenReturn(Optional.of(sentRound));

        CashierRoundResponse expectedResponse = new CashierRoundResponse(
                sentRound.getId(), session.getId(), "T-01", 1, RoundStatus.CANCELLED,
                sentRound.getSubtotal(), sentRound.getVatRate(), sentRound.getVatAmount(), sentRound.getGrandTotal(),
                Instant.now(), Instant.now(), "Customer changed mind", List.of()
        );
        when(orderRoundMapper.toCashierRoundResponse(sentRound)).thenReturn(expectedResponse);

        CashierRoundResponse response = cashierRoundService.cancel(sentRound.getId(), "Customer changed mind");

        assertThat(sentRound.getStatus()).isEqualTo(RoundStatus.CANCELLED);
        assertThat(sentRound.getCancelReason()).isEqualTo("Customer changed mind");
        assertThat(sentRound.getCancelledAt()).isNotNull();
    }

    @Test
    @DisplayName("cancel: throws CONFLICT when round is already CANCELLED or COMPLETED")
    void cancel_alreadyCancelledRound_throwsConflict() {
        sentRound.setStatus(RoundStatus.CANCELLED);
        when(orderRoundRepository.findById(sentRound.getId())).thenReturn(Optional.of(sentRound));

        assertThatThrownBy(() -> cashierRoundService.cancel(sentRound.getId(), "Duplicate"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("voidLine: marks line as voided and recomputes round totals correctly")
    void voidLine_validLine_marksVoidedAndRecomputesTotals() {
        OrderRoundLineItem line1 = new OrderRoundLineItem();
        line1.setId(UUID.randomUUID());
        line1.setOrderRound(sentRound);
        line1.setLineTotal(new BigDecimal("10.00"));
        line1.setVoidedAt(null);

        OrderRoundLineItem line2 = new OrderRoundLineItem();
        line2.setId(UUID.randomUUID());
        line2.setOrderRound(sentRound);
        line2.setLineTotal(new BigDecimal("15.00"));
        line2.setVoidedAt(null);

        sentRound.setLines(new ArrayList<>(List.of(line1, line2)));
        sentRound.setSubtotal(new BigDecimal("25.00"));
        sentRound.setVatAmount(new BigDecimal("2.50"));
        sentRound.setGrandTotal(new BigDecimal("27.50"));

        when(orderRoundRepository.findById(sentRound.getId())).thenReturn(Optional.of(sentRound));

        User user = new User();
        user.setUsername("cashier01");
        when(userRepository.findByUsername("cashier01")).thenReturn(Optional.of(user));

        cashierRoundService.voidLine(sentRound.getId(), line1.getId(), "Entered wrong item", "cashier01");

        assertThat(line1.isVoided()).isTrue();
        assertThat(line1.getVoidReason()).isEqualTo("Entered wrong item");
        assertThat(line1.getVoidedBy()).isEqualTo(user);
        assertThat(line1.getVoidedAt()).isNotNull();

        // Totals recomputed from line2 only (15.00)
        assertThat(sentRound.getSubtotal()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(sentRound.getVatAmount()).isEqualByComparingTo(new BigDecimal("1.50"));
        assertThat(sentRound.getGrandTotal()).isEqualByComparingTo(new BigDecimal("16.50"));
    }
}
