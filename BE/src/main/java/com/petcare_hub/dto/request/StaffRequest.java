package com.petcare_hub.dto.request;

import com.petcare_hub.enums.ShiftStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StaffRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Chức vụ không được để trống")
    private String jobPosition;

    private ShiftStatus shiftStatus;
}
