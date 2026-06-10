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

import java.math.BigDecimal;
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

    // Thêm vào HotelRepository query filter tổng hợp
    @Query("""
        SELECT DISTINCT h FROM Hotel h
        LEFT JOIN h.roomTypes rt
        WHERE h.status = 'ACTIVE'
        AND (:minPrice IS NULL OR rt.pricePerNight >= :minPrice)
        AND (:maxPrice IS NULL OR rt.pricePerNight <= :maxPrice)
        AND (6371 * acos(
            cos(radians(:lat)) * cos(radians(h.locationLat)) *
            cos(radians(h.locationLong) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(h.locationLat))
        )) <= :radiusKm
        ORDER BY h.averageRating DESC
    """)
    List<Hotel> findHotelsWithFilter(
        @Param("lat") Double lat,
        @Param("lng") Double lng,
        @Param("radiusKm") Double radiusKm,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice
    );

    @Query(value = "SELECT * FROM hotels h " +
                   "WHERE h.status = 'ACTIVE' " +
                   "AND ST_Contains(" +
                   "  ST_Buffer(ST_GeomFromText(:routeLineString, 4326)::geography, :radiusInMeters)::geometry, " +
                   "  ST_SetSRID(ST_Point(h.location_long, h.location_lat), 4326)" +
                   ")", nativeQuery = true)
    List<Hotel> findHotelsAlongRoute(@Param("routeLineString") String routeLineString, 
                                     @Param("radiusInMeters") Double radiusInMeters);

    long countByStatus(HotelStatus status);
}
