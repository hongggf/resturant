package com.vichovong.restaurant_pos.feature.modifier.service;

import com.vichovong.restaurant_pos.common.dto.PageResponse;
import com.vichovong.restaurant_pos.feature.modifier.dto.ModifierGroupCreateRequest;
import com.vichovong.restaurant_pos.feature.modifier.dto.ModifierGroupResponse;
import com.vichovong.restaurant_pos.feature.modifier.dto.ModifierGroupUpdateRequest;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ModifierGroupService {

    PageResponse<ModifierGroupResponse> getAll(Pageable pageable);

    ModifierGroupResponse getById(UUID id);

    ModifierGroupResponse create(ModifierGroupCreateRequest request);

    ModifierGroupResponse update(UUID id, ModifierGroupUpdateRequest request);

    void delete(UUID id);
}
