package com.petcare_hub.dto.response;

import com.petcare_hub.enums.ShiftStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class StaffResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String email;
    private String phone;
    private String jobPosition;
    private ShiftStatus shiftStatus;
    private UUID workplaceId;
    private String workplaceName;
}
