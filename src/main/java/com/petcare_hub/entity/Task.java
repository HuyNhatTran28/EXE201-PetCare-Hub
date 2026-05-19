package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.TaskType;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Task extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "pet_id")
    private Pet pet;

    @ManyToOne
    @JoinColumn(name = "assigned_staff_id")
    private Staff assignedStaff;

    @Enumerated(EnumType.STRING)
    private TaskType taskType;

    private LocalDateTime scheduledTime;
    private String careInstructions;
    private Boolean isDone;
    private LocalDateTime completedAt;
    private Boolean isUrgent;
}
