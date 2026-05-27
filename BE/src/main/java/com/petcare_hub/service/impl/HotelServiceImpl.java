package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.HotelRequest;
import com.petcare_hub.dto.response.HotelResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.HotelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;

    // ── Tìm kiếm KS có bộ lọc tích hợp ─────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<HotelResponse> searchHotels(
            Double lat, Double lng, Double radiusKm,
            String petType, BigDecimal minPrice, BigDecimal maxPrice) {
        
        return hotelRepository
                .findHotelsWithFilter(lat, lng, radiusKm, petType, minPrice, maxPrice)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Tạo KS mới ────────────────────────────────────────────

    @Override
    @Transactional
    public HotelResponse createHotel(UUID partnerId, HotelRequest request) {

        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy người dùng",
                        HttpStatus.NOT_FOUND
                ));

        Hotel hotel = Hotel.builder()
                .partner(partner)
                .name(request.getName().trim())
                .address(request.getAddress())
                .locationLat(request.getLocationLat())
                .locationLong(request.getLocationLong())
                .description(request.getDescription())
                .amenities(request.getAmenities())
                .checkInTime(request.getCheckInTime())
                .checkOutTime(request.getCheckOutTime())
                .status(HotelStatus.PENDING)
                .build();

        Hotel saved = hotelRepository.save(hotel);
        log.info("KS mới tạo: {} bởi partner: {}", saved.getName(), partnerId);

        return toResponse(saved);
    }

    // ── Lấy chi tiết KS ───────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public HotelResponse getHotelById(UUID hotelId) {
        Hotel hotel = findHotelById(hotelId);
        return toResponse(hotel);
    }

    // ── Partner xem KS của mình ───────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<HotelResponse> getMyHotels(UUID partnerId, Pageable pageable) {
        return hotelRepository
                .findByPartnerId(partnerId, pageable)
                .map(this::toResponse);
    }

    // ── Admin xem tất cả KS ───────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<HotelResponse> getAllHotels(HotelStatus status, Pageable pageable) {
        if (status != null) {
            return hotelRepository.findByStatus(status, pageable).map(this::toResponse);
        }
        return hotelRepository.findAll(pageable).map(this::toResponse);
    }

    // ── Admin duyệt KS ────────────────────────────────────────

    @Override
    @Transactional
    public HotelResponse updateHotelStatus(UUID hotelId, HotelStatus status) {
        Hotel hotel = findHotelById(hotelId);
        hotel.setStatus(status);
        log.info("KS {} chuyển sang status: {}", hotelId, status);
        return toResponse(hotelRepository.save(hotel));
    }

    // ── Partner cập nhật KS ───────────────────────────────────

    @Override
    @Transactional
    public HotelResponse updateHotel(UUID hotelId, UUID partnerId, HotelRequest request) {
        Hotel hotel = findHotelById(hotelId);

        // Kiểm tra đúng chủ KS không
        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền chỉnh sửa khách sạn này",
                    HttpStatus.FORBIDDEN
            );
        }

        hotel.setName(request.getName().trim());
        hotel.setAddress(request.getAddress());
        hotel.setLocationLat(request.getLocationLat());
        hotel.setLocationLong(request.getLocationLong());
        hotel.setDescription(request.getDescription());
        hotel.setAmenities(request.getAmenities());
        hotel.setCheckInTime(request.getCheckInTime());
        hotel.setCheckOutTime(request.getCheckOutTime());

        return toResponse(hotelRepository.save(hotel));
    }

    // ── Tìm KS gần GPS ────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<HotelResponse> findNearbyHotels(
            Double lat, Double lng, Double radiusKm) {
        return hotelRepository
                .findNearbyHotels(lat, lng, radiusKm)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Private helpers ────────────────────────────────────────

    private Hotel findHotelById(UUID hotelId) {
        return hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy khách sạn",
                        HttpStatus.NOT_FOUND
                ));
    }

    private HotelResponse toResponse(Hotel hotel) {
        return HotelResponse.builder()
                .id(hotel.getId())
                .partnerId(hotel.getPartner().getId())
                .partnerName(hotel.getPartner().getFullName())
                .name(hotel.getName())
                .address(hotel.getAddress())
                .locationLat(hotel.getLocationLat())
                .locationLong(hotel.getLocationLong())
                .description(hotel.getDescription())
                .amenities(hotel.getAmenities())
                .checkInTime(hotel.getCheckInTime())
                .checkOutTime(hotel.getCheckOutTime())
                .status(hotel.getStatus())
                .averageRating(hotel.getAverageRating())
                .totalReviews(hotel.getTotalReviews())
                .createdAt(hotel.getCreatedAt())
                .build();
    }
}
