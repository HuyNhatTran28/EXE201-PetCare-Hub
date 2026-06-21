package com.petcare_hub.service;

import com.petcare_hub.dto.request.RoomTypeRequest;
import com.petcare_hub.dto.response.RoomTypeResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RoomTypeService {

    RoomTypeResponse createRoomType(UUID hotelId, UUID partnerId, RoomTypeRequest request);

    List<RoomTypeResponse> getRoomTypesByHotel(UUID hotelId, Boolean activeOnly);

    RoomTypeResponse updateRoomType(UUID roomTypeId, UUID partnerId, RoomTypeRequest request);

    // Kiểm tra phòng còn trống theo ngày
    Integer getAvailableRooms(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut, com.petcare_hub.enums.BookingType bookingType);

    void deleteRoomType(UUID roomTypeId, UUID partnerId);

    RoomTypeResponse toggleRoomType(UUID roomTypeId, UUID partnerId);
}
