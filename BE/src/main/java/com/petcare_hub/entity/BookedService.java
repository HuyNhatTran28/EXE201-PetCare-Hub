package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "booking_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookedService extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    // Snapshot giá tại thời điểm đặt — không đọc lại từ Service sau này
    @Column(name = "price_snapshot", nullable = false, columnDefinition = "numeric(15,2)")
    private BigDecimal priceSnapshot;
}
