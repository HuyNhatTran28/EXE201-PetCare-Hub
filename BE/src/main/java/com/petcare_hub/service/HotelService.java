package com.petcare_hub.service;

import com.petcare_hub.dto.request.HotelRequest;
import com.petcare_hub.dto.response.HotelResponse;
import com.petcare_hub.enums.HotelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface HotelService {

    // Partner tạo KS mới
    HotelResponse createHotel(UUID partnerId, HotelRequest request);

    // Lấy chi tiết 1 KS
    HotelResponse getHotelById(UUID hotelId);

    // Partner xem KS của mình
    Page<HotelResponse> getMyHotels(UUID partnerId, Pageable pageable);

    // Admin xem tất cả KS theo status
    Page<HotelResponse> getAllHotels(HotelStatus status, Pageable pageable);

    // Admin duyệt / từ chối KS
    HotelResponse updateHotelStatus(UUID hotelId, HotelStatus status);

    // Partner cập nhật thông tin KS
    HotelResponse updateHotel(UUID hotelId, UUID partnerId, HotelRequest request);

    // Partner tạm ngưng / mở lại khách sạn
    HotelResponse toggleHotelStatus(UUID hotelId, UUID partnerId);

    // Tìm KS gần vị trí GPS
    List<HotelResponse> findNearbyHotels(Double lat, Double lng, Double radiusKm);

    // Tìm kiếm KS có bộ lọc tích hợp
    List<HotelResponse> searchHotels(Double lat, Double lng, Double radiusKm, String petType, BigDecimal minPrice, BigDecimal maxPrice);
}
