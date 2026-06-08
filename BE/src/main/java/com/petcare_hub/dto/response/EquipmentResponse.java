package com.petcare_hub.dto.response;

import com.petcare_hub.enums.EquipmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class EquipmentResponse {
    private UUID id;
    private UUID hotelId;
    private String hotelName;
    private String name;
    private Integer quantity;
    private EquipmentStatus status;
    private LocalDate lastMaintenance;
}
