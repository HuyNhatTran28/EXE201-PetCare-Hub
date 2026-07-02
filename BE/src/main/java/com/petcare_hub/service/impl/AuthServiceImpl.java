package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.ChangePasswordRequest;
import com.petcare_hub.dto.request.ForceChangePasswordRequest;
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

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final JavaMailSender mailSender;

    private static final String FROM = "noreply@petcarehub.vn";

    private final Map<UUID, OtpEntry> changePasswordOtpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpEntry> forgotPasswordOtpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpEntry> registerOtpStore = new ConcurrentHashMap<>();

    private record OtpEntry(String code, LocalDateTime expireAt) {}

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    private static final long ACCESS_TOKEN_EXPIRES_SECONDS = 900;


    @Override
    @Transactional
    public Map<String, String> register(RegisterRequest request) {

        // CRITICAL FIX: Chỉ cho phép đăng ký OWNER hoặc PARTNER
        // ADMIN/STAFF phải được tạo qua luồng riêng (DataSeeder / StaffManagementController)
        if (request.getRole() != com.petcare_hub.enums.Role.OWNER
                && request.getRole() != com.petcare_hub.enums.Role.PARTNER) {
            throw new AppException(
                    "Không được phép đăng ký với role " + request.getRole(),
                    HttpStatus.FORBIDDEN);
        }

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
                .isVerified(false)
                .build();

        User savedUser = userRepository.save(newUser);
        log.info("User mới đăng ký (chưa xác thực): {} ({})", savedUser.getEmail(), savedUser.getRole());

        // Sinh OTP đăng ký và gửi email
        String otpCode = generateOtp();
        registerOtpStore.put(savedUser.getEmail().toLowerCase().trim(), new OtpEntry(otpCode, LocalDateTime.now().plusMinutes(5)));
        sendRegisterOtpEmail(savedUser.getEmail(), savedUser.getFullName(), otpCode);

        return java.util.Map.of(
                "message", "Mã OTP xác thực đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.",
                "email", savedUser.getEmail()
        );
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

        if (!user.getIsVerified()) {
            throw new AppException(
                    "Tài khoản chưa được xác thực email. Vui lòng xác thực trước khi đăng nhập.",
                    HttpStatus.BAD_REQUEST
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
                .mustChangePassword(user.getMustChangePassword())
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

    @Override
    @Transactional
    public void forceChangePassword(UUID userId, ForceChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new AppException("Mật khẩu tạm thời không chính xác", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
        log.info("User đổi mật khẩu lần đầu thành công: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new AppException("Mật khẩu cũ không chính xác", HttpStatus.BAD_REQUEST);
        }

        // Kiểm tra OTP
        OtpEntry entry = changePasswordOtpStore.get(userId);
        if (entry == null) {
            throw new AppException("Mã OTP không tồn tại hoặc chưa được yêu cầu.", HttpStatus.BAD_REQUEST);
        }

        if (LocalDateTime.now().isAfter(entry.expireAt())) {
            changePasswordOtpStore.remove(userId);
            throw new AppException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", HttpStatus.BAD_REQUEST);
        }

        if (!entry.code().equals(request.getOtpCode())) {
            throw new AppException("Mã OTP không đúng", HttpStatus.BAD_REQUEST);
        }

        // Xóa OTP sau khi dùng thành công
        changePasswordOtpStore.remove(userId);

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("User đổi mật khẩu thành công: {}", user.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public void sendChangePasswordOtp(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        String otpCode = generateOtp();
        changePasswordOtpStore.put(userId, new OtpEntry(otpCode, LocalDateTime.now().plusMinutes(5)));

        sendChangePasswordEmail(user.getEmail(), user.getFullName(), otpCode);
        log.info("Đã gửi OTP đổi mật khẩu đến email của user: {}", user.getEmail());
    }

    private void sendChangePasswordEmail(String toEmail, String fullName, String otpCode) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực đổi mật khẩu - PetCare Hub");
            helper.setText(buildChangePasswordEmailContent(fullName, otpCode), true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email OTP đổi mật khẩu tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi gửi email OTP đổi mật khẩu: {}", e.getMessage());
            throw new AppException("Không thể gửi email xác thực. Vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String buildChangePasswordEmailContent(String fullName, String otpCode) {
        return """
        <div style="background: #faf9f6; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #303330; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5d8d0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                <div style="background: linear-gradient(135deg, #fa7150 0%%, #a43e24 100%%); padding: 30px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Xác thực tài khoản</h2>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="margin-top: 0;">Chào <strong>%s</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu đổi mật khẩu cho tài khoản PetCare Hub của bạn.</p>
                    <p style="color: #555555;">Để tiếp tục quá trình đổi mật khẩu, vui lòng sử dụng mã xác thực OTP dưới đây:</p>
                    
                    <div style="background: #fff8f6; border: 1px dashed #fa7150; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 38px; font-weight: 800; color: #fa7150; letter-spacing: 10px; padding-left: 10px; font-family: monospace, sans-serif;">
                            %s
                        </span>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">
                        Mã này có hiệu lực trong <strong style="color: #fa7150;">5 phút</strong>.
                    </p>
                    <p style="color: #888888; font-size: 13px; margin-top: 0; font-style: italic;">
                        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn sẽ được giữ an toàn.
                    </p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;">
                <div style="text-align: center; font-size: 12px; color: #aaaaaa; padding-bottom: 30px;">
                    <p style="margin: 0 0 5px 0;">Email này được gửi tự động, vui lòng không phản hồi.</p>
                    <p style="margin: 0; font-weight: 600;">© 2026 PetCare Hub. All rights reserved.</p>
                </div>
            </div>
        </div>
        """.formatted(fullName, otpCode);
    }

    @Override
    @Transactional(readOnly = true)
    public void sendForgotPasswordOtp(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new AppException("Email chưa đăng ký tài khoản trên hệ thống.", HttpStatus.NOT_FOUND));

        String otpCode = generateOtp();
        forgotPasswordOtpStore.put(email.toLowerCase().trim(), new OtpEntry(otpCode, LocalDateTime.now().plusSeconds(90)));

        sendForgotPasswordEmail(user.getEmail(), user.getFullName(), otpCode);
        log.info("Đã gửi OTP khôi phục mật khẩu đến email: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void resetPassword(String email, String otpCode, String newPassword) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new AppException("Email chưa đăng ký tài khoản trên hệ thống.", HttpStatus.NOT_FOUND));

        OtpEntry entry = forgotPasswordOtpStore.get(email.toLowerCase().trim());
        if (entry == null) {
            throw new AppException("Mã OTP không tồn tại hoặc chưa được yêu cầu.", HttpStatus.BAD_REQUEST);
        }

        if (LocalDateTime.now().isAfter(entry.expireAt())) {
            forgotPasswordOtpStore.remove(email.toLowerCase().trim());
            throw new AppException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", HttpStatus.BAD_REQUEST);
        }

        if (!entry.code().equals(otpCode)) {
            throw new AppException("Mã OTP không đúng", HttpStatus.BAD_REQUEST);
        }

        // Xóa OTP sau khi khôi phục thành công
        forgotPasswordOtpStore.remove(email.toLowerCase().trim());

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsVerified(true);
        userRepository.save(user);
        log.info("Khôi phục mật khẩu thành công cho email: {}", user.getEmail());
    }

    private void sendForgotPasswordEmail(String toEmail, String fullName, String otpCode) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực khôi phục mật khẩu - PetCare Hub");
            helper.setText(buildForgotPasswordEmailContent(fullName, otpCode), true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email OTP khôi phục mật khẩu tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi gửi email OTP khôi phục mật khẩu: {}", e.getMessage());
            throw new AppException("Không thể gửi email xác thực. Vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String buildForgotPasswordEmailContent(String fullName, String otpCode) {
        return """
        <div style="background: #faf9f6; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #303330; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5d8d0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                <div style="background: linear-gradient(135deg, #fa7150 0%%, #a43e24 100%%); padding: 30px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Khôi phục mật khẩu</h2>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="margin-top: 0;">Chào <strong>%s</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản PetCare Hub của bạn.</p>
                    <p style="color: #555555;">Vui lòng sử dụng mã xác thực OTP dưới đây để tiến hành đặt lại mật khẩu mới:</p>
                    
                    <div style="background: #fff8f6; border: 1px dashed #fa7150; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 38px; font-weight: 800; color: #fa7150; letter-spacing: 10px; padding-left: 10px; font-family: monospace, sans-serif;">
                            %s
                        </span>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">
                        Mã này có hiệu lực trong <strong style="color: #fa7150;">1 phút 30 giây</strong>.
                    </p>
                    <p style="color: #888888; font-size: 13px; margin-top: 0; font-style: italic;">
                        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email và tài khoản của bạn sẽ được giữ an toàn.
                    </p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;">
                <div style="text-align: center; font-size: 12px; color: #aaaaaa; padding-bottom: 30px;">
                    <p style="margin: 0 0 5px 0;">Email này được gửi tự động, vui lòng không phản hồi.</p>
                    <p style="margin: 0; font-weight: 600;">© 2026 PetCare Hub. All rights reserved.</p>
                </div>
            </div>
        </div>
        """.formatted(fullName, otpCode);
    }

    @Override
    @Transactional
    public AuthResponse verifyRegisterOtp(com.petcare_hub.dto.request.VerifyRegisterOtpRequest request) {
        String emailClean = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(emailClean)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        if (user.getIsVerified()) {
            throw new AppException("Tài khoản đã được xác thực trước đó.", HttpStatus.BAD_REQUEST);
        }

        OtpEntry entry = registerOtpStore.get(emailClean);
        if (entry == null) {
            throw new AppException("Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng nhấn gửi lại.", HttpStatus.BAD_REQUEST);
        }

        if (LocalDateTime.now().isAfter(entry.expireAt())) {
            registerOtpStore.remove(emailClean);
            throw new AppException("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.", HttpStatus.BAD_REQUEST);
        }

        if (!entry.code().equals(request.getOtpCode())) {
            throw new AppException("Mã OTP không đúng", HttpStatus.BAD_REQUEST);
        }

        // OTP đúng -> kích hoạt tài khoản
        registerOtpStore.remove(emailClean);
        user.setIsVerified(true);
        userRepository.save(user);

        log.info("User {} xác thực tài khoản thành công qua OTP đăng ký", user.getEmail());
        return buildAuthResponse(user);
    }

    @Override
    public void resendRegisterOtp(String email) {
        String emailClean = email.toLowerCase().trim();
        User user = userRepository.findByEmail(emailClean)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        if (user.getIsVerified()) {
            throw new AppException("Tài khoản đã được xác thực trước đó.", HttpStatus.BAD_REQUEST);
        }

        String otpCode = generateOtp();
        registerOtpStore.put(emailClean, new OtpEntry(otpCode, LocalDateTime.now().plusMinutes(5)));
        sendRegisterOtpEmail(user.getEmail(), user.getFullName(), otpCode);
        log.info("Gửi lại mã OTP đăng ký thành công cho: {}", user.getEmail());
    }

    private void sendRegisterOtpEmail(String toEmail, String fullName, String otpCode) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực đăng ký tài khoản - PetCare Hub");
            helper.setText(buildRegisterOtpEmailContent(fullName, otpCode), true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email OTP đăng ký tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi gửi email OTP đăng ký: {}", e.getMessage());
            throw new AppException("Không thể gửi email xác thực. Vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String buildRegisterOtpEmailContent(String fullName, String otpCode) {
        return """
        <div style="background: #faf9f6; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #303330; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5d8d0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                <div style="background: linear-gradient(135deg, #fa7150 0%%, #a43e24 100%%); padding: 30px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Xác thực đăng ký</h2>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="margin-top: 0;">Chào mừng <strong>%s</strong> đến với PetCare Hub!</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực tài khoản của bạn bằng mã OTP 6 chữ số dưới đây:</p>
                    
                    <div style="background: #fff8f6; border: 1px dashed #fa7150; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 38px; font-weight: 800; color: #fa7150; letter-spacing: 10px; padding-left: 10px; font-family: monospace, sans-serif;">
                            %s
                        </span>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">
                        Mã này có hiệu lực trong <strong style="color: #fa7150;">5 phút</strong>.
                    </p>
                    <p style="color: #888888; font-size: 13px; margin-top: 0; font-style: italic;">
                        Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email.
                    </p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;">
                <div style="text-align: center; font-size: 12px; color: #aaaaaa; padding-bottom: 30px;">
                    <p style="margin: 0 0 5px 0;">Email này được gửi tự động, vui lòng không phản hồi.</p>
                    <p style="margin: 0; font-weight: 600;">© 2026 PetCare Hub. All rights reserved.</p>
                </div>
            </div>
        </div>
        """.formatted(fullName, otpCode);
    }
}