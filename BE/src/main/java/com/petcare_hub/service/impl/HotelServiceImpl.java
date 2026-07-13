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
import com.petcare_hub.service.AsyncEmailService;
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
    private final AsyncEmailService asyncEmailService;
    private final com.petcare_hub.repository.HotelReportRepository hotelReportRepository;

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
    public HotelResponse getHotelById(UUID hotelId, UUID requesterId, boolean requesterIsAdmin) {
        Hotel hotel = findHotelById(hotelId);

        if (hotel.getStatus() != HotelStatus.ACTIVE) {
            boolean isOwner = requesterId != null && hotel.getPartner().getId().equals(requesterId);
            if (!requesterIsAdmin && !isOwner) {
                throw new AppException("Cơ sở không khả dụng", HttpStatus.NOT_FOUND);
            }
        }

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

    // ── Admin duyệt / từ chối KS ──────────────────────────────

    @Override
    @Transactional
    public HotelResponse updateHotelStatus(UUID hotelId, HotelStatus status) {
        Hotel hotel = findHotelById(hotelId);
        hotel.setStatus(status);
        if (status == HotelStatus.SUSPENDED) {
            hotel.setRejectionReason("Bị đình chỉ hoạt động do vi phạm quy định hệ thống.");
        }
        
        Hotel saved = hotelRepository.save(hotel);
        log.info("KS {} chuyển sang status: {}", hotelId, status);

        // Gửi email thông báo cho đối tác khi trạng thái khách sạn thay đổi
        if (saved.getPartner() != null && saved.getPartner().getEmail() != null) {
            try {
                if (status == HotelStatus.SUSPENDED) {
                    // Lấy tất cả báo cáo của khách sạn để liệt kê chi tiết trong email
                    List<com.petcare_hub.entity.HotelReport> approvedReports = hotelReportRepository.findAll().stream()
                            .filter(r -> r.getHotel().getId().equals(saved.getId()) && r.getStatus() == com.petcare_hub.enums.ReportStatus.APPROVED)
                            .collect(java.util.stream.Collectors.toList());
                    
                    StringBuilder reportsHtml = new StringBuilder();
                    reportsHtml.append("<div style=\"background: #fff5f5; border: 1px solid #feb2b2; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: left;\">");
                    reportsHtml.append("<h4 style=\"margin: 0 0 12px 0; color: #c53030; font-size: 15px; font-weight: 800; border-bottom: 1px solid #fed7d7; padding-bottom: 6px;\">Danh sách phản ánh vi phạm đã xác thực:</h4>");
                    reportsHtml.append("<ul style=\"padding-left: 20px; margin: 0; font-size: 13px; color: #4a5568;\">");
                    
                    java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
                    if (approvedReports.isEmpty()) {
                        reportsHtml.append("<li style=\"margin-bottom: 12px;\">Khách sạn bị tạm ngưng hoạt động do vi phạm quy định dịch vụ chung của hệ thống.</li>");
                    } else {
                        for (com.petcare_hub.entity.HotelReport r : approvedReports) {
                            String timeStr = "N/A";
                            if (r.getCreatedAt() != null) {
                                timeStr = r.getCreatedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(dtf);
                            }
                            reportsHtml.append("<li style=\"margin-bottom: 12px;\">")
                                       .append("<strong>Thời gian:</strong> ").append(timeStr).append("<br/>")
                                       .append("<strong>Nội dung phản ánh:</strong> ").append(r.getReason())
                                       .append("</li>");
                        }
                    }
                    reportsHtml.append("</ul>");
                    reportsHtml.append("</div>");

                    asyncEmailService.sendSuspendHotelEmailAsync(
                            saved.getPartner().getEmail(),
                            saved.getPartner().getFullName(),
                            saved.getName(),
                            reportsHtml.toString(),
                            true // isSuspended = true
                    );
                } else if (status == HotelStatus.ACTIVE) {
                    asyncEmailService.sendSuspendHotelEmailAsync(
                            saved.getPartner().getEmail(),
                            saved.getPartner().getFullName(),
                            saved.getName(),
                            null,
                            false // isSuspended = false
                    );
                }
            } catch (Exception e) {
                log.error("Lỗi gửi mail thông báo đổi trạng thái khách sạn: {}", e.getMessage());
            }
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public HotelResponse approveHotel(UUID hotelId) {
        Hotel hotel = findHotelById(hotelId);
        hotel.setStatus(HotelStatus.ACTIVE);
        hotel.setRejectionReason(null);
        log.info("Admin đã duyệt khách sạn {}", hotelId);
        
        Hotel saved = hotelRepository.save(hotel);

        // Gửi email thông báo kích hoạt lại khách sạn cho đối tác
        if (saved.getPartner() != null && saved.getPartner().getEmail() != null) {
            try {
                asyncEmailService.sendSuspendHotelEmailAsync(
                        saved.getPartner().getEmail(),
                        saved.getPartner().getFullName(),
                        saved.getName(),
                        null,
                        false // isSuspended = false (reactivated)
                );
            } catch (Exception e) {
                log.error("Lỗi gửi mail thông báo kích hoạt lại khách sạn: {}", e.getMessage());
            }
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public HotelResponse rejectHotel(UUID hotelId, String reason) {
        Hotel hotel = findHotelById(hotelId);
        hotel.setStatus(HotelStatus.REJECTED);
        hotel.setRejectionReason(reason);
        log.info("Admin đã từ chối khách sạn {} — lý do: {}", hotelId, reason);
        return toResponse(hotelRepository.save(hotel));
    }
    @Override
    @Transactional
    public HotelResponse resubmitHotel(UUID hotelId, UUID partnerId) {
        Hotel hotel = findHotelById(hotelId);
        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền chỉnh sửa khách sạn này", HttpStatus.FORBIDDEN);
        }
        if (hotel.getStatus() != HotelStatus.REJECTED && hotel.getStatus() != HotelStatus.SUSPENDED) {
            throw new AppException("Chỉ có thể gửi duyệt lại khi khách sạn đang ở trạng thái bị từ chối hoặc bị đình chỉ", HttpStatus.BAD_REQUEST);
        }
        hotel.setStatus(HotelStatus.PENDING);
        hotel.setRejectionReason(null);
        log.info("Partner {} đã gửi duyệt lại khách sạn {}", partnerId, hotelId);
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

        // Nếu bị từ chối và partner chỉnh sửa lại → tự động gửi duyệt lại
        if (hotel.getStatus() == HotelStatus.REJECTED) {
            hotel.setStatus(HotelStatus.PENDING);
            hotel.setRejectionReason(null);
            log.info("KS {} bị từ chối → partner chỉnh sửa → tự động gửi duyệt lại", hotelId);
        }

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
        } else if (hotel.getStatus() == HotelStatus.REJECTED) {
            throw new AppException(
                    "Khách sạn đang bị từ chối. Vui lòng chỉnh sửa thông tin và gửi duyệt lại",
                    HttpStatus.BAD_REQUEST
            );
        } else if (hotel.getStatus() == HotelStatus.SUSPENDED) {
            throw new AppException(
                    "Khách sạn đang bị đình chỉ hoạt động. Vui lòng gửi yêu cầu duyệt lại cho Admin.",
                    HttpStatus.BAD_REQUEST
            );
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

    @Override
    @Transactional(readOnly = true)
    public List<HotelResponse> findHotelsAlongRoute(String routeLineString, Double radiusInMeters) {
        log.info("Searching hotels along route with radius: {} meters", radiusInMeters);
        if (routeLineString == null || routeLineString.trim().isEmpty()) {
            return List.of();
        }
        return hotelRepository.findHotelsAlongRoute(routeLineString, radiusInMeters)
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
                    com.fasterxml.jackson.databind.JsonNode frontNode = node.get("frontUrl");
                    if (frontNode.isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode n : frontNode) {
                            String f = n.asText();
                            if (f != null && !f.trim().isEmpty() && !imageUrls.contains(f)) {
                                imageUrls.add(f);
                            }
                        }
                    } else {
                        String front = frontNode.asText();
                        if (front != null && !front.isEmpty() && !imageUrls.contains(front)) {
                            imageUrls.add(front);
                        }
                    }
                }
                if (node.has("roomsUrl")) {
                    com.fasterxml.jackson.databind.JsonNode roomsNode = node.get("roomsUrl");
                    if (roomsNode.isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode n : roomsNode) {
                            String r = n.asText();
                            if (r != null && !r.trim().isEmpty() && !imageUrls.contains(r)) {
                                imageUrls.add(r);
                            }
                        }
                    } else {
                        String rooms = roomsNode.asText();
                        if (rooms != null && !rooms.isEmpty() && !imageUrls.contains(rooms)) {
                            imageUrls.add(rooms);
                        }
                    }
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
                .rejectionReason(hotel.getRejectionReason())
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
        String expandedUrl = url.trim();
        if (expandedUrl.contains("maps.app.goo.gl") || expandedUrl.contains("goo.gl/maps")) {
            expandedUrl = expandUrl(expandedUrl);
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
