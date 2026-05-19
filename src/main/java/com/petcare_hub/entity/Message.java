package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Message extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private User sender;

    private String content;
    private String mediaUrl;
    private Boolean isRead;
    private Boolean isFromAi;
    private LocalDateTime sentAt;
}
