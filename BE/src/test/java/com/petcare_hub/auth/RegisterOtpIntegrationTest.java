package com.petcare_hub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare_hub.dto.request.LoginRequest;
import com.petcare_hub.dto.request.RegisterRequest;
import com.petcare_hub.dto.request.ResendRegisterOtpRequest;
import com.petcare_hub.dto.request.VerifyRegisterOtpRequest;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.Role;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.AuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.mail.internet.MimeMessage;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Register OTP Flow Integration Test")
class RegisterOtpIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @MockBean
    private JavaMailSender mailSender;

    private String testEmail;

    @AfterEach
    void cleanup() {
        if (testEmail != null) {
            userRepository.findByEmail(testEmail).ifPresent(userRepository::delete);
        }
    }

    @Test
    @DisplayName("Đăng ký -> Đăng nhập thất bại (chưa xác thực) -> Xác thực OTP -> Đăng nhập thành công")
    void testRegisterOtpFlow() throws Exception {
        testEmail = "register-otp-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";

        // Mock mailSender
        MimeMessage mockMimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        // 1. Đăng ký tài khoản
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setEmail(testEmail);
        registerReq.setFullName("User OTP Test");
        registerReq.setPassword("Password123!");
        registerReq.setPhone("098" + UUID.randomUUID().toString().replaceAll("[^0-9]", "").substring(0, 7));
        registerReq.setRole(Role.OWNER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.message").exists());

        // Kiểm tra User trong DB
        User user = userRepository.findByEmail(testEmail).orElseThrow();
        assertThat(user.getIsVerified()).isFalse();

        // 2. Thử đăng nhập trước khi xác thực -> Phải thất bại (400 Bad Request)
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(testEmail);
        loginReq.setPassword("Password123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tài khoản chưa được xác thực email. Vui lòng xác thực trước khi đăng nhập."));

        // 3. Xác thực OTP sai -> Phải thất bại (400 Bad Request)
        VerifyRegisterOtpRequest verifyWrongReq = new VerifyRegisterOtpRequest();
        verifyWrongReq.setEmail(testEmail);
        verifyWrongReq.setOtpCode("999999");

        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyWrongReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mã OTP không đúng"));

        // 4. Lấy OTP thực tế bằng Reflection từ AuthServiceImpl
        Object target = org.springframework.test.util.AopTestUtils.getTargetObject(authService);
        java.lang.reflect.Field field = com.petcare_hub.service.impl.AuthServiceImpl.class.getDeclaredField("registerOtpStore");
        field.setAccessible(true);
        java.util.Map<String, ?> store = (java.util.Map<String, ?>) field.get(target);
        Object entry = store.get(testEmail);
        assertThat(entry).isNotNull();

        java.lang.reflect.Method codeMethod = entry.getClass().getMethod("code");
        codeMethod.setAccessible(true);
        String otpCode = (String) codeMethod.invoke(entry);
        assertThat(otpCode).isNotBlank();

        // 5. Xác thực OTP đúng -> Thành công
        VerifyRegisterOtpRequest verifyCorrectReq = new VerifyRegisterOtpRequest();
        verifyCorrectReq.setEmail(testEmail);
        verifyCorrectReq.setOtpCode(otpCode);

        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyCorrectReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.email").value(testEmail));

        // Kiểm tra User trong DB
        user = userRepository.findByEmail(testEmail).orElseThrow();
        assertThat(user.getIsVerified()).isTrue();

        // 6. Đăng nhập sau khi đã xác thực -> Thành công
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());

        // 7. Test resend OTP
        String anotherEmail = "register-resend-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
        RegisterRequest registerReq2 = new RegisterRequest();
        registerReq2.setEmail(anotherEmail);
        registerReq2.setFullName("User Resend Test");
        registerReq2.setPassword("Password123!");
        registerReq2.setPhone("098" + UUID.randomUUID().toString().replaceAll("[^0-9]", "").substring(0, 7));
        registerReq2.setRole(Role.OWNER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq2)))
                .andExpect(status().isCreated());

        Object entry1 = store.get(anotherEmail);
        String otp1 = (String) codeMethod.invoke(entry1);

        ResendRegisterOtpRequest resendReq = new ResendRegisterOtpRequest();
        resendReq.setEmail(anotherEmail);

        mockMvc.perform(post("/api/auth/register/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resendReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        Object entry2 = store.get(anotherEmail);
        String otp2 = (String) codeMethod.invoke(entry2);

        assertThat(otp2).isNotNull();
        // Dọn dẹp tài khoản phụ
        userRepository.findByEmail(anotherEmail).ifPresent(userRepository::delete);
    }
}
