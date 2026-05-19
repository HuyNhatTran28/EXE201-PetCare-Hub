package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.Action;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Audit extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    private Action action;
    private String changeDetailJson;
}
