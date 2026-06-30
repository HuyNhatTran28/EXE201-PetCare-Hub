package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "diary_reactions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"diary_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiaryReaction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reaction_type")
    private String reactionType; // e.g. HEART, LIKE
}
