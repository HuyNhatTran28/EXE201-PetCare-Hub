package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "booking_pets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingPet extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "pet_id")
    private Pet pet;

    private String note;
}
