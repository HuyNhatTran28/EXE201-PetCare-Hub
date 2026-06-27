package com.petcare_hub.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ConversationResponse {
    private UUID   id;
    private UUID   bookingId;
    private UUID   petOwnerId;
    private UUID   hotelId;
    private String  hotelName;
    private Instant lastMessageAt;
    private String  lastMessageContent;
    private Long    unreadCount;

    // Chi tiết bổ sung phục vụ phân biệt
    private String  petNames;
    private java.time.LocalDate checkInDate;
    private java.time.LocalDate checkOutDate;
    private String bookingType;
}
