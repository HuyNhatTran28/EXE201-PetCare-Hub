package com.petcare_hub.repository;

import com.petcare_hub.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {

    // Lấy tất cả loại phòng của 1 KS
    List<RoomType> findByHotelIdAndIsActiveTrue(UUID hotelId);

    // Lấy tất cả loại phòng của 1 KS (kể cả inactive)
    List<RoomType> findByHotelId(UUID hotelId);

    // Lấy tất cả phòng active kèm hotel (JOIN FETCH để tránh LazyInit khi đọc hotel.id ngoài transaction)
    @Query("SELECT r FROM RoomType r JOIN FETCH r.hotel WHERE r.isActive = true")
    List<RoomType> findAllActiveWithHotel();

    // Lấy tất cả phòng active (của hotel ACTIVE) cho chó/mèo, sắp xếp theo giá giảm dần
    @Query(value = "SELECT r.* FROM room_types r " +
                   "JOIN hotels h ON r.hotel_id = h.id " +
                   "WHERE r.is_active = true " +
                   "AND h.status = 'ACTIVE' " +
                   "AND (r.allowed_pet_types @> CAST('[\"DOG\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"dog\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"CAT\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"cat\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"DOG_SMALL\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"dog_small\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"DOG_LARGE\"]' AS jsonb) " +
                   "     OR r.allowed_pet_types @> CAST('[\"dog_large\"]' AS jsonb)) " +
                   "ORDER BY r.price_per_night DESC",
           nativeQuery = true)
    List<RoomType> findActiveDogAndCatRoomTypes();


    // Kiểm tra số phòng còn trống theo ngày
    @Query("""
        SELECT rt.totalRooms - COUNT(b)
        FROM RoomType rt
        LEFT JOIN Booking b ON b.roomType.id = rt.id
            AND b.status IN ('CONFIRMED', 'CHECKED_IN')
            AND b.checkInDate  < :checkOut
            AND b.checkOutDate > :checkIn
        WHERE rt.id = :roomTypeId
        GROUP BY rt.totalRooms
    """)
    Long countAvailableRooms(
        @Param("roomTypeId") UUID roomTypeId,
        @Param("checkIn")    LocalDate checkIn,
        @Param("checkOut")   LocalDate checkOut
    );
}
