package com.petcare_hub.service;

import com.petcare_hub.dto.request.CreateStaffRequest;
import com.petcare_hub.dto.response.StaffResponse;

import java.util.List;
import java.util.UUID;

public interface StaffManagementService {

    StaffResponse createStaff(UUID partnerId, CreateStaffRequest request);

    List<StaffResponse> getStaffByHotel(UUID partnerId, UUID hotelId);

    StaffResponse toggleActive(UUID partnerId, UUID staffId);
}
