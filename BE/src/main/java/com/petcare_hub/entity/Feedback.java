package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback extends BaseEntity {

    private String category; // BUG, FEATURE_REQUEST, GENERAL

    @Column(columnDefinition = "TEXT")
    private String content;

    private String senderEmail;

    private String senderIp;
}
