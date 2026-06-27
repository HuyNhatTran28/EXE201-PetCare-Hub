package com.petcare_hub.service;

import com.petcare_hub.enums.PaymentMethod;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncEmailService {

    private final JavaMailSender mailSender;

    private static final String FROM = "noreply@petcarehub.vn";

    @Async
    public void sendInvoiceEmailAsync(
            String invoiceNumber, String ownerEmail, String ownerName,
            String hotelName, String roomName,
            LocalDate checkInDate, LocalDate checkOutDate,
            BigDecimal totalAmount, PaymentMethod paymentMethod) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(ownerEmail);
            mail.setSubject("PetCare Hub - Xac nhan dat phong #" + invoiceNumber);
            mail.setText(
                "Xin chao " + ownerName + ",\n\n" +
                "Dat phong cua ban da duoc ghi nhan thanh cong!\n\n" +
                "-------------------------------\n" +
                "MA HOA DON: " + invoiceNumber + "\n" +
                "Khach san:  " + hotelName + "\n" +
                "Loai phong: " + roomName + "\n" +
                "Check-in:   " + checkInDate + "\n" +
                "Check-out:  " + checkOutDate + "\n" +
                "Tong tien:  " + totalAmount + " VND\n" +
                "Thanh toan: " + paymentMethod + "\n" +
                "Trang thai: PENDING - Cho xac nhan thanh toan\n" +
                "-------------------------------\n\n" +
                "Vui long hoan tat thanh toan de xac nhan dat phong.\n" +
                "Noi dung chuyen khoan: " + invoiceNumber + "\n\n" +
                "Cam on ban da tin tuong PetCare Hub!\n" +
                "Team PetCare Hub"
            );
            mail.setFrom(FROM);
            mailSender.send(mail);
            log.info("Đã gửi email hóa đơn tới: {}", ownerEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email hóa đơn: {}", e.getMessage());
        }
    }

    @Async
    public void sendStaffWelcomeEmailAsync(
            String email, String fullName, String hotelName,
            String tempPassword, String loginUrl) {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(email);
        String subject = "🐾 PetCare Hub — Tài khoản nhân viên của bạn đã được tạo";
        String htmlContent = String.format(
            "<div style=\"background:#f8f9fa;padding:30px 10px;font-family:Arial,sans-serif\">" +
            "<div style=\"max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:35px;box-shadow:0 4px 12px rgba(0,0,0,0.06)\">" +
            "<h2 style=\"color:#44683b;margin:0 0 20px\">PetCare Hub 🐾</h2>" +
            "<p>Xin chào <strong style=\"color:#a43e24\">%s</strong>,</p>" +
            "<p>Bạn đã được thêm vào đội ngũ nhân viên của <strong>%s</strong> trên nền tảng PetCare Hub.</p>" +
            "<div style=\"background:#faf9f6;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e5d8d0\">" +
            "<p style=\"margin:0 0 8px\"><strong>Email đăng nhập:</strong> %s</p>" +
            "<p style=\"margin:0\"><strong>Mật khẩu tạm thời:</strong> <code style=\"background:#f0ebe8;padding:2px 8px;border-radius:6px;font-size:15px\">%s</code></p>" +
            "</div>" +
            "<p style=\"color:#666;font-size:13px\">Bạn sẽ được yêu cầu đổi mật khẩu sau khi đăng nhập lần đầu.</p>" +
            "<a href=\"%s\" style=\"display:inline-block;background:#a43e24;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:10px\">Đăng nhập ngay</a>" +
            "<hr style=\"border:0;border-top:1px solid #eee;margin:28px 0 18px\">" +
            "<p style=\"color:#aaa;font-size:12px;margin:0\">© 2026 PetCare Hub. Bảo lưu mọi quyền.</p>" +
            "</div></div>",
            fullName, hotelName, email, tempPassword, loginUrl
        );
        Content content = new Content("text/html", htmlContent);
        Mail mail = new Mail(from, subject, to, content);
        try {
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            sendGrid.api(request);
            log.info("Đã gửi email chào mừng nhân viên tới: {}", email);
        } catch (Exception e) {
            log.error("Không thể gửi email nhân viên: {}", e.getMessage());
        }
    }

    @Async
    public void sendConfirmEmailAsync(
            String invoiceNumber, String ownerEmail, String ownerName,
            String hotelName, String roomName,
            LocalDate checkInDate, LocalDate checkOutDate,
            BigDecimal totalAmount) {
        try {
            String htmlContent = String.format(
                "<div style=\"background-color: #f8f9fa; padding: 30px 10px; font-family: 'Segoe UI', Arial, sans-serif; min-height: 100%%;\">" +
                "    <div style=\"max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);\">" +
                "        <div style=\"text-align: center; margin-bottom: 25px;\">" +
                "            <h2 style=\"color: #44683b; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;\">PetCare Hub 🐾</h2>" +
                "        </div>" +
                "        <div style=\"color: #333333; font-size: 15px; line-height: 1.6;\">" +
                "            <p style=\"margin-top: 0;\">Xin chào <strong style=\"color: #a43e24;\">%s</strong>,</p>" +
                "            <p style=\"color: #555555;\">Đặt phòng của bạn đã được xác nhận thành công! Dưới đây là thông tin chi tiết:</p>" +
                "            <div style=\"background: #faf9f6; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e5d8d0;\">" +
                "                <table style=\"width: 100%%; font-size: 14px; border-collapse: collapse;\">" +
                "                    <tr><td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Mã đặt phòng:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">#%s</td></tr>" +
                "                    <tr><td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Khách sạn:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td></tr>" +
                "                    <tr><td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Loại phòng:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td></tr>" +
                "                    <tr><td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Check-in:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td></tr>" +
                "                    <tr><td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Check-out:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td></tr>" +
                "                    <tr><td style=\"padding: 12px 0 0 0; color: #a43e24; font-weight: 800; font-size: 16px; border-top: 1px dashed #e5d8d0;\">Tổng thanh toán:</td><td style=\"padding: 12px 0 0 0; font-weight: 800; font-size: 16px; text-align: right; color: #a43e24; border-top: 1px dashed #e5d8d0;\">%s VND</td></tr>" +
                "                </table>" +
                "            </div>" +
                "            <p style=\"color: #666666; font-size: 14px;\">Cảm ơn bạn đã tin tưởng lựa chọn PetCare Hub cho bé yêu của mình. Hẹn gặp lại bạn và bé tại khách sạn!</p>" +
                "        </div>" +
                "        <hr style=\"border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;\">" +
                "        <div style=\"text-align: center; font-size: 12px; color: #aaaaaa;\">" +
                "            <p style=\"margin: 0 0 5px 0;\">Email này được gửi tự động từ hệ thống PetCare Hub.</p>" +
                "            <p style=\"margin: 0; font-weight: 600;\">© 2026 PetCare Hub. Bảo lưu mọi quyền.</p>" +
                "        </div>" +
                "    </div>" +
                "</div>",
                ownerName, invoiceNumber, hotelName, roomName,
                checkInDate.toString(), checkOutDate.toString(),
                String.format("%,.0f", totalAmount)
            );

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(ownerEmail);
            helper.setSubject("✅ PetCare Hub — Đặt phòng đã được xác nhận!");
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email xác nhận đặt phòng tới: {}", ownerEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email xác nhận đặt phòng: {}", e.getMessage());
        }
    }

    @Async
    public void sendStaffWelcomeEmailAsync(
            String staffEmail, String staffName, String hotelName,
            String tempPassword, String loginUrl) {
        try {
            String html = """
                <div style="background:#faf9f6;padding:40px 20px;font-family:'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;color:#303330;line-height:1.6;">
                  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5d8d0;box-shadow:0 4px 20px rgba(0,0,0,0.02);">
                    <div style="background:linear-gradient(135deg,#fa7150 0%%,#a43e24 100%%);padding:30px;text-align:center;">
                      <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:800;">PetCare Hub 🐾</h2>
                      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Chào mừng bạn gia nhập đội ngũ!</p>
                    </div>
                    <div style="padding:36px 30px;">
                      <p style="margin-top:0;">Xin chào <strong>%s</strong>,</p>
                      <p>Bạn đã được thêm vào đội ngũ nhân viên của <strong>%s</strong> trên nền tảng PetCare Hub.</p>
                      <p style="color:#555555;">Dưới đây là thông tin đăng nhập tạm thời của bạn:</p>
                      <div style="background:#fff8f6;border:1px dashed #fa7150;border-radius:14px;padding:22px;margin:24px 0;">
                        <table style="width:100%%;font-size:14px;border-collapse:collapse;">
                          <tr>
                            <td style="padding:8px 0;color:#8a7e75;font-weight:700;width:130px;">Email:</td>
                            <td style="padding:8px 0;font-weight:600;color:#303330;font-family:monospace;">%s</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;color:#8a7e75;font-weight:700;">Mật khẩu tạm:</td>
                            <td style="padding:8px 0;font-weight:800;color:#fa7150;font-family:monospace;font-size:16px;letter-spacing:1px;">%s</td>
                          </tr>
                        </table>
                      </div>
                      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:14px 18px;margin-bottom:24px;font-size:13px;color:#856404;">
                        ⚠️ <strong>Quan trọng:</strong> Bạn sẽ được yêu cầu <strong>đổi mật khẩu ngay khi đăng nhập lần đầu</strong>. Vui lòng không chia sẻ mật khẩu tạm này với người khác.
                      </div>
                      <div style="text-align:center;">
                        <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#fa7150,#a43e24);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:50px;font-weight:700;font-size:15px;">Đăng nhập ngay →</a>
                      </div>
                    </div>
                    <hr style="border:0;border-top:1px solid #eeeeee;margin:0;">
                    <div style="text-align:center;font-size:12px;color:#aaaaaa;padding:20px 30px;">
                      <p style="margin:0 0 4px;">Email này được gửi tự động, vui lòng không phản hồi.</p>
                      <p style="margin:0;font-weight:600;">© 2026 PetCare Hub. All rights reserved.</p>
                    </div>
                  </div>
                </div>
                """.formatted(staffName, hotelName, staffEmail, tempPassword, loginUrl);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(FROM);
            helper.setTo(staffEmail);
            helper.setSubject("Tài khoản nhân viên PetCare Hub của bạn — " + hotelName);
            helper.setText(html, true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email chào mừng nhân viên tới: {}", staffEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email chào mừng nhân viên {}: {}", staffEmail, e.getMessage());
        }
    }
}
