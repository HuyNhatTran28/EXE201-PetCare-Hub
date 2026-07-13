package com.petcare_hub.repository;

import com.petcare_hub.entity.HotelReport;
import com.petcare_hub.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface HotelReportRepository extends JpaRepository<HotelReport, UUID> {
    List<HotelReport> findAllByOrderByCreatedAtDesc();
    List<HotelReport> findByReporterIdOrderByCreatedAtDesc(UUID reporterId);
    boolean existsByReporterIdAndHotelId(UUID reporterId, UUID hotelId);
    boolean existsByReporterIdAndHotelIdAndStatus(UUID reporterId, UUID hotelId, ReportStatus status);
}
