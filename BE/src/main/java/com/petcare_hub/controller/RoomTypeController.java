package com.petcare_hub.controller;

import com.petcare_hub.dto.request.RoomTypeRequest;
import com.petcare_hub.dto.response.RoomTypeResponse;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.service.RoomTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/room-types")
@RequiredArgsConstructor
@Tag(name = "RoomType", description = "Quản lý loại phòng")
public class RoomTypeController {

    private final RoomTypeService roomTypeService;

    // POST /api/room-types/{hotelId} — Partner thêm loại phòng
    @Operation(summary = "Partner thêm loại phòng vào KS")
    @PostMapping("/{hotelId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<RoomTypeResponse> createRoomType(
            @PathVariable UUID hotelId,
            @Valid @RequestBody RoomTypeRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(roomTypeService.createRoomType(hotelId, partnerId, request));
    }

    // GET /api/room-types/hotel/{hotelId} — Xem loại phòng của KS
    @Operation(summary = "Xem danh sách loại phòng của khách sạn")
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<RoomTypeResponse>> getRoomTypes(
            @PathVariable UUID hotelId,
            @RequestParam(required = false, defaultValue = "true") Boolean activeOnly) {

        return ResponseEntity.ok(roomTypeService.getRoomTypesByHotel(hotelId, activeOnly));
    }

    // GET /api/room-types/{id}/availability — Kiểm tra phòng trống
    @Operation(summary = "Kiểm tra số phòng còn trống theo ngày")
    @GetMapping("/{id}/availability")
    public ResponseEntity<Integer> checkAvailability(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false, defaultValue = "OVERNIGHT") com.petcare_hub.enums.BookingType bookingType) {

        if (checkIn.isBefore(LocalDate.now())) {
            throw new AppException(
                    "Ngày check-in không được ở quá khứ",
                    HttpStatus.BAD_REQUEST);
        }
        if (bookingType == com.petcare_hub.enums.BookingType.OVERNIGHT) {
            if (!checkOut.isAfter(checkIn)) {
                throw new AppException(
                        "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm",
                        HttpStatus.BAD_REQUEST);
            }
        } else { // DAYCARE
            if (checkOut.isBefore(checkIn)) {
                throw new AppException(
                        "Ngày check-out không được trước ngày check-in",
                        HttpStatus.BAD_REQUEST);
            }
        }

        return ResponseEntity.ok(
                roomTypeService.getAvailableRooms(id, checkIn, checkOut, bookingType));
    }

    // PUT /api/room-types/{id} — Partner cập nhật loại phòng
    @Operation(summary = "Partner cập nhật loại phòng")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<RoomTypeResponse> updateRoomType(
            @PathVariable UUID id,
            @Valid @RequestBody RoomTypeRequest request,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
                roomTypeService.updateRoomType(id, partnerId, request));
    }

    @Operation(summary = "Partner xóa loại phòng")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<Void> deleteRoomType(
            @PathVariable UUID id,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        roomTypeService.deleteRoomType(id, partnerId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Partner bật/tắt kích hoạt loại phòng")
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<RoomTypeResponse> toggleRoomType(
            @PathVariable UUID id,
            Authentication auth) {

        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(roomTypeService.toggleRoomType(id, partnerId));
    }

    @Operation(summary = "Lấy các loại phòng hoạt động có giá cao nhất")
    @GetMapping("/highest-price")
    public ResponseEntity<List<RoomTypeResponse>> getHighestPricedRoomTypes() {
        return ResponseEntity.ok(roomTypeService.getHighestPricedRoomTypes());
    }
}
