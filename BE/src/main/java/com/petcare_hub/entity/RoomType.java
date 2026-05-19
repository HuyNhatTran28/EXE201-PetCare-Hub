package com.petcare_hub.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import com.petcare_hub.base.BaseEntity;
import org.hibernate.annotations.Type;


@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomType extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    private String name;
    private String description;
    private BigDecimal pricePerNight;
    private Integer maxPets;
    private Integer totalRooms;
    private Integer availableRooms;

    @Type(JsonType.class)
    @Column(name = "allowed_pet_types", columnDefinition = "jsonb")
    private List<String> allowedPetTypes;

    @Type(JsonType.class)
    @Column(name = "images", columnDefinition = "jsonb")
    private List<String> images;
}
