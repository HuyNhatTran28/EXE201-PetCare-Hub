package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(
    name = "room_types",
    indexes = {
        @Index(name = "idx_room_types_hotel", columnList = "hotel_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    // Giá mỗi đêm — dùng BigDecimal tránh sai số
    @Column(name = "price_per_night", nullable = false,
            columnDefinition = "numeric(15,2)")
    private BigDecimal pricePerNight;

    // Số thú cưng tối đa trong 1 phòng
    @Column(name = "max_pets")
    private Integer maxPets;

    // Tổng số phòng vật lý loại này
    @Column(name = "total_rooms")
    private Integer totalRooms;

    // Loại thú cưng được nhận: ["CAT", "DOG_SMALL", "DOG_LARGE"]
    @Type(JsonType.class)
    @Column(name = "allowed_pet_types", columnDefinition = "jsonb")
    private List<String> allowedPetTypes;

    // Camera xem trực tiếp — V2
    @Column(name = "has_webcam")
    @Builder.Default
    private Boolean hasWebcam = false;

    // Ảnh phòng
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> images;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
