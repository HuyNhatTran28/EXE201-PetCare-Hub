package com.petcare_hub.dto.response;

import com.petcare_hub.enums.ShiftStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String email;
    private String phone;
    private Boolean isActive;
    private String jobPosition;
    private ShiftStatus shiftStatus;
    private UUID workplaceId;
    private String workplaceName;
    private LocalDateTime createdAt;
}
