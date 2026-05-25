package com.petcare_hub.repository;

import com.petcare_hub.entity.Hotel;
import com.petcare_hub.enums.HotelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HotelRepository extends
        JpaRepository<Hotel, UUID>,
        JpaSpecificationExecutor<Hotel> {

    // Lấy KS theo partner
    Page<Hotel> findByPartnerId(UUID partnerId, Pageable pageable);

    // Lấy KS theo status
    Page<Hotel> findByStatus(HotelStatus status, Pageable pageable);

    // Tìm KS gần vị trí GPS — dùng Haversine formula
    @Query("""
        SELECT h FROM Hotel h
        WHERE h.status = 'ACTIVE'
        AND (6371 * acos(
            cos(radians(:lat)) * cos(radians(h.locationLat)) *
            cos(radians(h.locationLong) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(h.locationLat))
        )) <= :radiusKm
        ORDER BY (6371 * acos(
            cos(radians(:lat)) * cos(radians(h.locationLat)) *
            cos(radians(h.locationLong) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(h.locationLat))
        )) ASC
    """)
    List<Hotel> findNearbyHotels(
        @Param("lat") Double lat,
        @Param("lng") Double lng,
        @Param("radiusKm") Double radiusKm
    );
}
