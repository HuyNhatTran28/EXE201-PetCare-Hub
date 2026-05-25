package com.petcare_hub.service.impl;

import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.Role;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.OAuth2Service;
import com.petcare_hub.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2ServiceImpl implements OAuth2Service {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    private static final long ACCESS_TOKEN_EXPIRES_SECONDS = 900;

    @Override
    @Transactional
    public AuthResponse processGoogleLogin(
            String email,
            String googleId,
            String fullName,
            String avatarUrl
    ) {
        // Tìm user theo googleId — nếu có rồi thì login luôn
        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() ->
                        // Chưa có → tìm theo email
                        userRepository.findByEmail(email)
                                .map(existingUser -> {
                                    // Email đã tồn tại → gắn googleId vào account cũ
                                    existingUser.setGoogleId(googleId);
                                    if (existingUser.getAvatarUrl() == null) {
                                        existingUser.setAvatarUrl(avatarUrl);
                                    }
                                    return userRepository.save(existingUser);
                                })
                                .orElseGet(() -> {
                                    // Hoàn toàn mới → tạo user mới
                                    User newUser = User.builder()
                                            .email(email)
                                            .googleId(googleId)
                                            .fullName(fullName)
                                            .avatarUrl(avatarUrl)
                                            .role(Role.OWNER) // mặc định OWNER
                                            .build();
                                    log.info("User mới từ Google: {}", email);
                                    return userRepository.save(newUser);
                                })
                );

        String accessToken  = jwtUtils.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(ACCESS_TOKEN_EXPIRES_SECONDS)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .phone(user.getPhone())
                        .avatarUrl(user.getAvatarUrl())
                        .role(user.getRole())
                        .build())
                .build();
    }
}