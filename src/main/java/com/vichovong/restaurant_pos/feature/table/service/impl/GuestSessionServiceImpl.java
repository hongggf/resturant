package com.vichovong.restaurant_pos.feature.table.service.impl;

import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.table.dto.GuestSessionRequest;
import com.vichovong.restaurant_pos.feature.table.dto.GuestSessionResponse;
import com.vichovong.restaurant_pos.feature.table.entity.DiningTable;
import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.DiningTableRepository;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import com.vichovong.restaurant_pos.feature.table.service.GuestSessionService;
import com.vichovong.restaurant_pos.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuestSessionServiceImpl implements GuestSessionService {

    private final DiningTableRepository diningTableRepository;
    private final TableSessionRepository tableSessionRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public GuestSessionResponse resolve(GuestSessionRequest request) {
        DiningTable table = diningTableRepository.findByQrToken(request.qrToken())
                .filter(DiningTable::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invalid QR code"));

        TableSession session = findOrCreateActiveSession(table);
        String token = jwtTokenProvider.generateGuestToken(session.getId());
        return new GuestSessionResponse(
                token,
                jwtTokenProvider.getGuestExpirationMs(),
                session.getId(),
                table.getTableNumber()
        );
    }

    @Override
    @Transactional
    public TableSession requireActiveSession(UUID sessionId) {
        TableSession session = tableSessionRepository.findById(sessionId)
                .filter(s -> s.getStatus() == SessionStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "Table session is closed"));
        session.setLastActivityAt(Instant.now());
        return session;
    }

    // Deliberately not @Transactional: if the insert loses the one-ACTIVE-per-table race,
    // the constraint violation must not doom an enclosing transaction before the re-fetch.
    private TableSession findOrCreateActiveSession(DiningTable table) {
        return tableSessionRepository.findByTableIdAndStatus(table.getId(), SessionStatus.ACTIVE)
                .map(this::touch)
                .orElseGet(() -> {
                    try {
                        TableSession session = new TableSession();
                        session.setTable(table);
                        session.setStatus(SessionStatus.ACTIVE);
                        session.setLastActivityAt(Instant.now());
                        return tableSessionRepository.save(session);
                    } catch (DataIntegrityViolationException e) {
                        // Another phone at the same table created the session first — share it
                        return tableSessionRepository.findByTableIdAndStatus(table.getId(), SessionStatus.ACTIVE)
                                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                                        "Could not open a session for this table, please rescan"));
                    }
                });
    }

    private TableSession touch(TableSession session) {
        session.setLastActivityAt(Instant.now());
        return tableSessionRepository.save(session);
    }
}
