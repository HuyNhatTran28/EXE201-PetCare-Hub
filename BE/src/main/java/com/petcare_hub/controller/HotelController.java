package com.petcare_hub.controller;

import com.petcare_hub.dto.request.HotelRequest;
import com.petcare_hub.dto.response.HotelResponse;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.service.HotelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
@Tag(name = "Hotel", description = "Quản lý khách sạn thú cưng")
public class HotelController {

    private final HotelService hotelService;

    // ── POST /api/hotels — Partner tạo KS mới ─────────────────
    @Operation(summary = "Partner tạo khách sạn mới")
    @PostMapping
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<HotelResponse> createHotel(
            @Valid @RequestBody HotelRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(hotelService.createHotel(partnerId, request));
    }

    // ── GET /api/hotels/{id} — Xem chi tiết KS ────────────────
    @Operation(summary = "Xem chi tiết khách sạn")
    @GetMapping("/{id}")
    public ResponseEntity<HotelResponse> getHotel(
            @PathVariable UUID id,
            Authentication auth) {
        UUID requesterId = (auth != null) ? (UUID) auth.getPrincipal() : null;
        boolean isAdmin  = (auth != null) && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(hotelService.getHotelById(id, requesterId, isAdmin));
    }

    // ── GET /api/hotels/my — Partner xem KS của mình ──────────
    @Operation(summary = "Partner xem danh sách KS của mình")
    @GetMapping("/my")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Page<HotelResponse>> getMyHotels(
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(hotelService.getMyHotels(partnerId, pageable));
    }

    // ── GET /api/hotels — Admin xem tất cả KS ─────────────────
    @Operation(summary = "Admin xem tất cả khách sạn")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<HotelResponse>> getAllHotels(
            @RequestParam(required = false) HotelStatus status,
            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(hotelService.getAllHotels(status, pageable));
    }

    // ── PATCH /api/hotels/{id}/status — Admin duyệt KS ────────
    @Operation(summary = "Admin duyệt / đóng khách sạn")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HotelResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam HotelStatus status) {

        return ResponseEntity.ok(hotelService.updateHotelStatus(id, status));
    }

    // ── PUT /api/hotels/{id} — Partner cập nhật KS ────────────
    @Operation(summary = "Partner cập nhật thông tin KS")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<HotelResponse> updateHotel(
            @PathVariable UUID id,
            @Valid @RequestBody HotelRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(hotelService.updateHotel(id, partnerId, request));
    }

    // ── PATCH /api/hotels/{id}/status/toggle — Partner tạm ngưng / mở lại KS ──
    @Operation(summary = "Partner tạm ngưng / mở lại khách sạn")
    @PatchMapping("/{id}/status/toggle")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<HotelResponse> toggleHotelStatus(
            @PathVariable UUID id,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(hotelService.toggleHotelStatus(id, partnerId));
    }

    // ── PATCH /api/hotels/{id}/resubmit — Partner gửi duyệt lại sau khi bị từ chối ──
    @Operation(summary = "Partner gửi duyệt lại khách sạn bị từ chối")
    @PatchMapping("/{id}/resubmit")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<HotelResponse> resubmitHotel(
            @PathVariable UUID id,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(hotelService.resubmitHotel(id, partnerId));
    }

    // ── GET /api/hotels/nearby — Tìm KS gần GPS hoặc tất cả KS nếu không truyền tọa độ ──
    @Operation(summary = "Tìm khách sạn gần vị trí GPS (hoặc tất cả khách sạn ACTIVE)")
    @GetMapping("/nearby")
    public ResponseEntity<List<HotelResponse>> getNearbyHotels(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "50") Double radius) {
        return ResponseEntity.ok(hotelService.findNearbyHotels(lat, lng, radius));
    }

    // ── GET /api/hotels/search — Tìm kiếm tích hợp ─────────────────
    @Operation(summary = "Tìm kiếm khách sạn tích hợp")
    @GetMapping("/search")
    public ResponseEntity<List<HotelResponse>> searchHotels(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "50") Double radius,
            @RequestParam(required = false) String petType,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice) {
        return ResponseEntity.ok(hotelService.searchHotels(lat, lng, radius, petType, minPrice, maxPrice));
    }

    @Operation(summary = "Tự động phân tích tọa độ từ URL Google Maps (hỗ trợ cả link rút gọn)")
    @GetMapping("/resolve-coords")
    public ResponseEntity<java.util.Map<String, Double>> resolveCoords(@RequestParam String url) {
        double[] coords = hotelService.resolveCoordsFromUrl(url);
        java.util.Map<String, Double> response = new java.util.HashMap<>();
        response.put("lat", coords[0]);
        response.put("lng", coords[1]);
        return ResponseEntity.ok(response);
    }
}