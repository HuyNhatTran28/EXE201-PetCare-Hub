package com.petcare_hub.controller;

import com.petcare_hub.dto.response.HotelResponse;
import com.petcare_hub.service.HotelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Route Search", description = "Tìm kiếm dọc tuyến đường và gợi ý khách sạn")
public class RouteSearchController {

    private final HotelService hotelService;

    @PostMapping("/search-along-route")
    @Operation(summary = "Tìm kiếm khách sạn dọc tuyến đường và gợi ý theo phạm vi bán kính")
    public ResponseEntity<?> searchAlongRoute(
            @RequestParam("radius") Double radiusInMeters,
            @RequestBody Map<String, String> requestBody) {
        
        String routeLineString = requestBody.get("routeLineString");
        log.info("Request search along route with radius: {} meters", radiusInMeters);

        if (routeLineString == null || routeLineString.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Dữ liệu tuyến đường không hợp lệ."));
        }

        try {
            List<HotelResponse> hotels = hotelService.findHotelsAlongRoute(routeLineString, radiusInMeters);
            return ResponseEntity.ok(hotels);
        } catch (Exception e) {
            log.error("Lỗi khi tìm kiếm dọc tuyến đường: ", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi xử lý hình học: " + e.getMessage()));
        }
    }
}
