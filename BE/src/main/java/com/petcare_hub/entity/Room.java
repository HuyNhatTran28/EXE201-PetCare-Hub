package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import com.petcare_hub.enums.RoomStatus;
import com.petcare_hub.base.BaseEntity;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SQLDelete(sql = "UPDATE rooms SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class Room extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    private String roomNumber;

    @Enumerated(EnumType.STRING)
    private RoomStatus status;
}
