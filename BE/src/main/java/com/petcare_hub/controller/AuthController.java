package com.petcare_hub.controller;

import com.petcare_hub.dto.request.*;
import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.dto.response.UserResponse;
import com.petcare_hub.service.AuthService;
import com.petcare_hub.service.OtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Đăng ký, đăng nhập, refresh token")
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;


    @Operation(summary = "Đăng ký tài khoản mới")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }


    @Operation(summary = "Đăng nhập bằng email + password")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }


    @Operation(summary = "Lấy access token mới từ refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        return ResponseEntity.ok(authService.refreshToken(request));
    }


    @Operation(summary = "Lấy thông tin user hiện tại")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(authService.getMe(userId));
    }

    @Operation(summary = "Gửi OTP qua email (đăng nhập bằng SĐT)")
    @PostMapping("/otp/send")
    public ResponseEntity<Map<String, String>> sendOtp(
            @Valid @RequestBody SendOtpRequest request) {

        otpService.sendOtp(request.getPhone());
        return ResponseEntity.ok(Map.of(
                "message", "Mã OTP đã được gửi đến email của bạn"
        ));
    }

    @Operation(summary = "Xác thực OTP → đăng nhập")
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        return ResponseEntity.ok(
                otpService.verifyOtp(request.getPhone(), request.getOtpCode())
        );
    }


    @Operation(summary = "Yêu cầu gửi mã OTP đổi mật khẩu về Email")
    @PostMapping("/change-password/otp")
    public ResponseEntity<Map<String, String>> sendChangePasswordOtp(
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        authService.sendChangePasswordOtp(userId);
        return ResponseEntity.ok(Map.of(
                "message", "Mã xác thực đã được gửi về email của bạn"
        ));
    }

    @Operation(summary = "Đổi mật khẩu tài khoản")
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        authService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of(
                "message", "Đổi mật khẩu thành công"
        ));
    }

    @Operation(summary = "Yêu cầu gửi mã OTP quên mật khẩu về Email")
    @PostMapping("/forgot-password/otp")
    public ResponseEntity<Map<String, String>> sendForgotPasswordOtp(
            @RequestParam String email) {
        authService.sendForgotPasswordOtp(email);
        return ResponseEntity.ok(Map.of(
                "message", "Mã OTP khôi phục mật khẩu đã được gửi về email của bạn."
        ));
    }

    @Operation(summary = "Đặt lại mật khẩu mới bằng OTP")
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getEmail(), request.getOtpCode(), request.getNewPassword());
        return ResponseEntity.ok(Map.of(
                "message", "Đặt lại mật khẩu thành công."
        ));
    }
}