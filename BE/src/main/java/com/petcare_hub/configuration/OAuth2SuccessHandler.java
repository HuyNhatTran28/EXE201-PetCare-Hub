package com.petcare_hub.configuration;

import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.service.OAuth2Service;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.Cookie;
import com.petcare_hub.exception.AppException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuth2Service oAuth2Service;

    @Value("${frontend.base-url}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email     = oAuth2User.getAttribute("email");
        String googleId  = oAuth2User.getAttribute("sub");
        String fullName  = oAuth2User.getAttribute("name");
        String avatarUrl = oAuth2User.getAttribute("picture");

        log.info("Google login thành công: {}", email);

        // Đọc flow và role từ cookie
        String flow = "register";
        String role = "OWNER";
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("oauth2_flow".equals(cookie.getName())) {
                    flow = cookie.getValue();
                    cookie.setMaxAge(0);
                    cookie.setPath("/");
                    response.addCookie(cookie);
                } else if ("oauth2_role".equals(cookie.getName())) {
                    role = cookie.getValue();
                    cookie.setMaxAge(0);
                    cookie.setPath("/");
                    response.addCookie(cookie);
                }
            }
        }

        try {
            AuthResponse authResponse = oAuth2Service.processGoogleLogin(
                    email, googleId, fullName, avatarUrl, flow, role
            );

            String redirectUrl;
            if (authResponse.getUser() != null && Boolean.FALSE.equals(authResponse.getUser().getIsVerified())) {
                // Đăng ký thành công nhưng chưa xác thực OTP
                redirectUrl = frontendBaseUrl + "/register?email=" + URLEncoder.encode(email, StandardCharsets.UTF_8) + "&otp=true";
            } else {
                // Đăng nhập / liên kết thành công
                redirectUrl = frontendBaseUrl + "/oauth-callback"
                        + "?token=" + URLEncoder.encode(authResponse.getAccessToken(), StandardCharsets.UTF_8)
                        + "&refreshToken=" + URLEncoder.encode(authResponse.getRefreshToken(), StandardCharsets.UTF_8);
            }
            response.sendRedirect(redirectUrl);

        } catch (AppException e) {
            String redirectPage = "login".equals(flow) ? "/login" : "/register";
            String redirectUrl = frontendBaseUrl + redirectPage + "?error=" + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            log.error("Lỗi đăng nhập Google: ", e);
            String redirectPage = "login".equals(flow) ? "/login" : "/register";
            String redirectUrl = frontendBaseUrl + redirectPage + "?error=" + URLEncoder.encode("Đã xảy ra lỗi hệ thống khi xử lý tài khoản Google", StandardCharsets.UTF_8);
            response.sendRedirect(redirectUrl);
        }
    }
}
