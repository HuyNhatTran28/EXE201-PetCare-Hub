package com.petcare_hub.dto.response;

import com.petcare_hub.enums.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class ServiceResponse {

    private UUID id;
    private UUID hotelId;
    private String hotelName;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer durationMinutes;
    private ServiceType serviceType;
    private Boolean isEnabled;
}
