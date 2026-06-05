package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.ReviewRequest;
import com.petcare_hub.dto.response.ReviewResponse;
import com.petcare_hub.entity.Booking;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.Review;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.ReviewRepository;
import com.petcare_hub.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;

    @Override
    @Transactional
    public ReviewResponse createReview(UUID reviewerId, ReviewRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin đặt phòng", HttpStatus.NOT_FOUND));

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new AppException("Chỉ có thể đánh giá những đơn đặt phòng đã hoàn thành", HttpStatus.BAD_REQUEST);
        }

        if (!booking.getOwner().getId().equals(reviewerId)) {
            throw new AppException("Bạn không có quyền đánh giá đơn đặt phòng của người khác", HttpStatus.FORBIDDEN);
        }

        if (reviewRepository.existsByBookingId(request.getBookingId())) {
            throw new AppException("Đơn đặt phòng này đã được đánh giá trước đó", HttpStatus.BAD_REQUEST);
        }

        Hotel hotel = booking.getHotel();

        Review review = new Review();
        review.setBooking(booking);
        review.setReviewer(booking.getOwner());
        review.setHotel(hotel);
        review.setStarRating(request.getStarRating());
        review.setComment(request.getComment());
        review.setPhotoUrls(request.getPhotoUrls());

        review = reviewRepository.save(review);

        // Cập nhật averageRating & totalReviews của khách sạn
        Double avgRating = reviewRepository.getAverageRatingByHotelId(hotel.getId());
        Long totalReviews = reviewRepository.countByHotelId(hotel.getId());

        hotel.setAverageRating(avgRating != null ? avgRating : 0.0);
        hotel.setTotalReviews(totalReviews != null ? totalReviews.intValue() : 0);
        hotelRepository.save(hotel);

        return toResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getHotelReviews(UUID hotelId, Pageable pageable) {
        return reviewRepository.findByHotelIdOrderByCreatedAtDesc(hotelId, pageable)
                .map(this::toResponse);
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .reviewerName(review.getReviewer().getFullName())
                .reviewerAvatar(review.getReviewer().getAvatarUrl())
                .starRating(review.getStarRating())
                .comment(review.getComment())
                .photoUrls(review.getPhotoUrls())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
