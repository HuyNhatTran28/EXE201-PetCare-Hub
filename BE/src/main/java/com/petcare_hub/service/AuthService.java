package com.petcare_hub.service;

import com.petcare_hub.dto.request.ChangePasswordRequest;
import com.petcare_hub.dto.request.ForceChangePasswordRequest;
import com.petcare_hub.dto.request.LoginRequest;
import com.petcare_hub.dto.request.RefreshTokenRequest;
import com.petcare_hub.dto.request.RegisterRequest;
import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.dto.response.UserResponse;

import java.util.UUID;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    UserResponse getMe(UUID userId);

    void changePassword(UUID userId, ChangePasswordRequest request);

    void sendChangePasswordOtp(UUID userId);

    void sendForgotPasswordOtp(String email);

    void resetPassword(String email, String otpCode, String newPassword);

    void forceChangePassword(UUID userId, ForceChangePasswordRequest request);
}