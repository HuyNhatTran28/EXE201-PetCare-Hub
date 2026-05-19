package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.petcare_hub.enums.Eating;
import com.petcare_hub.enums.Mood;
import com.petcare_hub.enums.Activity;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "diaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Diary extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "written_by_staff_id")
    private Staff writtenByStaff;

    private LocalDateTime entryTime;
    private String entryTitle;
    private String entryContent;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> attachedMediaUrls;

    @Enumerated(EnumType.STRING)
    private Eating eating;

    @Enumerated(EnumType.STRING)
    private Mood mood;

    @Enumerated(EnumType.STRING)
    private Activity activity;
}
