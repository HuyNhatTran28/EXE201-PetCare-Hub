package com.petcare_hub.controller;

import com.petcare_hub.dto.request.StaffRequest;
import com.petcare_hub.dto.response.StaffResponse;
import com.petcare_hub.service.StaffService;
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
@RequestMapping("/api/partner/staff")
@RequiredArgsConstructor
@Tag(name = "Staff", description = "Quản lý nhân sự của đối tác")
public class StaffController {

    private final StaffService staffService;

    @Operation(summary = "Lấy danh sách nhân viên của khách sạn")
    @GetMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<List<StaffResponse>> getStaff(
            @PathVariable UUID hotelId,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(staffService.getStaffByHotel(hotelId, partnerId));
    }

    @Operation(summary = "Thêm nhân viên mới vào khách sạn bằng email")
    @PostMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<StaffResponse> addStaff(
            @PathVariable UUID hotelId,
            @Valid @RequestBody StaffRequest request,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(staffService.addStaffToHotel(hotelId, partnerId, request));
    }

    @Operation(summary = "Cập nhật chức vụ / trạng thái ca trực của nhân viên")
    @PutMapping("/{staffId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<StaffResponse> updateStaff(
            @PathVariable UUID staffId,
            @Valid @RequestBody StaffRequest request,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(staffService.updateStaff(staffId, partnerId, request));
    }

    @Operation(summary = "Xóa nhân viên khỏi khách sạn")
    @DeleteMapping("/{staffId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Void> removeStaff(
            @PathVariable UUID staffId,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        staffService.removeStaff(staffId, partnerId);
        return ResponseEntity.noContent().build();
    }
}
