package com.petcare_hub.dto.response;

import com.petcare_hub.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private String avatarUrl;
    private Role role;
    private Boolean notificationOptedIn;
    private Boolean isActive;
    private LocalDateTime createdAt;
}