package com.petcare_hub.dto.response;

import com.petcare_hub.enums.SenderRole;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class MessageResponse {
    private UUID       id;
    private UUID       conversationId;
    private UUID       senderId;
    private SenderRole senderRole;
    private String     content;
    private Instant    sentAt;
    private Boolean    isRead;
}
