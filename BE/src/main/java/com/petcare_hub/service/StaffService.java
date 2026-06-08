package com.petcare_hub.service;

import com.petcare_hub.dto.request.StaffRequest;
import com.petcare_hub.dto.response.StaffResponse;

import java.util.List;
import java.util.UUID;

public interface StaffService {
    List<StaffResponse> getStaffByHotel(UUID hotelId, UUID partnerId);
    StaffResponse addStaffToHotel(UUID hotelId, UUID partnerId, StaffRequest request);
    StaffResponse updateStaff(UUID staffId, UUID partnerId, StaffRequest request);
    void removeStaff(UUID staffId, UUID partnerId);
}
