package com.petcare_hub.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ConversationResponse {
    private UUID      id;
    private UUID      bookingId;
    private UUID      petOwnerId;
    private UUID      hotelId;
    private String    hotelName;
    private Instant   lastMessageAt;
    private String    lastMessageContent;
    private Long      unreadCount;
    private String    petNames;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String    bookingType;
}
