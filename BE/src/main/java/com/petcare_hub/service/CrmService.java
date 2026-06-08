package com.petcare_hub.service;

import com.petcare_hub.dto.response.CrmPetResponse;
import com.petcare_hub.dto.response.BookingResponse;

import java.util.List;
import java.util.UUID;

public interface CrmService {
    List<CrmPetResponse> getPetsByPartner(UUID partnerId);
    List<BookingResponse> getBookingsByPetAndPartner(UUID petId, UUID partnerId);
}
