package com.vichovong.restaurant_pos.feature.table.service.impl;

import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import com.vichovong.restaurant_pos.feature.table.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Safety net for abandoned tables: closes ACTIVE sessions with no guest activity
 * for the configured idle window. Normal close-out happens in the cashier module.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SessionCleanupJob {

    private final TableSessionRepository tableSessionRepository;

    @Value("${app.session.idle-timeout:PT4H}")
    private Duration idleTimeout;

    @Scheduled(fixedDelayString = "${app.session.cleanup-interval-ms:900000}")
    @Transactional
    public void closeStaleSessions() {
        Instant cutoff = Instant.now().minus(idleTimeout);
        List<TableSession> stale =
                tableSessionRepository.findByStatusAndLastActivityAtBefore(SessionStatus.ACTIVE, cutoff);
        if (stale.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (TableSession session : stale) {
            session.setStatus(SessionStatus.CLOSED);
            session.setClosedAt(now);
        }
        tableSessionRepository.saveAll(stale);
        log.info("Auto-closed {} stale table session(s) idle since before {}", stale.size(), cutoff);
    }
}
