package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import com.petcare_hub.enums.ShiftStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "staff")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Staff extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "user_id")
    private User userAccount;

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel workplace;

    private String jobPosition;

    @Enumerated(EnumType.STRING)
    private ShiftStatus shiftStatus;
}
