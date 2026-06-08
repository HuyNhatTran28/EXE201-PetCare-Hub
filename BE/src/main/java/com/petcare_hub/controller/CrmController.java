package com.petcare_hub.controller;

import com.petcare_hub.dto.response.CrmPetResponse;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.service.CrmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/partner/crm")
@RequiredArgsConstructor
@Tag(name = "CRM", description = "Quản lý khách hàng và hồ sơ thú cưng của đối tác")
public class CrmController {

    private final CrmService crmService;

    @Operation(summary = "Lấy danh sách thú cưng của các chủ nuôi đã đặt dịch vụ tại cơ sở")
    @GetMapping("/pets")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<List<CrmPetResponse>> getPets(Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(crmService.getPetsByPartner(partnerId));
    }

    @Operation(summary = "Lấy lịch sử đặt phòng của một bé thú cưng cụ thể")
    @GetMapping("/pets/{petId}/bookings")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<List<BookingResponse>> getPetBookings(
            @PathVariable UUID petId,
            Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(crmService.getBookingsByPetAndPartner(petId, partnerId));
    }
}
