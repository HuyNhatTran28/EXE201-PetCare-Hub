package com.petcare_hub.repository;

import com.petcare_hub.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable pageable);

    boolean existsByBookingId(UUID bookingId);

    @Query("SELECT AVG(r.starRating) FROM Review r WHERE r.hotel.id = :hotelId")
    Double getAverageRatingByHotelId(@Param("hotelId") UUID hotelId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.hotel.id = :hotelId")
    Long countByHotelId(@Param("hotelId") UUID hotelId);

    void deleteByHotelId(UUID hotelId);

    java.util.Optional<Review> findByBookingId(UUID bookingId);
}
