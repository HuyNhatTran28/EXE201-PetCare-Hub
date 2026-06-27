package com.petcare_hub.dto.response;

import com.petcare_hub.enums.HotelStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class HotelResponse {

    private UUID id;
    private UUID partnerId;
    private String partnerName;
    private String name;
    private String address;
    private Double locationLat;
    private Double locationLong;
    private String googleMapsUrl;
    private String description;
    private List<String> amenities;
    private String checkInTime;
    private String checkOutTime;
    private HotelStatus status;
    private String rejectionReason;
    private Double averageRating;
    private Integer totalReviews;
    private BigDecimal minPrice;
    private LocalDateTime createdAt;
    private List<String> allowedPetTypes;
    private List<String> imageUrls;

}
