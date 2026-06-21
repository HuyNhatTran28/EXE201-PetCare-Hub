package com.petcare_hub.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RoomTypeResponse {

    private UUID id;
    private UUID hotelId;
    private String hotelName;
    private String name;
    private String description;
    private BigDecimal pricePerNight;
    private BigDecimal dayRate;
    private Integer maxPets;
    private Integer totalRooms;
    private Integer availableRooms; // tính động
    private List<String> allowedPetTypes;
    private Boolean hasWebcam;
    private List<String> images;
    private Boolean isActive;
}
