package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.petcare_hub.enums.ServiceType;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Service extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    private String name;
    private String description;
    private BigDecimal price;
    private Integer durationMinutes;
    private Boolean isEnabled;

    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;
}
