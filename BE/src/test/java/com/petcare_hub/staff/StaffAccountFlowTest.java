package com.petcare_hub.staff;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare_hub.dto.request.CreateStaffRequest;
import com.petcare_hub.dto.request.ForceChangePasswordRequest;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.Staff;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.enums.Role;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.StaffRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.AsyncEmailService;
import com.petcare_hub.utils.JwtUtils;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test — Staff Account Flow
 *
 * Tính năng kiểm tra: Chủ tạo tài khoản nhân viên + gửi mật khẩu qua email + ép đổi mật khẩu lần đầu
 *
 * Setup: DB thật PostgreSQL. AsyncEmailService bị @MockBean → không gửi mail thật.
 *
 * NOTE CASE 5 (@Async limitation):
 *   Trong production, @Async khiến email chạy ở thread riêng → transaction đã commit trước khi
 *   email service được gọi → email lỗi không rollback staff. Với @MockBean (sync mock), exception
 *   từ mock propagate vào @Transactional → transaction rollback → staff không tạo được.
 *   Test case 5 sẽ FAIL do artifact này (không phải bug code nghiệp vụ).
 *   Nếu muốn test đúng production behavior, cần thêm try-catch trong createStaff() hoặc dùng spy thật.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Staff Account Flow — 14 Integration Tests")
class StaffAccountFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired HotelRepository hotelRepository;
    @Autowired StaffRepository staffRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtUtils jwtUtils;

    @MockBean
    AsyncEmailService asyncEmailService;

    // ── Seed data ──────────────────────────────────────────────────────────────
    private User partnerA;
    private User partnerB;
    private Hotel hotelA;
    private Hotel hotelB;
    private User ownerUser;

    private String tokenA;   // Bearer token cho partnerA
    private String tokenB;   // Bearer token cho partnerB
    private String tokenOwner;

    // Shared state cho group 3 (test 6-9)
    private String capturedTempPassword;
    private UUID   staffUserId;
    private String staffEmailGroup3;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    @BeforeAll
    void seedData() {
        String tag = UUID.randomUUID().toString().substring(0, 6);

        partnerA = userRepository.save(User.builder()
                .email("partner-a-" + tag + "@staff-test.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Partner A (test)")
                .role(Role.PARTNER)
                .isVerified(true)
                .build());

        partnerB = userRepository.save(User.builder()
                .email("partner-b-" + tag + "@staff-test.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Partner B (test)")
                .role(Role.PARTNER)
                .isVerified(true)
                .build());

        ownerUser = userRepository.save(User.builder()
                .email("owner-" + tag + "@staff-test.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Owner (test)")
                .role(Role.OWNER)
                .isVerified(true)
                .build());

        hotelA = hotelRepository.save(Hotel.builder()
                .partner(partnerA)
                .name("Hotel A (staff-test)")
                .address("123 Đường Test A")
                .status(HotelStatus.ACTIVE)
                .build());

        hotelB = hotelRepository.save(Hotel.builder()
                .partner(partnerB)
                .name("Hotel B (staff-test)")
                .address("456 Đường Test B")
                .status(HotelStatus.ACTIVE)
                .build());

        tokenA     = bearer(partnerA,   Role.PARTNER);
        tokenB     = bearer(partnerB,   Role.PARTNER);
        tokenOwner = bearer(ownerUser,  Role.OWNER);
    }

    @AfterAll
    void cleanup() {
        // Xóa tất cả staff (và user account của họ) thuộc 2 hotel test
        for (UUID hotelId : List.of(hotelA.getId(), hotelB.getId())) {
            List<Staff> staffList = staffRepository
                    .findByWorkplaceIdAndDeletedFalseOrderByCreatedAtDesc(hotelId);
            for (Staff s : staffList) {
                UUID uid = s.getUserAccount() != null ? s.getUserAccount().getId() : null;
                try { staffRepository.deleteById(s.getId()); } catch (Exception ignored) {}
                if (uid != null) {
                    try { userRepository.deleteById(uid); } catch (Exception ignored) {}
                }
            }
        }
        // Xóa hotels → sau đó xóa partner/owner users
        try { hotelRepository.deleteById(hotelA.getId()); } catch (Exception ignored) {}
        try { hotelRepository.deleteById(hotelB.getId()); } catch (Exception ignored) {}
        try { userRepository.deleteById(partnerA.getId()); } catch (Exception ignored) {}
        try { userRepository.deleteById(partnerB.getId()); } catch (Exception ignored) {}
        try { userRepository.deleteById(ownerUser.getId()); } catch (Exception ignored) {}
    }

    @BeforeEach
    void resetMock() {
        reset(asyncEmailService);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String bearer(User u, Role role) {
        return "Bearer " + jwtUtils.generateAccessToken(u.getId(), u.getEmail(), role.name());
    }

    private String uid() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String createStaffJson(String email, UUID hotelId) throws Exception {
        CreateStaffRequest req = new CreateStaffRequest(
                "Test Staff " + uid(), email, null, hotelId, "Chăm sóc viên");
        return objectMapper.writeValueAsString(req);
    }

    private String loginJson(String email, String password) throws Exception {
        return String.format("{\"email\":\"%s\",\"password\":\"%s\"}", email, password);
    }

    private void cleanupStaffByEmail(String email) {
        Optional<User> opt = userRepository.findByEmail(email);
        opt.ifPresent(u -> {
            staffRepository.findByUserAccountIdAndDeletedFalse(u.getId())
                    .ifPresent(staffRepository::delete);
            userRepository.delete(u);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÓM 1 — Tạo nhân viên
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @Order(1)
    @DisplayName("1 · createStaff_success")
    void createStaff_success() throws Exception {
        String email = "staff-t1-" + uid() + "@staff-test.com";

        // Capture temp password từ mock call
        ArgumentCaptor<String> passCaptor = ArgumentCaptor.forClass(String.class);

        MvcResult result = mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        verify(asyncEmailService).sendStaffWelcomeEmailAsync(
                anyString(), anyString(), anyString(), passCaptor.capture(), anyString());
        String tempPass = passCaptor.getValue();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        assertThat(data).isNotNull();
        assertThat(UUID.fromString(data.get("workplaceId").asText())).isEqualTo(hotelA.getId());

        // Kiểm tra DB
        User staffUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(staffUser.getRole()).isEqualTo(Role.STAFF);
        assertThat(staffUser.getMustChangePassword()).isTrue();
        // password phải là BCrypt hash, KHÔNG phải plain text
        assertThat(staffUser.getPasswordHash()).startsWith("$2");
        assertThat(staffUser.getPasswordHash()).isNotEqualTo(tempPass);
        // Staff record tồn tại, gắn đúng hotel A
        Staff staff = staffRepository.findByUserAccountIdAndDeletedFalse(staffUser.getId()).orElseThrow();
        assertThat(staff.getWorkplace().getId()).isEqualTo(hotelA.getId());

        cleanupStaffByEmail(email);
    }

    @Test
    @Order(2)
    @DisplayName("2 · createStaff_sendsEmail")
    void createStaff_sendsEmail() throws Exception {
        String email = "staff-t2-" + uid() + "@staff-test.com";

        ArgumentCaptor<String> emailCaptor  = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> nameCaptor   = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> hotelCaptor  = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> passCaptor   = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> urlCaptor    = ArgumentCaptor.forClass(String.class);

        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isCreated());

        // Mail: đã verify code gọi gửi — cần kiểm hộp thư thủ công 1 lần
        verify(asyncEmailService, times(1)).sendStaffWelcomeEmailAsync(
                emailCaptor.capture(),
                nameCaptor.capture(),
                hotelCaptor.capture(),
                passCaptor.capture(),
                urlCaptor.capture());

        assertThat(emailCaptor.getValue()).isEqualTo(email);
        assertThat(passCaptor.getValue())
                .as("Mật khẩu tạm phải không rỗng và >= 8 ký tự")
                .isNotBlank()
                .hasSizeGreaterThanOrEqualTo(8);
        assertThat(hotelCaptor.getValue()).contains("Hotel A");

        cleanupStaffByEmail(email);
    }

    @Test
    @Order(3)
    @DisplayName("3 · createStaff_responseHidesPassword")
    void createStaff_responseHidesPassword() throws Exception {
        String email = "staff-t3-" + uid() + "@staff-test.com";

        MvcResult result = mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Response JSON không được chứa bất kỳ field nào liên quan mật khẩu
        assertThat(body)
                .doesNotContain("password")
                .doesNotContain("passwordHash")
                .doesNotContain("tempPassword");

        cleanupStaffByEmail(email);
    }

    @Test
    @Order(4)
    @DisplayName("4 · createStaff_duplicateEmail_rejected")
    void createStaff_duplicateEmail_rejected() throws Exception {
        String email = "staff-t4-dup-" + uid() + "@staff-test.com";
        String body  = createStaffJson(email, hotelA.getId());

        // Tạo lần 1 — thành công
        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Tạo lần 2 — phải bị từ chối (409 CONFLICT)
        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is4xxClientError());

        // DB chỉ có đúng 1 user với email này
        long count = userRepository.findAll().stream()
                .filter(u -> email.equals(u.getEmail())).count();
        assertThat(count).isEqualTo(1);

        cleanupStaffByEmail(email);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÓM 2 — Mail lỗi không hỏng luồng (async)
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @Order(5)
    @DisplayName("5 · createStaff_emailFails_staffStillCreated")
    void createStaff_emailFails_staffStillCreated() throws Exception {
        /*
         * IMPORTANT — @MockBean @Async limitation:
         *
         * Production: @Async → email chạy ở thread khác → transaction đã commit TRƯỚC KHI
         *   email service được invoke → email lỗi không rollback staff.
         *
         * Test (sync mock): exception từ doThrow() propagate TRONG @Transactional createStaff()
         *   → Spring đánh dấu transaction rollback → staff KHÔNG được tạo → HTTP 500.
         *
         * Nếu test này FAIL (HTTP 500, staffInDb=false):
         *   → ĐÂY LÀ TEST ARTIFACT (không phải bug production), không tự ý sửa code nghiệp vụ.
         *   → Giải pháp: thêm try-catch trong StaffManagementServiceImpl.createStaff() quanh
         *     lời gọi asyncEmailService, hoặc dùng @SpyBean + @MockBean SendGrid.
         */
        String email = "staff-t5-mailfail-" + uid() + "@staff-test.com";

        doThrow(new RuntimeException("Simulated SendGrid timeout"))
                .when(asyncEmailService)
                .sendStaffWelcomeEmailAsync(anyString(), anyString(), anyString(), anyString(), anyString());

        MvcResult result = mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andReturn();

        int    httpStatus = result.getResponse().getStatus();
        boolean staffInDb = userRepository.findByEmail(email).isPresent();

        // Ghi nhận kết quả thực tế
        System.out.printf(
                "%n[CASE 5] httpStatus=%d | staffInDb=%b%n" +
                "  → Nếu 201 + true  : production-like (không thể xảy ra với @MockBean sync)%n" +
                "  → Nếu 500 + false : @MockBean artifact — sync exception cuộn transaction%n",
                httpStatus, staffInDb);

        // Assertion phản ánh production expectation — sẽ FAIL với @MockBean sync
        assertThat(httpStatus)
                .as("Production: email lỗi async không ảnh hưởng HTTP status — phải 201. " +
                    "Nếu fail: @MockBean chạy sync, cần try-catch trong createStaff()")
                .isEqualTo(201);
        assertThat(staffInDb)
                .as("Staff phải vẫn được tạo dù email service ném exception")
                .isTrue();

        cleanupStaffByEmail(email);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÓM 3 — Ép đổi mật khẩu lần đầu (flow: 6 → 7 → 8 → 9, chia sẻ state)
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @Order(6)
    @DisplayName("6 · login_withTempPassword_flagSet")
    void login_withTempPassword_flagSet() throws Exception {
        staffEmailGroup3 = "staff-grp3-" + uid() + "@staff-test.com";
        ArgumentCaptor<String> passCaptor = ArgumentCaptor.forClass(String.class);

        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(staffEmailGroup3, hotelA.getId())))
                .andExpect(status().isCreated());

        verify(asyncEmailService).sendStaffWelcomeEmailAsync(
                eq(staffEmailGroup3), anyString(), anyString(),
                passCaptor.capture(), anyString());

        capturedTempPassword = passCaptor.getValue();
        staffUserId = userRepository.findByEmail(staffEmailGroup3)
                .map(User::getId).orElseThrow();

        // Login bằng mật khẩu tạm → mustChangePassword phải = true
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(staffEmailGroup3, capturedTempPassword)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode user = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("user");
        assertThat(user.get("mustChangePassword").asBoolean()).isTrue();
    }

    @Test
    @Order(7)
    @DisplayName("7 · forceChangePassword_success")
    void forceChangePassword_success() throws Exception {
        assertThat(capturedTempPassword).as("Test 6 phải chạy trước").isNotNull();

        // Lấy token cho staff user
        User staffUser = userRepository.findById(staffUserId).orElseThrow();
        String staffToken = "Bearer " + jwtUtils.generateAccessToken(
                staffUser.getId(), staffUser.getEmail(), Role.STAFF.name());

        ForceChangePasswordRequest req = new ForceChangePasswordRequest(
                capturedTempPassword, "NewSecure@2026");

        mockMvc.perform(post("/api/auth/force-change-password")
                        .header("Authorization", staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // DB: mustChangePassword phải thành false
        User updated = userRepository.findById(staffUserId).orElseThrow();
        assertThat(updated.getMustChangePassword()).isFalse();
    }

    @Test
    @Order(8)
    @DisplayName("8 · login_withNewPassword_noForce")
    void login_withNewPassword_noForce() throws Exception {
        assertThat(staffEmailGroup3).as("Test 6 phải chạy trước").isNotNull();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(staffEmailGroup3, "NewSecure@2026")))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode user = objectMapper.readTree(result.getResponse().getContentAsString()).get("user");
        assertThat(user.get("mustChangePassword").asBoolean())
                .as("Sau khi đổi mật khẩu, mustChangePassword phải = false")
                .isFalse();
    }

    @Test
    @Order(9)
    @DisplayName("9 · login_withOldTempPassword_fails")
    void login_withOldTempPassword_fails() throws Exception {
        assertThat(capturedTempPassword).as("Test 6 phải chạy trước").isNotNull();

        // Login lại bằng mật khẩu tạm cũ → phải thất bại
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(staffEmailGroup3, capturedTempPassword)))
                .andExpect(status().isUnauthorized());

        // Cleanup group 3 staff
        cleanupStaffByEmail(staffEmailGroup3);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÓM 4 — Phân quyền (bảo mật — quan trọng nhất)
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @Order(10)
    @DisplayName("10 · listStaff_otherHotelOwner_forbidden")
    void listStaff_otherHotelOwner_forbidden() throws Exception {
        // partnerB gọi GET /api/staff với hotelId của hotel A → phải bị chặn
        MvcResult result = mockMvc.perform(get("/api/staff")
                        .param("hotelId", hotelA.getId().toString())
                        .header("Authorization", tokenB))
                .andReturn();

        int status = result.getResponse().getStatus();
        boolean isSafe;

        if (status == 403 || status == 404) {
            isSafe = true;
        } else if (status == 200) {
            // Nếu trả 200, danh sách phải rỗng (không xem được staff của hotel A)
            JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
            isSafe = data == null || data.isEmpty();
        } else {
            isSafe = false;
        }

        assertThat(isSafe)
                .as("partnerB phải bị cấm hoặc nhận danh sách rỗng khi xem staff hotel A. " +
                    "HTTP status = " + status)
                .isTrue();
    }

    @Test
    @Order(11)
    @DisplayName("11 · createStaff_forOtherHotel_forbidden")
    void createStaff_forOtherHotel_forbidden() throws Exception {
        // partnerB cố tạo staff cho hotel A → phải 403
        String email = "staff-t11-cross-" + uid() + "@staff-test.com";

        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isForbidden());

        // Không được tạo user nào với email này
        assertThat(userRepository.findByEmail(email))
                .as("partnerB không được tạo staff cho hotel A — user KHÔNG được tồn tại trong DB")
                .isEmpty();
    }

    @Test
    @Order(12)
    @DisplayName("12 · toggleActive_otherHotelStaff_forbidden")
    void toggleActive_otherHotelStaff_forbidden() throws Exception {
        // 1. partnerA tạo staff cho hotel A
        String email = "staff-t12-toggle-" + uid() + "@staff-test.com";
        MvcResult createResult = mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        UUID staffId = UUID.fromString(
                objectMapper.readTree(createResult.getResponse().getContentAsString())
                        .at("/data/id").asText());

        // 2. partnerB cố toggle staff thuộc hotel A → phải 403
        mockMvc.perform(patch("/api/staff/" + staffId + "/toggle-active")
                        .header("Authorization", tokenB))
                .andExpect(status().isForbidden());

        // isActive vẫn giữ nguyên true (không bị toggle)
        User staffUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(staffUser.getIsActive()).isTrue();

        cleanupStaffByEmail(email);
    }

    @Test
    @Order(13)
    @DisplayName("13 · createStaff_nonOwnerRole_forbidden")
    void createStaff_nonOwnerRole_forbidden() throws Exception {
        // OWNER role gọi POST /api/staff → phải 403
        String email = "staff-t13-owner-" + uid() + "@staff-test.com";

        mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenOwner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isForbidden());

        assertThat(userRepository.findByEmail(email))
                .as("OWNER role không được tạo staff")
                .isEmpty();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÓM 5 — Tài khoản tắt
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @Order(14)
    @DisplayName("14 · inactiveStaff_cannotLogin")
    void inactiveStaff_cannotLogin() throws Exception {
        String email = "staff-t14-inactive-" + uid() + "@staff-test.com";
        ArgumentCaptor<String> passCaptor = ArgumentCaptor.forClass(String.class);

        // Tạo staff
        MvcResult createResult = mockMvc.perform(post("/api/staff")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createStaffJson(email, hotelA.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        verify(asyncEmailService, atLeastOnce()).sendStaffWelcomeEmailAsync(
                eq(email), anyString(), anyString(), passCaptor.capture(), anyString());
        String tempPass = passCaptor.getValue();

        UUID staffId = UUID.fromString(
                objectMapper.readTree(createResult.getResponse().getContentAsString())
                        .at("/data/id").asText());

        // Toggle off (vô hiệu hóa)
        mockMvc.perform(patch("/api/staff/" + staffId + "/toggle-active")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk());

        // Kiểm tra DB: isActive = false
        User staffUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(staffUser.getIsActive())
                .as("Sau khi toggle, isActive phải = false")
                .isFalse();

        // Login bằng tài khoản đã tắt → phải thất bại (403 Forbidden theo AuthServiceImpl)
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, tempPass)))
                .andExpect(status().isForbidden());

        cleanupStaffByEmail(email);
    }
}
