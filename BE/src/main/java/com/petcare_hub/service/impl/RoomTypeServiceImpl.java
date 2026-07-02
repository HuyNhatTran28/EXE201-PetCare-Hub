package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.RoomTypeRequest;
import com.petcare_hub.dto.response.RoomTypeResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.RoomType;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.RoomTypeRepository;
import com.petcare_hub.service.RoomTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {

    private final RoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final com.petcare_hub.repository.BookingRepository bookingRepository;

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(
            UUID hotelId, UUID partnerId, RoomTypeRequest request) {

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        // Kiểm tra đúng chủ KS
        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền thêm phòng cho KS này",
                    HttpStatus.FORBIDDEN);
        }

        RoomType roomType = RoomType.builder()
                .hotel(hotel)
                .name(request.getName())
                .description(request.getDescription())
                .pricePerNight(request.getPricePerNight())
                .dayRate(request.getDayRate())
                .maxPets(request.getMaxPets())
                .totalRooms(request.getTotalRooms())
                .allowedPetTypes(request.getAllowedPetTypes())
                .images(request.getImages())
                .build();

        return toResponse(roomTypeRepository.save(roomType), null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getRoomTypesByHotel(UUID hotelId, Boolean activeOnly, UUID callerId, String callerRole) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException("Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));
        
        // Nếu khách sạn không ACTIVE, chỉ cho phép ADMIN hoặc chính PARTNER chủ khách sạn xem
        if (hotel.getStatus() != HotelStatus.ACTIVE) {
            boolean isAllowed = callerId != null && 
                    ("ADMIN".equals(callerRole) || hotel.getPartner().getId().equals(callerId));
            if (!isAllowed) {
                throw new AppException("Cơ sở không khả dụng", HttpStatus.NOT_FOUND);
            }
        }

        List<RoomType> roomTypes = (activeOnly == null || activeOnly)
                ? roomTypeRepository.findByHotelIdAndIsActiveTrue(hotelId)
                : roomTypeRepository.findByHotelId(hotelId);
        return roomTypes.stream()
                .map(rt -> toResponse(rt, null))
                .toList();
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(
            UUID roomTypeId, UUID partnerId, RoomTypeRequest request) {

        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        if (!roomType.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền chỉnh sửa phòng này",
                    HttpStatus.FORBIDDEN);
        }

        roomType.setName(request.getName());
        roomType.setDescription(request.getDescription());
        roomType.setPricePerNight(request.getPricePerNight());
        roomType.setDayRate(request.getDayRate());
        roomType.setMaxPets(request.getMaxPets());
        roomType.setTotalRooms(request.getTotalRooms());
        roomType.setAllowedPetTypes(request.getAllowedPetTypes());
        roomType.setImages(request.getImages());

        return toResponse(roomTypeRepository.save(roomType), null);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getAvailableRooms(
            UUID roomTypeId, LocalDate checkIn, LocalDate checkOut, com.petcare_hub.enums.BookingType bookingType) {

        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        if (roomType.getHotel().getStatus() != HotelStatus.ACTIVE) {
            throw new AppException("Cơ sở không khả dụng", HttpStatus.NOT_FOUND);
        }

        LocalDate reqStart = checkIn;
        LocalDate reqEnd = (bookingType == com.petcare_hub.enums.BookingType.DAYCARE) ? checkOut : checkOut.minusDays(1);

        long overlapping = bookingRepository.countOverlappingBookings(roomTypeId, reqStart, reqEnd);
        return Math.max(0, roomType.getTotalRooms() - (int) overlapping);
    }

    @Override
    @Transactional
    public void deleteRoomType(UUID roomTypeId, UUID partnerId) {
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        if (!roomType.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException("Không có quyền", HttpStatus.FORBIDDEN);
        }

        roomType.setIsActive(false);
        roomTypeRepository.save(roomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse toggleRoomType(UUID roomTypeId, UUID partnerId) {
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        if (!roomType.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException("Không có quyền", HttpStatus.FORBIDDEN);
        }

        roomType.setIsActive(!roomType.getIsActive());
        return toResponse(roomTypeRepository.save(roomType), null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getHighestPricedRoomTypes() {
        List<RoomType> activeRoomTypes = roomTypeRepository.findActiveDogAndCatRoomTypes();
        return activeRoomTypes.stream()
                .map(rt -> toResponse(rt, null))
                .toList();
    }

    private RoomTypeResponse toResponse(RoomType rt, Integer availableRooms) {
        return RoomTypeResponse.builder()
                .id(rt.getId())
                .hotelId(rt.getHotel().getId())
                .hotelName(rt.getHotel().getName())
                .name(rt.getName())
                .description(rt.getDescription())
                .pricePerNight(rt.getPricePerNight())
                .dayRate(rt.getDayRate())
                .maxPets(rt.getMaxPets())
                .totalRooms(rt.getTotalRooms())
                .availableRooms(availableRooms)
                .allowedPetTypes(rt.getAllowedPetTypes())
                .hasWebcam(rt.getHasWebcam())
                .images(rt.getImages())
                .isActive(rt.getIsActive())
                .build();
    }
}
