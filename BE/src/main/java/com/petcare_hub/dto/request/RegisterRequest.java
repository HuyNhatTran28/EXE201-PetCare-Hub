package com.petcare_hub.dto.request;

import com.petcare_hub.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @Pattern(
            regexp = "^0[3-9][0-9]{8}$",
            message = "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số "
    )
    private String phone;

    @NotNull(message = "Role không được để trống")
    private Role role;
}