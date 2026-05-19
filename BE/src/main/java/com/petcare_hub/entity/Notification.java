package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.Channel;
import com.petcare_hub.enums.Template;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "recipient_user_id")
    private User recipient;

    @Enumerated(EnumType.STRING)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    private Template templateType;

    private String messageContent;
    private Boolean isRead;
    private LocalDateTime sentAt;
}
