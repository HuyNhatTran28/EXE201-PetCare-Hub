package com.petcare_hub.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import com.petcare_hub.base.BaseEntity;
import org.hibernate.annotations.Type;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Review extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User reviewer;

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    private Integer starRating;
    private String comment;

    @Type(JsonType.class)
    @Column(name = "photo_urls", columnDefinition = "jsonb")
    private List<String> photoUrls;
}
