package com.petcare_hub.controller;

import com.petcare_hub.dto.request.ServiceRequest;
import com.petcare_hub.dto.response.ServiceResponse;
import com.petcare_hub.service.ServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Tag(name = "Service", description = "Quản lý dịch vụ khách sạn")
public class ServiceController {

    private final ServiceService serviceService;

    @Operation(summary = "Partner thêm dịch vụ vào KS")
    @PostMapping("/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ServiceResponse> createService(
            @PathVariable UUID hotelId,
            @Valid @RequestBody ServiceRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(serviceService.createService(hotelId, partnerId, request));
    }

    @Operation(summary = "Xem danh sách dịch vụ của KS")
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<ServiceResponse>> getServices(
            @PathVariable UUID hotelId,
            @RequestParam(required = false, defaultValue = "true") Boolean enabledOnly) {

        return ResponseEntity.ok(serviceService.getServicesByHotel(hotelId, enabledOnly));
    }

    @Operation(summary = "Partner cập nhật dịch vụ")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ServiceResponse> updateService(
            @PathVariable UUID id,
            @Valid @RequestBody ServiceRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                serviceService.updateService(id, partnerId, request));
    }

    @Operation(summary = "Partner bật/tắt dịch vụ")
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ServiceResponse> toggleService(
            @PathVariable UUID id,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                serviceService.toggleService(id, partnerId));
    }
}
