package com.petcare_hub.service;

import com.petcare_hub.dto.request.EquipmentRequest;
import com.petcare_hub.dto.response.EquipmentResponse;

import java.util.List;
import java.util.UUID;

public interface EquipmentService {
    List<EquipmentResponse> getEquipmentByHotel(UUID hotelId, UUID partnerId);
    EquipmentResponse addEquipment(UUID hotelId, UUID partnerId, EquipmentRequest request);
    EquipmentResponse updateEquipment(UUID equipmentId, UUID partnerId, EquipmentRequest request);
    void deleteEquipment(UUID equipmentId, UUID partnerId);
}
