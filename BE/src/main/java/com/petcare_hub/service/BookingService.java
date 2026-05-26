package com.petcare_hub.service;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BookingService {

    // Owner tạo booking
    BookingResponse createBooking(UUID ownerId, BookingRequest request);

    // Xem chi tiết booking
    BookingResponse getBookingById(UUID bookingId, UUID userId);

    // Owner xem booking của mình
    Page<BookingResponse> getMyBookings(UUID ownerId, Pageable pageable);

    // Partner xem booking của KS
    Page<BookingResponse> getHotelBookings(UUID hotelId, UUID partnerId, Pageable pageable);

    // Hủy booking
    BookingResponse cancelBooking(UUID bookingId, UUID userId);

    // Staff check-in
    BookingResponse checkIn(UUID bookingId, UUID staffId,
                            String checkinPhotoUrl, String ownerSignatureUrl);

    // Staff check-out
    BookingResponse checkOut(UUID bookingId, UUID staffId);

    // Xác nhận booking sau khi thanh toán thành công
    BookingResponse confirmBooking(UUID bookingId);
}
