package com.petcare_hub.controller;

import com.petcare_hub.dto.request.EquipmentRequest;
import com.petcare_hub.dto.response.EquipmentResponse;
import com.petcare_hub.service.EquipmentService;
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
@RequestMapping("/api/partner/equipments")
@RequiredArgsConstructor
@Tag(name = "Equipment", description = "Quản lý thiết bị của đối tác")
public class EquipmentController {

    private final EquipmentService equipmentService;

    @Operation(summary = "Lấy danh sách thiết bị của khách sạn")
    @GetMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<List<EquipmentResponse>> getEquipments(
            @PathVariable UUID hotelId,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(equipmentService.getEquipmentByHotel(hotelId, partnerId));
    }

    @Operation(summary = "Thêm thiết bị mới vào khách sạn")
    @PostMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<EquipmentResponse> addEquipment(
            @PathVariable UUID hotelId,
            @Valid @RequestBody EquipmentRequest request,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(equipmentService.addEquipment(hotelId, partnerId, request));
    }

    @Operation(summary = "Cập nhật thông tin thiết bị")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<EquipmentResponse> updateEquipment(
            @PathVariable UUID id,
            @Valid @RequestBody EquipmentRequest request,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(equipmentService.updateEquipment(id, partnerId, request));
    }

    @Operation(summary = "Xóa thiết bị")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Void> deleteEquipment(
            @PathVariable UUID id,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        equipmentService.deleteEquipment(id, partnerId);
        return ResponseEntity.noContent().build();
    }
}
