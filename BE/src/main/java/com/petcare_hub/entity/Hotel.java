package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.petcare_hub.enums.OperationStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "hotels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Hotel extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "partner_id")
    private User partner;

    private String name;
    private String address;
    private Double locationLat;
    private Double locationLong;
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> amenities;

    private String standardCheckInTime;
    private String standardCheckOutTime;

    @Enumerated(EnumType.STRING)
    private OperationStatus status;
    private Double averageRating;
}
