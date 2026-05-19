package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.PointAction;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "point_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PointLog extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking relatedBooking;

    @Enumerated(EnumType.STRING)
    private PointAction transactionType;

    private Integer pointsChange;
}
