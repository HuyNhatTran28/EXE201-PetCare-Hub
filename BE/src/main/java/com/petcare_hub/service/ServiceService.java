package com.petcare_hub.service;

import com.petcare_hub.dto.request.ServiceRequest;
import com.petcare_hub.dto.response.ServiceResponse;

import java.util.List;
import java.util.UUID;

public interface ServiceService {

    ServiceResponse createService(UUID hotelId, UUID partnerId, ServiceRequest request);

    List<ServiceResponse> getServicesByHotel(UUID hotelId);

    ServiceResponse updateService(UUID serviceId, UUID partnerId, ServiceRequest request);

    // Bật/tắt dịch vụ
    ServiceResponse toggleService(UUID serviceId, UUID partnerId);
}
