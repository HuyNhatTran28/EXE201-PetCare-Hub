package com.petcare_hub.dto.response;

import com.petcare_hub.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private long expiresIn;
    private UserInfo user;

    @Data
    @Builder
    public static class UserInfo {
        private UUID id;
        private String email;
        private String fullName;
        private String phone;
        private String avatarUrl;
        private Role role;
    }
}