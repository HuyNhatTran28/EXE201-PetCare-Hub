package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "hotels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hotel extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "partner_id")
    private User partner;

    private String name;
    private String address;
    private Double locationLat;
    private Double locationLong;
    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> amenities;

    private String checkInTime;
    private String checkOutTime;

    @Builder.Default
    private Integer totalReviews = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private HotelStatus status = HotelStatus.PENDING;

    private Double averageRating;

    @OneToMany(mappedBy = "hotel", fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoomType> roomTypes = new ArrayList<>();
}
