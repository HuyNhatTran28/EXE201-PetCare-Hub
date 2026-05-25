package com.petcare_hub.service;

import com.petcare_hub.dto.response.AuthResponse;

public interface OtpService {

    void sendOtp(String phone);

    AuthResponse verifyOtp(String phone, String otpCode);
}