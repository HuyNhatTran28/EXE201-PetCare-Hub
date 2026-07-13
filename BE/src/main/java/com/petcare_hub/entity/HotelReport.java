package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;

@Entity
@Table(name = "hotel_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelReport extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> imageUrls;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String adminNote;
}
