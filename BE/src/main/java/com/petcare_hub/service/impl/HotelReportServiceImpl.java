package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.CreateReportRequest;
import com.petcare_hub.dto.response.ReportResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.HotelReport;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.enums.ReportStatus;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.HotelReportRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.HotelReportService;
import com.petcare_hub.service.AsyncEmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelReportServiceImpl implements HotelReportService {

    private final HotelReportRepository hotelReportRepository;
    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final AsyncEmailService asyncEmailService;

    @Override
    @Transactional
    public ReportResponse createReport(UUID userId, UUID hotelId, CreateReportRequest request) {
        // Kiểm tra xem đã có báo cáo nào đang chờ xử lý hay chưa (chống spam)
        if (hotelReportRepository.existsByReporterIdAndHotelIdAndStatus(userId, hotelId, ReportStatus.PENDING)) {
            throw new RuntimeException("Bạn đã gửi báo cáo vi phạm cho khách sạn này và đang chờ xét duyệt.");
        }

        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách sạn."));

        HotelReport report = HotelReport.builder()
                .reporter(reporter)
                .hotel(hotel)
                .reason(request.getReason())
                .imageUrls(request.getImageUrls())
                .status(ReportStatus.PENDING)
                .build();

        return toResponse(hotelReportRepository.save(report));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkReported(UUID userId, UUID hotelId) {
        return hotelReportRepository.existsByReporterIdAndHotelIdAndStatus(userId, hotelId, ReportStatus.PENDING);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getAllReports() {
        return hotelReportRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getReportsByReporter(UUID reporterId) {
        return hotelReportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReportResponse approveReport(UUID reportId, String adminNote) {
        HotelReport report = hotelReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo vi phạm."));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new RuntimeException("Báo cáo vi phạm này đã được xử lý.");
        }

        report.setStatus(ReportStatus.APPROVED);
        report.setAdminNote(adminNote);

        // Đình chỉ khách sạn
        Hotel hotel = report.getHotel();
        hotel.setStatus(HotelStatus.SUSPENDED);
        hotel.setRejectionReason(adminNote); // Hiển thị lý do đình chỉ
        hotelRepository.save(hotel);

        // Đếm và lấy tất cả các báo cáo vi phạm đã được duyệt của khách sạn này
        List<HotelReport> approvedReports = hotelReportRepository.findAll().stream()
                .filter(r -> r.getHotel().getId().equals(hotel.getId()) && r.getStatus() == ReportStatus.APPROVED)
                .collect(Collectors.toList());
        
        StringBuilder reportsHtml = new StringBuilder();
        reportsHtml.append("<div style=\"background: #fff5f5; border: 1px solid #feb2b2; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: left;\">");
        reportsHtml.append("<h4 style=\"margin: 0 0 12px 0; color: #c53030; font-size: 15px; font-weight: 800; border-bottom: 1px solid #fed7d7; padding-bottom: 6px;\">Danh sách phản ánh vi phạm đã xác thực:</h4>");
        reportsHtml.append("<ul style=\"padding-left: 20px; margin: 0; font-size: 13px; color: #4a5568;\">");
        
        // Thêm báo cáo hiện tại trước (vì nó chưa được lưu với status APPROVED trong DB)
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
        String currentReportTime = java.time.LocalDateTime.now().format(dtf);
        reportsHtml.append("<li style=\"margin-bottom: 12px;\">")
                   .append("<strong style=\"color: #e53e3e;\">[Mới nhất]</strong><br/>")
                   .append("<strong>Thời gian:</strong> ").append(currentReportTime).append("<br/>")
                   .append("<strong>Nội dung phản ánh:</strong> ").append(report.getReason())
                   .append("</li>");

        for (HotelReport r : approvedReports) {
            String timeStr = "N/A";
            if (r.getCreatedAt() != null) {
                timeStr = r.getCreatedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(dtf);
            }
            reportsHtml.append("<li style=\"margin-bottom: 12px;\">")
                       .append("<strong>Thời gian:</strong> ").append(timeStr).append("<br/>")
                       .append("<strong>Nội dung phản ánh:</strong> ").append(r.getReason())
                       .append("</li>");
        }
        reportsHtml.append("</ul>");
        reportsHtml.append("</div>");

        // Gửi email bất đồng bộ thông báo cho đối tác về việc khách sạn bị đình chỉ
        if (hotel.getPartner() != null && hotel.getPartner().getEmail() != null) {
            try {
                asyncEmailService.sendSuspendHotelEmailAsync(
                        hotel.getPartner().getEmail(),
                        hotel.getPartner().getFullName(),
                        hotel.getName(),
                        reportsHtml.toString(),
                        true // isSuspended = true
                );
            } catch (Exception e) {
                System.err.println("Lỗi gửi mail thông báo đình chỉ khách sạn: " + e.getMessage());
            }
        }

        return toResponse(hotelReportRepository.save(report));
    }

    @Override
    @Transactional
    public ReportResponse rejectReport(UUID reportId, String adminNote) {
        HotelReport report = hotelReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo vi phạm."));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new RuntimeException("Báo cáo vi phạm này đã được xử lý.");
        }

        report.setStatus(ReportStatus.REJECTED);
        report.setAdminNote(adminNote);

        return toResponse(hotelReportRepository.save(report));
    }

    private ReportResponse toResponse(HotelReport report) {
        return ReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .reporterName(report.getReporter().getFullName())
                .reporterEmail(report.getReporter().getEmail())
                .hotelId(report.getHotel().getId())
                .hotelName(report.getHotel().getName())
                .reason(report.getReason())
                .imageUrls(report.getImageUrls())
                .status(report.getStatus().name())
                .adminNote(report.getAdminNote())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
