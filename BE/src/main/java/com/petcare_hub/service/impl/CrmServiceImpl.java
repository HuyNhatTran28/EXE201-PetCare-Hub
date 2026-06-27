package com.petcare_hub.service.impl;

import com.petcare_hub.dto.response.CrmPetResponse;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.entity.Booking;
import com.petcare_hub.entity.Pet;
import com.petcare_hub.entity.User;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.repository.PetRepository;
import com.petcare_hub.repository.ReviewRepository;
import com.petcare_hub.service.CrmService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CrmServiceImpl implements CrmService {

    private final PetRepository petRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CrmPetResponse> getPetsByPartner(UUID partnerId) {
        List<Pet> pets = petRepository.findPetsByPartnerId(partnerId);
        return pets.stream()
                .map(this::toCrmPetResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByPetAndPartner(UUID petId, UUID partnerId) {
        List<Booking> bookings = bookingRepository.findBookingsByPetIdAndPartnerId(petId, partnerId);
        return bookings.stream()
                .map(this::toBookingResponse)
                .toList();
    }

    private CrmPetResponse toCrmPetResponse(Pet p) {
        User owner = p.getOwner();
        String ownerName = owner != null ? owner.getFullName() : "Khách vãng lai";
        String ownerEmail = owner != null ? maskEmail(owner.getEmail()) : "";
        String ownerPhone = owner != null ? maskPhone(owner.getPhone()) : "";
        UUID ownerId = owner != null ? owner.getId() : null;

        return CrmPetResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .species(p.getSpecies())
                .breed(p.getBreed())
                .weightKg(p.getWeightKg())
                .ageYears(p.getAgeYears())
                .isVaccinated(p.getIsVaccinated())
                .specialNotes(p.getSpecialNotes())
                .avatarUrl(p.getAvatarUrl())
                .foodType(p.getFoodType())
                .feedingSchedule(p.getFeedingSchedule())
                .personalityTags(p.getPersonalityTags())
                .isIndoorOnly(p.getIsIndoorOnly())
                .hasSpecialDiet(p.getHasSpecialDiet())
                .microchipId(p.getMicrochipId())
                .ownerId(ownerId)
                .ownerName(ownerName)
                .ownerEmail(ownerEmail)
                .ownerPhone(ownerPhone)
                .build();
    }

    private BookingResponse toBookingResponse(Booking b) {
        long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());

        List<BookingResponse.PetInfo> petInfos = b.getPets().stream()
                .map(p -> BookingResponse.PetInfo.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .species(p.getSpecies())
                        .build())
                .toList();

        boolean isReviewed = reviewRepository.existsByBookingId(b.getId());

        return BookingResponse.builder()
                .id(b.getId())
                .invoiceNumber(b.getInvoiceNumber())
                .ownerId(b.getOwner().getId())
                .ownerName(b.getOwner().getFullName())
                .hotelId(b.getHotel().getId())
                .hotelName(b.getHotel().getName())
                .hotelAddress(b.getHotel().getAddress())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .hotelCheckInTime(b.getHotel().getCheckInTime())
                .hotelCheckOutTime(b.getHotel().getCheckOutTime())
                .pets(petInfos)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .totalNights((int) nights)
                .totalAmount(b.getTotalAmount())
                .commissionFee(b.getCommissionFee())
                .convenienceFee(b.getConvenienceFee())
                .vatAmount(b.getVatAmount())
                .voucherDiscountAmount(b.getVoucherDiscountAmount())
                .loyaltyPointsUsed(b.getLoyaltyPointsUsed())
                .status(b.getStatus())
                .paymentMethod(b.getPaymentMethod())
                .createdAt(b.getCreatedAt())
                .isReviewed(isReviewed)
                .build();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf("@");
        if (atIndex <= 1) {
            return "*@" + email.substring(atIndex + 1);
        }
        String personal = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        return personal.charAt(0) + "*****" + domain;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isEmpty()) return "";
        String trimmed = phone.trim();
        if (trimmed.length() >= 8) {
            return trimmed.substring(0, 3) + "******" + trimmed.substring(trimmed.length() - 2);
        } else if (trimmed.length() >= 4) {
            return trimmed.substring(0, 1) + "***" + trimmed.substring(trimmed.length() - 1);
        }
        return "***";
    }
}
