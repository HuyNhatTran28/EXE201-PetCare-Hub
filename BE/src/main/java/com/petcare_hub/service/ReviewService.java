package com.petcare_hub.service;

import com.petcare_hub.dto.request.ReviewRequest;
import com.petcare_hub.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReviewService {
    ReviewResponse createReview(UUID reviewerId, ReviewRequest request);
    Page<ReviewResponse> getHotelReviews(UUID hotelId, Pageable pageable);
}
