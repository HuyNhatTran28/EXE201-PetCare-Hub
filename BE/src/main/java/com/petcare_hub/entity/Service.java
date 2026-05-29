package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.ServiceType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
    name = "services",
    indexes = {
        @Index(name = "idx_services_hotel", columnList = "hotel_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Service extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false, columnDefinition = "numeric(15,2)")
    private BigDecimal price;

    // Thời gian thực hiện (phút)
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false)
    private ServiceType serviceType;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_enabled")
    @Builder.Default
    private Boolean isEnabled = true;
}
