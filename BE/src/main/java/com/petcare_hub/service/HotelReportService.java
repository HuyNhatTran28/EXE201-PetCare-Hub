package com.petcare_hub.service;

import com.petcare_hub.dto.request.CreateReportRequest;
import com.petcare_hub.dto.response.ReportResponse;
import java.util.List;
import java.util.UUID;

public interface HotelReportService {
    ReportResponse createReport(UUID userId, UUID hotelId, CreateReportRequest request);
    boolean checkReported(UUID userId, UUID hotelId);
    List<ReportResponse> getAllReports();
    List<ReportResponse> getReportsByReporter(UUID reporterId);
    ReportResponse approveReport(UUID reportId, String adminNote);
    ReportResponse rejectReport(UUID reportId, String adminNote);
}
