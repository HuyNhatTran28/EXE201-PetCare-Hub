package com.petcare_hub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SendOtpRequest {

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
            regexp = "^0[3-9][0-9]{8}$",
            message = "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số (VD: 0346523181)"
    )
    private String phone;
}