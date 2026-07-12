package com.vichovong.restaurant_pos.feature.table.repository;

import com.vichovong.restaurant_pos.feature.table.entity.SessionStatus;
import com.vichovong.restaurant_pos.feature.table.entity.TableSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TableSessionRepository extends JpaRepository<TableSession, UUID> {

    Optional<TableSession> findByTableIdAndStatus(UUID tableId, SessionStatus status);

    boolean existsByTableId(UUID tableId);

    List<TableSession> findByStatusAndLastActivityAtBefore(SessionStatus status, Instant cutoff);

    // Serializes round-send and close-out against concurrent cart mutations (spec §B2)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TableSession s where s.id = :id")
    Optional<TableSession> findByIdForUpdate(@Param("id") UUID id);
}
