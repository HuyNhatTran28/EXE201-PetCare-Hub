package com.petcare_hub.controller;

import com.petcare_hub.dto.request.ReviewRequest;
import com.petcare_hub.dto.response.ReviewResponse;
import com.petcare_hub.service.ReviewService;
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
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Review", description = "Quản lý đánh giá khách sạn")
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Owner viết đánh giá mới cho đơn đặt phòng đã hoàn thành")
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ReviewResponse> createReview(
            @Valid @RequestBody ReviewRequest request,
            Authentication auth) {
        UUID reviewerId = (UUID) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(reviewService.createReview(reviewerId, request));
    }

    @Operation(summary = "Lấy danh sách đánh giá của khách sạn")
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<Page<ReviewResponse>> getHotelReviews(
            @PathVariable UUID hotelId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reviewService.getHotelReviews(hotelId, pageable));
    }
}
