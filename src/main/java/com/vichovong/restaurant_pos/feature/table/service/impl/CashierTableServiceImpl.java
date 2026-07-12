package com.vichovong.restaurant_pos.feature.table.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.order.entity.OrderRound;
import com.vichovong.restaurant_pos.feature.order.entity.RoundStatus;
import com.vichovong.restaurant_pos.feature.order.repository.OrderRoundRepository;
import com.vichovong.restaurant_pos.feature.table.dto.StaffSessionResponse;
import com.vichovong.restaurant_pos.feature.table.dto.TableOverviewResponse;
import com.vichovong.restaurant_pos.feature.table.dto.TableOverviewResponse.TableState;
import com.vichovong.restaurant_pos.feature.table.entity.DiningTable;
import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.DiningTableRepository;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import com.vichovong.restaurant_pos.feature.table.service.CashierTableService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CashierTableServiceImpl implements CashierTableService {

    private final DiningTableRepository diningTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final OrderRoundRepository orderRoundRepository;
    private final TableSessionManager tableSessionManager;

    @Override
    @Transactional(readOnly = true)
    public List<TableOverviewResponse> getOverview() {
        List<DiningTable> tables = diningTableRepository.findAll(Sort.by("tableNumber")).stream()
                .filter(DiningTable::isActive)
                .toList();

        Map<UUID, TableSession> sessionsByTableId = tableSessionRepository
                .findByStatus(SessionStatus.ACTIVE).stream()
                .collect(Collectors.toMap(s -> s.getTable().getId(), Function.identity()));

        Map<UUID, List<OrderRound>> roundsBySessionId = orderRoundRepository
                .findBySessionIdIn(sessionsByTableId.values().stream().map(TableSession::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(r -> r.getSession().getId()));

        return tables.stream()
                .map(table -> toOverview(table, sessionsByTableId.get(table.getId()), roundsBySessionId))
                .toList();
    }

    @Override
    public StaffSessionResponse openSession(UUID tableId) {
        DiningTable table = diningTableRepository.findById(tableId)
                .filter(DiningTable::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Table not found: " + tableId));
        TableSession session = tableSessionManager.findOrCreateActiveSession(table);
        return new StaffSessionResponse(
                session.getId(),
                table.getId(),
                table.getTableNumber(),
                session.getStatus(),
                session.getCreatedAt()
        );
    }

    private TableOverviewResponse toOverview(DiningTable table, TableSession session,
                                             Map<UUID, List<OrderRound>> roundsBySessionId) {
        if (session == null) {
            return new TableOverviewResponse(table.getId(), table.getTableNumber(),
                    TableState.IDLE, null, 0, BigDecimal.ZERO);
        }

        List<OrderRound> liveRounds = roundsBySessionId
                .getOrDefault(session.getId(), List.of()).stream()
                .filter(r -> r.getStatus() != RoundStatus.CANCELLED)
                .toList();

        // Derived, never stored (cashier spec §2): no live rounds -> IDLE;
        // any SENT -> ORDERED; otherwise everything is READY -> SERVED
        TableState state;
        if (liveRounds.isEmpty()) {
            state = TableState.IDLE;
        } else if (liveRounds.stream().anyMatch(r -> r.getStatus() == RoundStatus.SENT)) {
            state = TableState.ORDERED;
        } else {
            state = TableState.SERVED;
        }

        int openRoundCount = (int) liveRounds.stream()
                .filter(r -> r.getStatus() == RoundStatus.SENT || r.getStatus() == RoundStatus.READY)
                .count();
        BigDecimal runningTotal = liveRounds.stream()
                .map(OrderRound::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new TableOverviewResponse(table.getId(), table.getTableNumber(),
                state, session.getId(), openRoundCount, runningTotal);
    }
}
