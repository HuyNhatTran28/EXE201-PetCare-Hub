package com.petcare_hub.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CrmPetResponse {
    private UUID id;
    private String name;
    private String species;
    private String breed;
    private Double weightKg;
    private Integer ageYears;
    private Boolean isVaccinated;
    private String specialNotes;
    private String avatarUrl;
    private String foodType;
    private String feedingSchedule;
    private List<String> personalityTags;
    private Boolean isIndoorOnly;
    private Boolean hasSpecialDiet;
    private String microchipId;

    // Owner info
    private UUID ownerId;
    private String ownerName;
    private String ownerEmail;
    private String ownerPhone;
}
