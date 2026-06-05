package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.RoomTypeRequest;
import com.petcare_hub.dto.response.RoomTypeResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.RoomType;
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
                .maxPets(request.getMaxPets())
                .totalRooms(request.getTotalRooms())
                .allowedPetTypes(request.getAllowedPetTypes())
                .images(request.getImages())
                .build();

        return toResponse(roomTypeRepository.save(roomType), null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getRoomTypesByHotel(UUID hotelId, Boolean activeOnly) {
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
        roomType.setMaxPets(request.getMaxPets());
        roomType.setTotalRooms(request.getTotalRooms());
        roomType.setAllowedPetTypes(request.getAllowedPetTypes());
        roomType.setImages(request.getImages());

        return toResponse(roomTypeRepository.save(roomType), null);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getAvailableRooms(
            UUID roomTypeId, LocalDate checkIn, LocalDate checkOut) {

        Long available = roomTypeRepository
                .countAvailableRooms(roomTypeId, checkIn, checkOut);
        return available != null ? available.intValue() : 0;
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

    private RoomTypeResponse toResponse(RoomType rt, Integer availableRooms) {
        return RoomTypeResponse.builder()
                .id(rt.getId())
                .hotelId(rt.getHotel().getId())
                .hotelName(rt.getHotel().getName())
                .name(rt.getName())
                .description(rt.getDescription())
                .pricePerNight(rt.getPricePerNight())
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
