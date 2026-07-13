package com.petcare_hub.controller;

import com.petcare_hub.dto.request.CreateReportRequest;
import com.petcare_hub.dto.response.ReportResponse;
import com.petcare_hub.service.HotelReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Hotel Report", description = "Quản lý báo cáo vi phạm khách sạn")
public class HotelReportController {

    private final HotelReportService hotelReportService;

    @Operation(summary = " OWNER gửi báo cáo vi phạm khách sạn")
    @PostMapping("/api/reports/hotels/{hotelId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ReportResponse> createReport(
            @PathVariable UUID hotelId,
            @RequestBody CreateReportRequest request,
            Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(hotelReportService.createReport(userId, hotelId, request));
    }

    @Operation(summary = "OWNER kiểm tra xem đã báo cáo khách sạn chưa")
    @GetMapping("/api/reports/hotels/{hotelId}/check")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Boolean>> checkReported(
            @PathVariable UUID hotelId,
            Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        boolean reported = hotelReportService.checkReported(userId, hotelId);
        return ResponseEntity.ok(Map.of("reported", reported));
    }

    @Operation(summary = "OWNER lấy danh sách báo cáo vi phạm của chính mình")
    @GetMapping("/api/reports/me")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<ReportResponse>> getMyReports(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(hotelReportService.getReportsByReporter(userId));
    }

    @Operation(summary = "ADMIN lấy danh sách tất cả báo cáo")
    @GetMapping("/api/admin/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReportResponse>> getAllReports() {
        return ResponseEntity.ok(hotelReportService.getAllReports());
    }

    @Operation(summary = "ADMIN duyệt báo cáo vi phạm (Khách sạn bị đình chỉ)")
    @PatchMapping("/api/admin/reports/{reportId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReportResponse> approveReport(
            @PathVariable UUID reportId,
            @RequestBody Map<String, String> body) {
        String adminNote = body.getOrDefault("adminNote", "Đình chỉ do vi phạm quy tắc hệ thống.");
        return ResponseEntity.ok(hotelReportService.approveReport(reportId, adminNote));
    }

    @Operation(summary = "ADMIN từ chối báo cáo vi phạm")
    @PatchMapping("/api/admin/reports/{reportId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReportResponse> rejectReport(
            @PathVariable UUID reportId,
            @RequestBody Map<String, String> body) {
        String adminNote = body.getOrDefault("adminNote", "Báo cáo bị từ chối.");
        return ResponseEntity.ok(hotelReportService.rejectReport(reportId, adminNote));
    }
}
