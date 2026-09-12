package com.vichovong.restaurant_pos.feature.promo.controller;

import com.vichovong.restaurant_pos.feature.promo.dto.GuestPromoDto;
import com.vichovong.restaurant_pos.feature.promo.entity.GuestPromo;
import com.vichovong.restaurant_pos.feature.promo.repository.GuestPromoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/promos")
@RequiredArgsConstructor
public class GuestPromoController {

    private final GuestPromoRepository repository;

    @GetMapping("/active")
    public ResponseEntity<GuestPromo> getActivePromo() {
        return repository.findByIsActiveTrue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping
    public List<GuestPromo> getAllPromos() {
        return repository.findAll();
    }

    @PostMapping
    public GuestPromo createPromo(@RequestBody GuestPromoDto dto) {
        if (dto.isActive()) {
            deactivateAll();
        }
        GuestPromo promo = GuestPromo.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .imageUrl(dto.getImageUrl())
                .isActive(dto.isActive())
                .build();
        return repository.save(promo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GuestPromo> updatePromo(@PathVariable Long id, @RequestBody GuestPromoDto dto) {
        return repository.findById(id).map(promo -> {
            if (dto.isActive() && !promo.isActive()) {
                deactivateAll();
            }
            promo.setTitle(dto.getTitle());
            promo.setDescription(dto.getDescription());
            promo.setImageUrl(dto.getImageUrl());
            promo.setActive(dto.isActive());
            return ResponseEntity.ok(repository.save(promo));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromo(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void deactivateAll() {
        List<GuestPromo> activePromos = repository.findAll().stream().filter(GuestPromo::isActive).toList();
        for (GuestPromo p : activePromos) {
            p.setActive(false);
            repository.save(p);
        }
    }
}
