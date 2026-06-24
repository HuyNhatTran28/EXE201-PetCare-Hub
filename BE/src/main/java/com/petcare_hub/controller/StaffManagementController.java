package com.petcare_hub.controller;

import com.petcare_hub.base.ApiResponse;
import com.petcare_hub.dto.request.CreateStaffRequest;
import com.petcare_hub.dto.response.StaffResponse;
import com.petcare_hub.service.StaffManagementService;
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
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Tag(name = "Staff Management", description = "Chủ khách sạn quản lý tài khoản nhân viên")
public class StaffManagementController {

    private final StaffManagementService staffManagementService;

    @Operation(summary = "Tạo tài khoản nhân viên cho khách sạn của mình")
    @PostMapping
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            Authentication authentication) {

        UUID partnerId = (UUID) authentication.getPrincipal();
        StaffResponse response = staffManagementService.createStaff(partnerId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @Operation(summary = "Danh sách nhân viên của một khách sạn")
    @GetMapping
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getStaff(
            @RequestParam UUID hotelId,
            Authentication authentication) {

        UUID partnerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(
                staffManagementService.getStaffByHotel(partnerId, hotelId)));
    }

    @Operation(summary = "Bật/tắt tài khoản nhân viên")
    @PatchMapping("/{staffId}/toggle-active")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<ApiResponse<StaffResponse>> toggleActive(
            @PathVariable UUID staffId,
            Authentication authentication) {

        UUID partnerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(
                staffManagementService.toggleActive(partnerId, staffId)));
    }
}
