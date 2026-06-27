package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.SenderRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "conversation_messages",
    indexes = {
        @Index(name = "idx_conv_msg_conv_id", columnList = "conversation_id"),
        @Index(name = "idx_conv_msg_sent_at", columnList = "sent_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_role", nullable = false)
    private SenderRole senderRole;

    @Column(columnDefinition = "text", nullable = false)
    private String content;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;
}
