package com.vichovong.restaurant_pos.feature.cart.repository;

import com.vichovong.restaurant_pos.feature.cart.entity.CartLineItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartLineItemRepository extends JpaRepository<CartLineItem, UUID> {

    List<CartLineItem> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    Optional<CartLineItem> findByIdAndSessionId(UUID id, UUID sessionId);

    void deleteBySessionId(UUID sessionId);
}
