package com.petcare_hub.service;

import com.petcare_hub.dto.response.AuthResponse;

public interface OAuth2Service {

    // Xử lý sau khi Google callback về — nhận email + googleId
    AuthResponse processGoogleLogin(String email, String googleId, String fullName, String avatarUrl, String flow, String role);
}