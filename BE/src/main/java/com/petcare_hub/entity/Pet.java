package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "pets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Pet extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    private String name;
    private String species;
    private String breed;
    private Double weightKg;
    private Integer ageYears;
    private Boolean isVaccinated;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> vaccineBookUrls;

    private String specialNotes;
    private String avatarUrl;
    private String foodType;
    private String feedingSchedule;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> personalityTags;

    private Boolean isIndoorOnly;
    private Boolean hasSpecialDiet;
    private String microchipId;
}
