package com.petcare_hub.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mã xác thực không được để trống")
    private String otpCode;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    private String newPassword;
}
