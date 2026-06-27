package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "conversations",
    indexes = {
        @Index(name = "idx_conversations_booking",   columnList = "booking_id"),
        @Index(name = "idx_conversations_owner",     columnList = "pet_owner_id"),
        @Index(name = "idx_conversations_hotel",     columnList = "hotel_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation extends BaseEntity {

    @Column(name = "booking_id", unique = true, nullable = false)
    private UUID bookingId;

    @Column(name = "pet_owner_id", nullable = false)
    private UUID petOwnerId;

    @Column(name = "hotel_id", nullable = false)
    private UUID hotelId;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;
}
