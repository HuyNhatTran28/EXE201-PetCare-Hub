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
        
        List<Hotel> hotels;
        if (lat == null || lng == null) {
            hotels = hotelRepository.findByStatus(HotelStatus.ACTIVE, Pageable.unpaged()).getContent();
            if (minPrice != null || maxPrice != null) {
                hotels = hotels.stream()
                        .filter(h -> {
                            BigDecimal minP = h.getRoomTypes() != null ? h.getRoomTypes().stream()
                                    .filter(rt -> rt.getPricePerNight() != null)
                                    .map(com.petcare_hub.entity.RoomType::getPricePerNight)
                                    .min(BigDecimal::compareTo)
                                    .orElse(null) : null;
                            if (minP == null) return false;
                            if (minPrice != null && minP.compareTo(minPrice) < 0) return false;
                            if (maxPrice != null && minP.compareTo(maxPrice) > 0) return false;
                            return true;
                        })
                        .toList();
            }
        } else {
            hotels = hotelRepository.findHotelsWithFilter(lat, lng, radiusKm, minPrice, maxPrice);
        }

        return hotels.stream()
                .filter(h -> petType == null || (h.getRoomTypes() != null && h.getRoomTypes().stream()
                        .anyMatch(rt -> rt.getAllowedPetTypes() != null && rt.getAllowedPetTypes().contains(petType))))
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

        Double lat = request.getLocationLat();
        Double lng = request.getLocationLong();
        if ((lat == null || lng == null) && request.getGoogleMapsUrl() != null) {
            double[] parsed = resolveCoordsFromUrl(request.getGoogleMapsUrl());
            lat = parsed[0];
            lng = parsed[1];
        }
        if (lat == null) lat = 10.7769;
        if (lng == null) lng = 106.7009;

        Hotel hotel = Hotel.builder()
                .partner(partner)
                .name(request.getName().trim())
                .address(request.getAddress())
                .locationLat(lat)
                .locationLong(lng)
                .googleMapsUrl(request.getGoogleMapsUrl())
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

        Double lat = request.getLocationLat();
        Double lng = request.getLocationLong();
        if ((lat == null || lng == null) && request.getGoogleMapsUrl() != null) {
            double[] parsed = resolveCoordsFromUrl(request.getGoogleMapsUrl());
            lat = parsed[0];
            lng = parsed[1];
        }

        hotel.setName(request.getName().trim());
        hotel.setAddress(request.getAddress());
        if (lat != null) hotel.setLocationLat(lat);
        if (lng != null) hotel.setLocationLong(lng);
        hotel.setGoogleMapsUrl(request.getGoogleMapsUrl());
        hotel.setDescription(request.getDescription());
        hotel.setAmenities(request.getAmenities());
        hotel.setCheckInTime(request.getCheckInTime());
        hotel.setCheckOutTime(request.getCheckOutTime());

        return toResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional
    public HotelResponse toggleHotelStatus(UUID hotelId, UUID partnerId) {
        Hotel hotel = findHotelById(hotelId);

        // Kiểm tra đúng chủ KS không
        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền chỉnh sửa khách sạn này",
                    HttpStatus.FORBIDDEN
            );
        }

        // Thay đổi trạng thái
        if (hotel.getStatus() == HotelStatus.ACTIVE) {
            hotel.setStatus(HotelStatus.CLOSED);
            log.info("Partner {} đã tạm ngưng khách sạn {}", partnerId, hotelId);
        } else if (hotel.getStatus() == HotelStatus.CLOSED) {
            hotel.setStatus(HotelStatus.ACTIVE);
            log.info("Partner {} đã kích hoạt lại khách sạn {}", partnerId, hotelId);
        } else {
            throw new AppException(
                    "Khách sạn đang chờ duyệt, không thể thay đổi trạng thái hoạt động",
                    HttpStatus.BAD_REQUEST
            );
        }

        return toResponse(hotelRepository.save(hotel));
    }

    // ── Tìm KS gần GPS ────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<HotelResponse> findNearbyHotels(
            Double lat, Double lng, Double radiusKm) {
        if (lat == null || lng == null) {
            return hotelRepository.findByStatus(HotelStatus.ACTIVE, Pageable.unpaged())
                    .getContent()
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }
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
        BigDecimal minPrice = null;
        List<String> allowedPetTypes = List.of();

        if (hotel.getRoomTypes() != null) {
            minPrice = hotel.getRoomTypes().stream()
                    .filter(rt -> rt.getPricePerNight() != null)
                    .map(com.petcare_hub.entity.RoomType::getPricePerNight)
                    .min(BigDecimal::compareTo)
                    .orElse(null);

            allowedPetTypes = hotel.getRoomTypes().stream()
                    .filter(rt -> rt.getAllowedPetTypes() != null)
                    .flatMap(rt -> rt.getAllowedPetTypes().stream())
                    .distinct()
                    .toList();
        }

        List<String> imageUrls = new java.util.ArrayList<>();
        if (hotel.getDescription() != null && hotel.getDescription().trim().startsWith("{")) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(hotel.getDescription());
                if (node.has("logoUrl")) {
                    String logo = node.get("logoUrl").asText();
                    if (logo != null && !logo.isEmpty()) imageUrls.add(logo);
                }
                if (node.has("frontUrl")) {
                    String front = node.get("frontUrl").asText();
                    if (front != null && !front.isEmpty()) imageUrls.add(front);
                }
                if (node.has("roomsUrl")) {
                    String rooms = node.get("roomsUrl").asText();
                    if (rooms != null && !rooms.isEmpty()) imageUrls.add(rooms);
                }
                if (node.has("imageUrls")) {
                    com.fasterxml.jackson.databind.JsonNode urlsNode = node.get("imageUrls");
                    if (urlsNode.isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode urlNode : urlsNode) {
                            String url = urlNode.asText();
                            if (url != null && !url.trim().isEmpty() && !imageUrls.contains(url)) {
                                imageUrls.add(url);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore parse errors, keep empty
            }
        }

        return HotelResponse.builder()
                .id(hotel.getId())
                .partnerId(hotel.getPartner().getId())
                .partnerName(hotel.getPartner().getFullName())
                .name(hotel.getName())
                .address(hotel.getAddress())
                .locationLat(hotel.getLocationLat())
                .locationLong(hotel.getLocationLong())
                .googleMapsUrl(hotel.getGoogleMapsUrl())
                .description(hotel.getDescription())
                .amenities(hotel.getAmenities())
                .checkInTime(hotel.getCheckInTime())
                .checkOutTime(hotel.getCheckOutTime())
                .status(hotel.getStatus())
                .averageRating(hotel.getAverageRating())
                .totalReviews(hotel.getTotalReviews())
                .minPrice(minPrice)
                .allowedPetTypes(allowedPetTypes)
                .imageUrls(imageUrls)
                .createdAt(hotel.getCreatedAt())
                .build();
    }

    @Override
    public double[] resolveCoordsFromUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return new double[]{10.7769, 106.7009}; // default
        }
        String expandedUrl = url;
        if (url.contains("maps.app.goo.gl") || url.contains("goo.gl/maps")) {
            expandedUrl = expandUrl(url);
        }
        return parseCoordsFromUrl(expandedUrl);
    }

    private String expandUrl(String url) {
        String currentUrl = url;
        for (int i = 0; i < 5; i++) {
            try {
                java.net.HttpURLConnection con = (java.net.HttpURLConnection) new java.net.URL(currentUrl).openConnection();
                con.setInstanceFollowRedirects(false);
                con.setConnectTimeout(5000);
                con.setReadTimeout(5000);
                con.setRequestProperty("User-Agent", "Mozilla/5.0");
                con.connect();
                int responseCode = con.getResponseCode();
                if (responseCode >= 300 && responseCode < 400) {
                    String loc = con.getHeaderField("Location");
                    if (loc != null) {
                        currentUrl = loc;
                        con.disconnect();
                        continue;
                    }
                }
                con.disconnect();
                break;
            } catch (Exception e) {
                break;
            }
        }
        return currentUrl;
    }

    private double[] parseCoordsFromUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return new double[]{10.7769, 106.7009}; // default
        }
        try {
            // Pattern 1: @lat,lng
            if (url.contains("@")) {
                String sub = url.substring(url.indexOf("@") + 1);
                String[] parts = sub.split(",");
                if (parts.length >= 2) {
                    return new double[]{Double.parseDouble(parts[0]), Double.parseDouble(parts[1])};
                }
            }
            // Pattern 2: q=lat,lng
            if (url.contains("q=")) {
                String sub = url.substring(url.indexOf("q=") + 2);
                if (sub.contains("&")) {
                    sub = sub.substring(0, sub.indexOf("&"));
                }
                String[] parts = sub.split(",");
                if (parts.length >= 2) {
                    return new double[]{Double.parseDouble(parts[0]), Double.parseDouble(parts[1])};
                }
            }
        } catch (Exception e) {
            // ignore parsing errors
        }
        return new double[]{10.7769, 106.7009}; // default fallback
    }
}
