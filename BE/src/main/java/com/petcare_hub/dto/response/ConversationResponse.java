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
    private Instant lastMessageAt;
    private String  lastMessageContent;
    private Long    unreadCount;
}
