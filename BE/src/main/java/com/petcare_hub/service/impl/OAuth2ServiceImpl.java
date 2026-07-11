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

import com.petcare_hub.service.AuthService;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2ServiceImpl implements OAuth2Service {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuthService authService;

    private static final long ACCESS_TOKEN_EXPIRES_SECONDS = 900;

    @Override
    @Transactional
    public AuthResponse processGoogleLogin(
            String email,
            String googleId,
            String fullName,
            String avatarUrl,
            String flow,
            String role
    ) {
        String emailClean = email.toLowerCase().trim();
        java.util.Optional<User> userOpt = userRepository.findByEmail(emailClean);

        User user;
        if ("login".equals(flow)) {
            // LOGIN FLOW:
            // Rà db hệ thống chặn lại nếu tài khoản chưa đăng ký
            if (userOpt.isEmpty()) {
                throw new com.petcare_hub.exception.AppException(
                        "Tài khoản này chưa được đăng ký, vui lòng qua trang đăng ký để đăng ký",
                        org.springframework.http.HttpStatus.NOT_FOUND
                );
            }
            user = userOpt.get();
            // Gắn googleId nếu chưa có
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                if (user.getAvatarUrl() == null) {
                    user.setAvatarUrl(avatarUrl);
                }
                user = userRepository.save(user);
            }
            if (!user.getIsVerified()) {
                // Tài khoản đã có nhưng chưa xác thực OTP, gửi lại OTP để kích hoạt
                authService.createAndSendRegisterOtp(user.getEmail(), user.getFullName());
            }
        } else {
            // REGISTER FLOW:
            // Bấm đăng ký với mail đã đăng ký thì báo lỗi
            if (userOpt.isPresent()) {
                throw new com.petcare_hub.exception.AppException(
                        "Email này đã được sử dụng. Vui lòng đăng nhập.",
                        org.springframework.http.HttpStatus.CONFLICT
                );
            }

            // Xác định role đăng ký (mặc định OWNER)
            Role userRole = Role.OWNER;
            try {
                if (role != null) {
                    userRole = Role.valueOf(role.toUpperCase().trim());
                }
            } catch (Exception e) {
                log.warn("Invalid role passed to google login: {}. Fallback to OWNER", role);
            }

            // Hoàn toàn mới -> tạo user ở trạng thái chưa xác thực (isVerified = false)
            User newUser = User.builder()
                    .email(emailClean)
                    .googleId(googleId)
                    .fullName(fullName)
                    .avatarUrl(avatarUrl)
                    .role(userRole)
                    .isVerified(false) // Bắt buộc OTP đầu tiên
                    .build();
            user = userRepository.save(newUser);
            log.info("Đăng ký user mới từ Google (chưa xác thực): {}", emailClean);

            // Gửi OTP đăng ký
            authService.createAndSendRegisterOtp(user.getEmail(), user.getFullName());
        }

        // Tạo token
        String accessToken = null;
        String refreshToken = null;
        if (user.getIsVerified()) {
            accessToken = jwtUtils.generateAccessToken(
                    user.getId(), user.getEmail(), user.getRole().name());
            refreshToken = jwtUtils.generateRefreshToken(user.getId());
        }

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
                        .isVerified(user.getIsVerified())
                        .build())
                .build();
    }
}