package com.vichovong.restaurant_pos.feature.menu.service.impl;

import com.vichovong.restaurant_pos.common.dto.PageResponse;
import com.vichovong.restaurant_pos.common.exception.ApiException;
import com.vichovong.restaurant_pos.feature.currency.entity.Currency;
import com.vichovong.restaurant_pos.feature.currency.repository.CurrencyRepository;
import com.vichovong.restaurant_pos.feature.menu.dto.MenuItemCreateRequest;
import com.vichovong.restaurant_pos.feature.menu.dto.MenuItemResponse;
import com.vichovong.restaurant_pos.feature.menu.dto.MenuItemUpdateRequest;
import com.vichovong.restaurant_pos.feature.menu.entity.Category;
import com.vichovong.restaurant_pos.feature.menu.entity.MenuItem;
import com.vichovong.restaurant_pos.feature.menu.mapper.MenuItemMapper;
import com.vichovong.restaurant_pos.feature.menu.repository.CategoryRepository;
import com.vichovong.restaurant_pos.feature.menu.repository.MenuItemRepository;
import com.vichovong.restaurant_pos.feature.menu.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MenuItemServiceImpl implements MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;
    private final CurrencyRepository currencyRepository;
    private final MenuItemMapper menuItemMapper;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public PageResponse<MenuItemResponse> getAll(Pageable pageable, UUID categoryId, Boolean available) {
        Specification<MenuItem> spec = Specification.where(null);
        if (categoryId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId));
        }
        if (available != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("available"), available));
        }
        return PageResponse.from(menuItemRepository.findAll(spec, pageable).map(menuItemMapper::toResponse));
    }

    @Override
    public MenuItemResponse getById(UUID id) {
        return menuItemMapper.toResponse(findMenuItem(id));
    }

    @Override
    @Transactional
    public MenuItemResponse create(MenuItemCreateRequest request) {
        MenuItem menuItem = new MenuItem();
        applyRequest(menuItem, request.nameEn(), request.nameKm(), request.descriptionEn(), request.descriptionKm(),
                request.price(), request.currencyCode(), request.available(), request.categoryId());
        return menuItemMapper.toResponse(menuItemRepository.save(menuItem));
    }

    @Override
    @Transactional
    public MenuItemResponse update(UUID id, MenuItemUpdateRequest request) {
        MenuItem menuItem = findMenuItem(id);
        applyRequest(menuItem, request.nameEn(), request.nameKm(), request.descriptionEn(), request.descriptionKm(),
                request.price(), request.currencyCode(), request.available(), request.categoryId());
        return menuItemMapper.toResponse(menuItem);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        menuItemRepository.delete(findMenuItem(id));
    }

    @Override
    @Transactional
    public MenuItemResponse uploadImage(UUID id, MultipartFile file) {
        MenuItem menuItem = findMenuItem(id);
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Uploaded file is empty");
        }

        try {
            Path dir = Path.of(uploadDir, "menu-items", id.toString());
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + "-" + StringUtils.cleanPath(
                    StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "image");
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            menuItem.setImageUrl("/uploads/menu-items/" + id + "/" + filename);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image: " + e.getMessage());
        }

        return menuItemMapper.toResponse(menuItem);
    }

    private void applyRequest(MenuItem menuItem, String nameEn, String nameKm, String descriptionEn, String descriptionKm,
                               BigDecimal price, String currencyCode, boolean available, UUID categoryId) {
        menuItem.setNameEn(nameEn);
        menuItem.setNameKm(nameKm);
        menuItem.setDescriptionEn(descriptionEn);
        menuItem.setDescriptionKm(descriptionKm);
        menuItem.setPrice(price);
        menuItem.setCurrency(findCurrency(currencyCode));
        menuItem.setAvailable(available);
        menuItem.setCategory(findCategory(categoryId));
    }

    private MenuItem findMenuItem(UUID id) {
        return menuItemRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found: " + id));
    }

    private Category findCategory(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown category: " + id));
    }

    private Currency findCurrency(String code) {
        return currencyRepository.findByCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown currency code: " + code));
    }
}
