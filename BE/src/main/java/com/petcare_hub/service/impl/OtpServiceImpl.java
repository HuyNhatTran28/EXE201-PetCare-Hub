package com.petcare_hub.service.impl;

import com.petcare_hub.dto.response.AuthResponse;
import com.petcare_hub.entity.User;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.OtpService;
import com.petcare_hub.utils.JwtUtils;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final SendGrid sendGrid;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Value("${sendgrid.from-name}")
    private String fromName;

    private static final long ACCESS_TOKEN_EXPIRES_SECONDS = 900;

    // Lưu OTP tạm trong memory
    // Production → thay bằng Redis
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    // ── Gửi OTP ───────────────────────────────────────────────

    @Override
    public void sendOtp(String phone) {

        // Tìm user theo SĐT
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new AppException(
                        "Số điện thoại chưa được đăng ký",
                        HttpStatus.NOT_FOUND
                ));

        // Sinh mã OTP 6 số
        String otpCode = generateOtp();

        // Lưu OTP — hết hạn sau 5 phút
        otpStore.put(phone, new OtpEntry(otpCode, LocalDateTime.now().plusMinutes(5)));

        // Gửi qua email
        sendOtpEmail(user.getEmail(), user.getFullName(), otpCode);

        log.info("Đã gửi OTP đến email của SĐT: {}", phone);
    }

    // ── Xác thực OTP ──────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse verifyOtp(String phone, String otpCode) {

        OtpEntry entry = otpStore.get(phone);

        // OTP không tồn tại
        if (entry == null) {
            throw new AppException(
                    "Mã OTP không tồn tại. Vui lòng yêu cầu mã mới.",
                    HttpStatus.BAD_REQUEST
            );
        }

        // OTP hết hạn
        if (LocalDateTime.now().isAfter(entry.expireAt())) {
            otpStore.remove(phone);
            throw new AppException(
                    "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
                    HttpStatus.BAD_REQUEST
            );
        }

        // OTP sai
        if (!entry.code().equals(otpCode)) {
            throw new AppException(
                    "Mã OTP không đúng",
                    HttpStatus.BAD_REQUEST
            );
        }

        // Xóa OTP sau khi dùng
        otpStore.remove(phone);

        // Lấy user
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy người dùng",
                        HttpStatus.NOT_FOUND
                ));

        // Nếu chưa verify → đây là lần xác thực sau đăng ký
        // Nếu đã verify → đây là đăng nhập bằng SĐT
        // Cả 2 trường hợp đều set isVerified = true và cấp JWT
        if (!user.getIsVerified()) {
            user.setIsVerified(true);
            userRepository.save(user);
            log.info("User {} đã xác thực tài khoản thành công", phone);
        } else {
            log.info("User {} đăng nhập bằng SĐT thành công", phone);
        }

        // Cấp JWT
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

    // ── Private helpers ────────────────────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    private void sendOtpEmail(String toEmail, String fullName, String otpCode) {
        Email from     = new Email(fromEmail, fromName);
        Email to       = new Email(toEmail);
        String subject = "Mã xác thực PetCare Hub";
        Content content = new Content("text/html",
                buildEmailContent(fullName, otpCode));

        Mail mail = new Mail(from, subject, to, content);

        try {
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            sendGrid.api(request);
        } catch (Exception e) {
            log.error("Lỗi gửi email OTP: {}", e.getMessage());
            throw new AppException(
                    "Không thể gửi email. Vui lòng thử lại.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    private String buildEmailContent(String fullName, String otpCode) {
        return """
        <div style="background-color: #f8f9fa; padding: 30px 10px; font-family: 'Segoe UI', Arial, sans-serif; min-height: 100%%;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #fa7150; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                        PetCare Hub
                    </h2>
                </div>
                
                <div style="color: #333333; font-size: 15px; line-height: 1.6;">
                    <p style="margin-top: 0;">Xin chào <strong style="color: #fa7150;">%s</strong>,</p>
                    <p style="color: #555555;">Mã xác thực của bạn đã sẵn sàng. Vui lòng sử dụng mã dưới đây để tiếp tục:</p>
                    
                    <div style="background: #fff8f6; border: 1px dashed #fa7150; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 38px; font-weight: 800; color: #fa7150; letter-spacing: 10px; padding-left: 10px; font-family: monospace, sans-serif;">
                            %s
                        </span>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; margin-bottom: 5px; display: flex; align-items: center;">
                        <span style="margin-right: 6px;">⏱</span> Mã có hiệu lực trong <strong style="color: #fa7150;">5 phút</strong>.
                    </p>
                    <p style="color: #888888; font-size: 13px; margin-top: 0; font-style: italic;">
                        Nếu bạn không yêu cầu mã này, bạn có thể an tâm bỏ qua email này.
                    </p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;">
                <div style="text-align: center; font-size: 12px; color: #aaaaaa;">
                    <p style="margin: 0 0 5px 0;">Email này được gửi tự động, vui lòng không phản hồi.</p>
                    <p style="margin: 0; font-weight: 600;">© 2026 PetCare Hub. All rights reserved.</p>
                </div>
            </div>
        </div>
        """.formatted(fullName, otpCode);
    }

    private record OtpEntry(String code, LocalDateTime expireAt) {}
}