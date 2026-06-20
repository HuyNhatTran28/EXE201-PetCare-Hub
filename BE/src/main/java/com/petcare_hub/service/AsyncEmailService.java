package com.petcare_hub.service;

import com.petcare_hub.enums.PaymentMethod;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncEmailService {

    private final JavaMailSender mailSender;
    private final SendGrid sendGrid;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Value("${sendgrid.from-name}")
    private String fromName;

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
            mail.setFrom("noreply@petcarehub.vn");
            mailSender.send(mail);
            log.info("Đã gửi email hóa đơn tới: {}", ownerEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email hóa đơn: {}", e.getMessage());
        }
    }

    @Async
    public void sendConfirmEmailAsync(
            String invoiceNumber, String ownerEmail, String ownerName,
            String hotelName, String roomName,
            LocalDate checkInDate, LocalDate checkOutDate,
            BigDecimal totalAmount) {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(ownerEmail);
        String subject = "✅ PetCare Hub — Đặt phòng đã được xác nhận!";

        String htmlContent = String.format(
            "<div style=\"background-color: #f8f9fa; padding: 30px 10px; font-family: 'Segoe UI', Arial, sans-serif; min-height: 100%%;\">" +
            "    <div style=\"max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);\">" +
            "        <div style=\"text-align: center; margin-bottom: 25px;\">" +
            "            <h2 style=\"color: #44683b; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;\">PetCare Hub 🐾</h2>" +
            "        </div>" +
            "        <div style=\"color: #333333; font-size: 15px; line-height: 1.6;\">" +
            "            <p style=\"margin-top: 0;\">Xin chào <strong style=\"color: #a43e24;\">%s</strong>,</p>" +
            "            <p style=\"color: #555555;\">Đặt phòng của bạn đã được xác nhận thanh công! Dưới đây là thông tin chi tiết:</p>" +
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

        Content content = new Content("text/html", htmlContent);
        Mail mail = new Mail(from, subject, to, content);

        try {
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            sendGrid.api(request);
            log.info("Đã gửi email xác nhận đặt phòng tới: {}", ownerEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email xác nhận đặt phòng: {}", e.getMessage());
        }
    }
}
