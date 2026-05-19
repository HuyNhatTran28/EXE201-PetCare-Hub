package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import com.petcare_hub.enums.RoomStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    private String roomNumber;

    @Enumerated(EnumType.STRING)
    private RoomStatus status;
}
