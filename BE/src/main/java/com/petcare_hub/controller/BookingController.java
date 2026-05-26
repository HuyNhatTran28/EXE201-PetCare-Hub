package com.petcare_hub.controller;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking", description = "Quản lý đặt phòng")
public class BookingController {

    private final BookingService bookingService;

    // POST /api/bookings — Owner tạo booking
    @Operation(summary = "Owner tạo đặt phòng mới")
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request,
            Authentication auth) {

        UUID ownerId = (UUID) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(bookingService.createBooking(ownerId, request));
    }

    // GET /api/bookings/{id} — Xem chi tiết booking
    @Operation(summary = "Xem chi tiết booking")
    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBooking(
            @PathVariable UUID id,
            Authentication auth) {

        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(bookingService.getBookingById(id, userId));
    }

    // GET /api/bookings/my — Owner xem booking của mình
    @Operation(summary = "Owner xem lịch sử đặt phòng")
    @GetMapping("/my")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Page<BookingResponse>> getMyBookings(
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {

        UUID ownerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                bookingService.getMyBookings(ownerId, pageable));
    }

    // GET /api/bookings/hotel/{hotelId} — Partner xem booking KS
    @Operation(summary = "Partner xem booking của khách sạn")
    @GetMapping("/hotel/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Page<BookingResponse>> getHotelBookings(
            @PathVariable UUID hotelId,
            Authentication auth,
            @PageableDefault(size = 10) Pageable pageable) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                bookingService.getHotelBookings(hotelId, partnerId, pageable));
    }

    // PATCH /api/bookings/{id}/cancel — Hủy booking
    @Operation(summary = "Hủy booking")
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable UUID id,
            Authentication auth) {

        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(bookingService.cancelBooking(id, userId));
    }

    // PATCH /api/bookings/{id}/checkin — Staff check-in
    @Operation(summary = "Staff thực hiện check-in")
    @PatchMapping("/{id}/checkin")
    @PreAuthorize("hasAnyRole('STAFF', 'PARTNER')")
    public ResponseEntity<BookingResponse> checkIn(
            @PathVariable UUID id,
            @RequestParam(required = false) String checkinPhotoUrl,
            @RequestParam(required = false) String ownerSignatureUrl,
            Authentication auth) {

        UUID staffId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                bookingService.checkIn(id, staffId, checkinPhotoUrl, ownerSignatureUrl));
    }

    // PATCH /api/bookings/{id}/checkout — Staff check-out
    @Operation(summary = "Staff thực hiện check-out")
    @PatchMapping("/{id}/checkout")
    @PreAuthorize("hasAnyRole('STAFF', 'PARTNER')")
    public ResponseEntity<BookingResponse> checkOut(
            @PathVariable UUID id,
            Authentication auth) {

        UUID staffId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(bookingService.checkOut(id, staffId));
    }

    // PATCH /api/bookings/{id}/confirm — Xác nhận sau thanh toán
    @Operation(summary = "Xác nhận booking sau khi thanh toán")
    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    public ResponseEntity<BookingResponse> confirmBooking(
            @PathVariable UUID id) {

        return ResponseEntity.ok(bookingService.confirmBooking(id));
    }
}
