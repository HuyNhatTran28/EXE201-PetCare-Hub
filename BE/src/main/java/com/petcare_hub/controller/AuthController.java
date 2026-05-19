package com.petcare_hub.controller;

import com.petcare_hub.dto.request.LoginRequest;
import com.petcare_hub.dto.request.RefreshTokenRequest;
import com.petcare_hub.dto.request.RegisterRequest;
import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.dto.response.UserResponse;
import com.petcare_hub.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Đăng ký, đăng nhập, refresh token")
public class AuthController {

    private final AuthService authService;


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
}