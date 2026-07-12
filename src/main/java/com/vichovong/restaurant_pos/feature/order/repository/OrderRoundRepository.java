package com.vichovong.restaurant_pos.feature.order.repository;

import com.vichovong.restaurant_pos.feature.order.entity.OrderRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OrderRoundRepository extends JpaRepository<OrderRound, UUID> {

    List<OrderRound> findBySessionIdOrderByRoundNumberAsc(UUID sessionId);

    @Query("select coalesce(max(r.roundNumber), 0) from OrderRound r where r.session.id = :sessionId")
    int findMaxRoundNumber(@Param("sessionId") UUID sessionId);
}
