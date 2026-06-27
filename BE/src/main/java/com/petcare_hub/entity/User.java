package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import com.petcare_hub.enums.Role;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email"),
                @Index(name = "idx_users_phone", columnList = "phone")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(columnDefinition = "text")
    private String address;

    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "notification_opted_in")
    @Builder.Default
    private Boolean notificationOptedIn = true;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "must_change_password")
    @Builder.Default
    private Boolean mustChangePassword = false;

    @Column(name = "zalo_id")
    private String zaloId;
}