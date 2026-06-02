package com.petcare_hub.repository;

import com.petcare_hub.entity.Booking;
import com.petcare_hub.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    // Owner xem booking của mình
    Page<Booking> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId, Pageable pageable);

    // Partner xem booking của KS
    Page<Booking> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable pageable);

    // Đếm booking overlap — dùng để check availability
    @Query("""
        SELECT COUNT(b) FROM Booking b
        WHERE b.roomType.id = :roomTypeId
          AND b.status IN ('CONFIRMED', 'CHECKED_IN')
          AND b.checkInDate  < :checkOut
          AND b.checkOutDate > :checkIn
    """)
    long countOverlappingBookings(
        @Param("roomTypeId") UUID roomTypeId,
        @Param("checkIn")    LocalDate checkIn,
        @Param("checkOut")   LocalDate checkOut
    );

    // Tìm booking PENDING quá 30 phút — scheduler tự hủy
    @Query("""
        SELECT b FROM Booking b
        WHERE b.status = 'PENDING'
          AND b.createdAt < :expireTime
    """)
    List<Booking> findExpiredPendingBookings(
        @Param("expireTime") LocalDateTime expireTime
    );

    // Lấy booking đang CHECKED_IN — scheduler sinh task hàng ngày
    List<Booking> findByStatus(BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = :status")
    long countByStatus(@Param("status") BookingStatus status);

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.status = 'COMPLETED'")
    java.math.BigDecimal sumTotalAmount();
}
