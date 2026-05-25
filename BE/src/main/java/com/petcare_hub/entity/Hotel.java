package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.HotelStatus;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.List;

@Entity
@Table(
    name = "hotels",
    indexes = {
        @Index(name = "idx_hotels_partner", columnList = "partner_id"),
        @Index(name = "idx_hotels_status",  columnList = "status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hotel extends BaseEntity {

    // Chủ khách sạn — phải có role = PARTNER
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String address;

    // Tọa độ GPS — dùng để tìm KS gần user
    @Column(name = "location_lat")
    private Double locationLat;

    @Column(name = "location_long")
    private Double locationLong;

    @Column(columnDefinition = "text")
    private String description;

    // Tiện ích: ["Wifi", "Camera 24/7", "Máy lạnh"]
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> amenities;

    // Giờ nhận / trả phòng
    @Column(name = "check_in_time", length = 10)
    private String checkInTime;

    @Column(name = "check_out_time", length = 10)
    private String checkOutTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private HotelStatus status = HotelStatus.PENDING;

    // Tính động từ reviews — cập nhật mỗi khi có review mới
    @Column(name = "average_rating")
    @Builder.Default
    private Double averageRating = 0.0;

    @Column(name = "total_reviews")
    @Builder.Default
    private Integer totalReviews = 0;
}
