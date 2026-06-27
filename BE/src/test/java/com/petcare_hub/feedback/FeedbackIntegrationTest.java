package com.petcare_hub.feedback;

import com.petcare_hub.entity.Feedback;
import com.petcare_hub.enums.Role;
import com.petcare_hub.entity.User;
import com.petcare_hub.repository.FeedbackRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.impl.ChatServiceImpl;
import com.petcare_hub.utils.JwtUtils;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Feedback Integration Tests")
class FeedbackIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired FeedbackRepository feedbackRepository;
    @Autowired UserRepository userRepository;
    @Autowired ChatServiceImpl chatService;
    @Autowired JwtUtils jwtUtils;
    @Autowired PasswordEncoder passwordEncoder;

    private User adminUser;
    private User regularUser;
    private String adminToken;
    private String userToken;

    @BeforeAll
    void setup() {
        feedbackRepository.deleteAll();

        String tag = UUID.randomUUID().toString().substring(0, 6);
        adminUser = userRepository.save(User.builder()
                .email("admin-" + tag + "@feedback-test.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Admin User")
                .role(Role.ADMIN)
                .build());

        regularUser = userRepository.save(User.builder()
                .email("user-" + tag + "@feedback-test.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Regular User")
                .role(Role.OWNER)
                .build());

        adminToken = "Bearer " + jwtUtils.generateAccessToken(adminUser.getId(), adminUser.getEmail(), "ADMIN");
        userToken = "Bearer " + jwtUtils.generateAccessToken(regularUser.getId(), regularUser.getEmail(), "OWNER");
    }

    @AfterAll
    void cleanup() {
        feedbackRepository.deleteAll();
        userRepository.delete(adminUser);
        userRepository.delete(regularUser);
    }

    @Test
    @Order(1)
    @DisplayName("1 · Save feedback from chatbot tag via reflection")
    void testSaveFeedbackViaChatService() throws Exception {
        // Arrange
        String replyText = "Cảm ơn bạn đã phản hồi! Trợ lý sẽ chuyển thông tin cho ban quản trị. [[FEEDBACK: BUG | Lỗi không nhấn được nút tìm kiếm trên giao diện mobile]]";

        // Invoke saveFeedbackIfAny via reflection
        Method method = ChatServiceImpl.class.getDeclaredMethod("saveFeedbackIfAny", String.class);
        method.setAccessible(true);
        method.invoke(chatService, replyText);

        // Assert
        List<Feedback> feedbacks = feedbackRepository.findAll();
        assertThat(feedbacks).hasSize(1);
        Feedback fb = feedbacks.get(0);
        assertThat(fb.getCategory()).isEqualTo("BUG");
        assertThat(fb.getContent()).isEqualTo("Lỗi không nhấn được nút tìm kiếm trên giao diện mobile");
    }

    @Test
    @Order(2)
    @DisplayName("2 · Get all feedbacks as Admin - Success")
    void testGetAllFeedbacksAsAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/feedbacks")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    @DisplayName("3 · Get all feedbacks as Regular User - Forbidden")
    void testGetAllFeedbacksAsUserForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/feedbacks")
                        .header("Authorization", userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(4)
    @DisplayName("4 · Delete feedback - Success")
    void testDeleteFeedback() throws Exception {
        Feedback fb = feedbackRepository.findAll().get(0);
        mockMvc.perform(delete("/api/admin/feedbacks/" + fb.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        assertThat(feedbackRepository.findById(fb.getId())).isEmpty();
    }
}
