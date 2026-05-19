package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.LoginRequest;
import com.petcare_hub.dto.request.RefreshTokenRequest;
import com.petcare_hub.dto.request.RegisterRequest;
import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.dto.response.UserResponse;
import com.petcare_hub.entity.User;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.AuthService;
import com.petcare_hub.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    private static final long ACCESS_TOKEN_EXPIRES_SECONDS = 900;


    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(
                    "Email '" + request.getEmail() + "' đã được sử dụng",
                    HttpStatus.CONFLICT
            );
        }

        if (request.getPhone() != null
                && userRepository.existsByPhone(request.getPhone())) {
            throw new AppException(
                    "Số điện thoại đã được sử dụng",
                    HttpStatus.CONFLICT
            );
        }

        User newUser = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone())
                .role(request.getRole())
                .build();

        User savedUser = userRepository.save(newUser);
        log.info("User mới đăng ký: {} ({})", savedUser.getEmail(), savedUser.getRole());

        return buildAuthResponse(savedUser);
    }


    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail().toLowerCase().trim())
                .filter(u -> passwordEncoder.matches(
                        request.getPassword(), u.getPasswordHash()))
                .orElseThrow(() -> new AppException(
                        "Email hoặc mật khẩu không đúng",
                        HttpStatus.UNAUTHORIZED
                ));

        if (!user.getIsActive()) {
            throw new AppException(
                    "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.",
                    HttpStatus.FORBIDDEN
            );
        }

        log.info("User đăng nhập: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtUtils.isTokenValid(refreshToken)
                || !jwtUtils.isRefreshToken(refreshToken)) {
            throw new AppException(
                    "Refresh token không hợp lệ hoặc đã hết hạn",
                    HttpStatus.UNAUTHORIZED
            );
        }

        User user = userRepository
                .findById(jwtUtils.extractUserId(refreshToken))
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy người dùng",
                        HttpStatus.NOT_FOUND
                ));

        if (!user.getIsActive()) {
            throw new AppException("Tài khoản đã bị khóa", HttpStatus.FORBIDDEN);
        }

        String newAccessToken = jwtUtils.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name()
        );

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .expiresIn(ACCESS_TOKEN_EXPIRES_SECONDS)
                .user(buildUserInfo(user))
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public UserResponse getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy người dùng",
                        HttpStatus.NOT_FOUND
                ));

        return toUserResponse(user);
    }


    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtUtils.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(ACCESS_TOKEN_EXPIRES_SECONDS)
                .user(buildUserInfo(user))
                .build();
    }

    private AuthResponse.UserInfo buildUserInfo(User user) {
        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .notificationOptedIn(user.getNotificationOptedIn())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}