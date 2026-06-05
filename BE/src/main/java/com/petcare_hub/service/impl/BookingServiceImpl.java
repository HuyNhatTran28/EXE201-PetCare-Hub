package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.entity.*;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.enums.DiscountType;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.*;
import com.petcare_hub.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository    bookingRepository;
    private final UserRepository       userRepository;
    private final HotelRepository      hotelRepository;
    private final RoomTypeRepository   roomTypeRepository;
    private final PetRepository        petRepository;
    private final VoucherRepository    voucherRepository;
    private final SendGrid             sendGrid;
    private final JavaMailSender       mailSender;
    private final ReviewRepository     reviewRepository;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Value("${sendgrid.from-name}")
    private String fromName;

    // Tỷ lệ hoa hồng mặc định 15%
    private static final double DEFAULT_COMMISSION_RATE = 0.15;
    // VAT 8%
    private static final double VAT_RATE = 0.08;
    // Phí tiện ích cố định
    private static final BigDecimal CONVENIENCE_FEE = BigDecimal.valueOf(10000);

    // ── Tạo Booking ───────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse createBooking(UUID ownerId, BookingRequest request) {

        // Validate ngày
        if (request.getCheckOutDate().isBefore(request.getCheckInDate())) {
            throw new AppException(
                "Ngày check-out không được trước ngày check-in",
                HttpStatus.BAD_REQUEST);
        }
        if (request.getCheckInDate().isBefore(LocalDate.now())) {
            throw new AppException(
                "Ngày check-in không được ở quá khứ",
                HttpStatus.BAD_REQUEST);
        }

        // Lấy các entity cần thiết
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        // Kiểm tra phòng còn trống không
        long overlapping = bookingRepository.countOverlappingBookings(
                roomType.getId(),
                request.getCheckInDate(),
                request.getCheckOutDate()
        );
        if (overlapping >= roomType.getTotalRooms()) {
            throw new AppException(
                "Không còn phòng trống trong khoảng thời gian này",
                HttpStatus.CONFLICT);
        }

        // Lấy danh sách pet
        List<Pet> pets = petRepository.findAllById(request.getPetIds());
        if (pets.size() != request.getPetIds().size()) {
            throw new AppException(
                "Một hoặc nhiều thú cưng không tồn tại",
                HttpStatus.BAD_REQUEST);
        }

        // Tính số đêm
        long totalNights = ChronoUnit.DAYS.between(
                request.getCheckInDate(), request.getCheckOutDate());
        long chargeNights = totalNights == 0 ? 1 : totalNights;

        // Tính tiền phòng
        BigDecimal roomTotal = roomType.getPricePerNight()
                .multiply(BigDecimal.valueOf(chargeNights));

        // Tính giảm giá voucher
        BigDecimal voucherDiscount = BigDecimal.ZERO;
        Voucher voucher = null;
        if (request.getVoucherCode() != null) {
            voucher = validateAndApplyVoucher(
                    request.getVoucherCode(), roomTotal);
            voucherDiscount = calculateDiscount(voucher, roomTotal);
        }

        // Tính VAT
        BigDecimal subTotal = roomTotal.subtract(voucherDiscount);
        BigDecimal vatAmount = subTotal
                .multiply(BigDecimal.valueOf(VAT_RATE))
                .setScale(0, RoundingMode.HALF_UP);

        // Tổng tiền cuối
        BigDecimal totalAmount = subTotal
                .add(vatAmount)
                .add(CONVENIENCE_FEE);

        // Tính hoa hồng — snapshot tại thời điểm đặt
        BigDecimal commissionFee = roomTotal
                .multiply(BigDecimal.valueOf(DEFAULT_COMMISSION_RATE))
                .setScale(0, RoundingMode.HALF_UP);

        // Tạo invoice number
        String invoiceNumber = "INV-" + System.currentTimeMillis();

        // Tạo Booking
        Booking booking = Booking.builder()
                .owner(owner)
                .hotel(hotel)
                .roomType(roomType)
                .appliedVoucher(voucher)
                .pets(new HashSet<>(pets))
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .totalAmount(totalAmount)
                .commissionRate(DEFAULT_COMMISSION_RATE)
                .commissionFee(commissionFee)
                .convenienceFee(CONVENIENCE_FEE)
                .vatAmount(vatAmount)
                .voucherDiscountAmount(voucherDiscount)
                .loyaltyPointsUsed(0)
                .invoiceNumber(invoiceNumber)
                .status(BookingStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking mới: {} bởi owner: {}", saved.getInvoiceNumber(), ownerId);

        sendInvoiceEmail(saved);

        return toResponse(saved);
    }

    private void sendInvoiceEmail(Booking booking) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(booking.getOwner().getEmail());
            mail.setSubject("PetCare Hub - Xac nhan dat phong #" + booking.getInvoiceNumber());
            mail.setText(
                "Xin chao " + booking.getOwner().getFullName() + ",\n\n" +
                "Dat phong cua ban da duoc ghi nhan thanh cong!\n\n" +
                "-------------------------------\n" +
                "MA HOA DON: " + booking.getInvoiceNumber() + "\n" +
                "Khach san:  " + booking.getHotel().getName() + "\n" +
                "Loai phong: " + booking.getRoomType().getName() + "\n" +
                "Check-in:   " + booking.getCheckInDate() + "\n" +
                "Check-out:  " + booking.getCheckOutDate() + "\n" +
                "Tong tien:  " + booking.getTotalAmount() + " VND\n" +
                "Thanh toan: " + booking.getPaymentMethod() + "\n" +
                "Trang thai: PENDING - Cho xac nhan thanh toan\n" +
                "-------------------------------\n\n" +
                "Vui long hoan tat thanh toan de xac nhan dat phong.\n" +
                "Noi dung chuyen khoan: " + booking.getInvoiceNumber() + "\n\n" +
                "Cam on ban da tin tuong PetCare Hub!\n" +
                "Team PetCare Hub"
            );
            mail.setFrom("noreply@petcarehub.vn");
            mailSender.send(mail);
            log.info("Đã gửi email hóa đơn tới: {}", booking.getOwner().getEmail());
        } catch (Exception e) {
            log.error("Không thể gửi email hóa đơn: {}", e.getMessage());
        }
    }

    // ── Xem chi tiết ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId, UUID userId) {
        Booking booking = findBookingById(bookingId);
        return toResponse(booking);
    }

    // ── Owner xem booking của mình ────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(UUID ownerId, Pageable pageable) {
        return bookingRepository
                .findByOwnerIdOrderByCreatedAtDesc(ownerId, pageable)
                .map(this::toResponse);
    }

    // ── Partner xem booking KS ────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getHotelBookings(
            UUID hotelId, UUID partnerId, Pageable pageable) {
        return bookingRepository
                .findByHotelIdOrderByCreatedAtDesc(hotelId, pageable)
                .map(this::toResponse);
    }

    // ── Hủy booking ───────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, UUID userId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() == BookingStatus.CHECKED_IN ||
            booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException(
                "Không thể hủy booking đang hoặc đã hoàn tất",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        log.info("Booking {} đã bị hủy bởi: {}", bookingId, userId);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Check-in ──────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse checkIn(UUID bookingId, UUID staffId,
                                   String checkinPhotoUrl,
                                   String ownerSignatureUrl) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(
                "Chỉ có thể check-in booking đã CONFIRMED",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckinPhotoUrl(checkinPhotoUrl);
        booking.setOwnerSignatureUrl(ownerSignatureUrl);

        log.info("Booking {} đã CHECK_IN", bookingId);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Check-out ─────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse checkOut(UUID bookingId, UUID staffId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new AppException(
                "Chỉ có thể check-out booking đang CHECKED_IN",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.COMPLETED);
        log.info("Booking {} đã COMPLETED", bookingId);
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse confirmBooking(UUID bookingId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException(
                "Chỉ có thể xác nhận booking đang PENDING",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        Booking saved = bookingRepository.save(booking);
        log.info("Booking {} đã CONFIRMED", bookingId);

        // Gửi email thông báo thanh toán và đặt phòng thành công
        sendConfirmEmail(saved);

        return toResponse(saved);
    }

    private void sendConfirmEmail(Booking booking) {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(booking.getOwner().getEmail());
        String subject = "✅ PetCare Hub — Đặt phòng đã được xác nhận!";
        
        String htmlContent = String.format(
            "<div style=\"background-color: #f8f9fa; padding: 30px 10px; font-family: 'Segoe UI', Arial, sans-serif; min-height: 100%%;\">" +
            "    <div style=\"max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 35px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);\">" +
            "        <div style=\"text-align: center; margin-bottom: 25px;\">" +
            "            <h2 style=\"color: #44683b; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;\">" +
            "                PetCare Hub 🐾" +
            "            </h2>" +
            "        </div>" +
            "        " +
            "        <div style=\"color: #333333; font-size: 15px; line-height: 1.6;\">" +
            "            <p style=\"margin-top: 0;\">Xin chào <strong style=\"color: #a43e24;\">%s</strong>,</p>" +
            "            <p style=\"color: #555555;\">Đặt phòng của bạn đã được xác nhận thanh công! Dưới đây là thông tin chi tiết:</p>" +
            "            " +
            "            <div style=\"background: #faf9f6; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e5d8d0;\">" +
            "                <table style=\"width: 100%%; font-size: 14px; border-collapse: collapse;\">" +
            "                    <tr>" +
            "                        <td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Mã đặt phòng:</td>" +
            "                        <td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">#%s</td>" +
            "                    </tr>" +
            "                    <tr>" +
            "                        <td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Khách sạn:</td>" +
            "                        <td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td>" +
            "                    </tr>" +
            "                    <tr>" +
            "                        <td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Loại phòng:</td>" +
            "                        <td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td>" +
            "                    </tr>" +
            "                    <tr>" +
            "                        <td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Check-in:</td>" +
            "                        <td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td>" +
            "                    </tr>" +
            "                    <tr>" +
            "                        <td style=\"padding: 6px 0; color: #8a7e75; font-weight: bold;\">Check-out:</td>" +
            "                        <td style=\"padding: 6px 0; font-weight: bold; text-align: right; color: #303330;\">%s</td>" +
            "                    </tr>" +
            "                    <tr>" +
            "                        <td style=\"padding: 12px 0 0 0; color: #a43e24; font-weight: 800; font-size: 16px; border-top: 1px dashed #e5d8d0;\">Tổng thanh toán:</td>" +
            "                        <td style=\"padding: 12px 0 0 0; font-weight: 800; font-size: 16px; text-align: right; color: #a43e24; border-top: 1px dashed #e5d8d0;\">%s VND</td>" +
            "                    </tr>" +
            "                </table>" +
            "            </div>" +
            "            " +
            "            <p style=\"color: #666666; font-size: 14px;\">" +
            "                Cảm ơn bạn đã tin tưởng lựa chọn PetCare Hub cho bé yêu của mình. Hẹn gặp lại bạn và bé tại khách sạn!" +
            "            </p>" +
            "        </div>" +
            "        " +
            "        <hr style=\"border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;\">" +
            "        <div style=\"text-align: center; font-size: 12px; color: #aaaaaa;\">" +
            "            <p style=\"margin: 0 0 5px 0;\">Email này được gửi tự động từ hệ thống PetCare Hub.</p>" +
            "            <p style=\"margin: 0; font-weight: 600;\">© 2026 PetCare Hub. Bảo lưu mọi quyền.</p>" +
            "        </div>" +
            "    </div>" +
            "</div>",
            booking.getOwner().getFullName(),
            booking.getInvoiceNumber(),
            booking.getHotel().getName(),
            booking.getRoomType().getName(),
            booking.getCheckInDate().toString(),
            booking.getCheckOutDate().toString(),
            String.format("%,.0f", booking.getTotalAmount())
        );

        Content content = new Content("text/html", htmlContent);
        Mail mail = new Mail(from, subject, to, content);

        try {
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            sendGrid.api(request);
            log.info("Đã gửi email xác nhận đặt phòng tới: {}", booking.getOwner().getEmail());
        } catch (Exception e) {
            log.error("Không thể gửi email xác nhận đặt phòng: {}", e.getMessage());
        }
    }

    // ── Private helpers ────────────────────────────────────────

    private Booking findBookingById(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy booking", HttpStatus.NOT_FOUND));
    }

    private Voucher validateAndApplyVoucher(String code, BigDecimal amount) {
        Voucher voucher = voucherRepository.findByVoucherCode(code)
                .orElseThrow(() -> new AppException(
                    "Mã voucher không tồn tại", HttpStatus.BAD_REQUEST));

        if (voucher.getVoucherStatus() != com.petcare_hub.enums.VoucherStatus.ACTIVE) {
            throw new AppException("Mã voucher đã hết hạn hoặc không còn hiệu lực",
                    HttpStatus.BAD_REQUEST);
        }

        if (voucher.getExpiresOn() != null &&
            voucher.getExpiresOn().isBefore(LocalDate.now())) {
            throw new AppException("Mã voucher đã hết hạn", HttpStatus.BAD_REQUEST);
        }

        if (voucher.getMaxUsageCount() != null &&
            voucher.getCurrentUsageCount() >= voucher.getMaxUsageCount()) {
            throw new AppException("Mã voucher đã hết lượt sử dụng",
                    HttpStatus.BAD_REQUEST);
        }

        // Tăng số lần dùng
        voucher.setCurrentUsageCount(voucher.getCurrentUsageCount() + 1);
        voucherRepository.save(voucher);

        return voucher;
    }

    private BigDecimal calculateDiscount(Voucher voucher, BigDecimal amount) {
        if (voucher.getDiscountType() == DiscountType.PERCENT) {
            return amount
                .multiply(voucher.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }
        return voucher.getDiscountValue().min(amount);
    }

    private BookingResponse toResponse(Booking b) {
        long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());

        List<BookingResponse.PetInfo> petInfos = b.getPets().stream()
                .map(p -> BookingResponse.PetInfo.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .species(p.getSpecies())
                        .build())
                .toList();

        boolean isReviewed = reviewRepository.existsByBookingId(b.getId());

        return BookingResponse.builder()
                .id(b.getId())
                .invoiceNumber(b.getInvoiceNumber())
                .ownerId(b.getOwner().getId())
                .ownerName(b.getOwner().getFullName())
                .hotelId(b.getHotel().getId())
                .hotelName(b.getHotel().getName())
                .hotelAddress(b.getHotel().getAddress())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .pets(petInfos)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .totalNights((int) nights)
                .totalAmount(b.getTotalAmount())
                .commissionFee(b.getCommissionFee())
                .convenienceFee(b.getConvenienceFee())
                .vatAmount(b.getVatAmount())
                .voucherDiscountAmount(b.getVoucherDiscountAmount())
                .loyaltyPointsUsed(b.getLoyaltyPointsUsed())
                .status(b.getStatus())
                .paymentMethod(b.getPaymentMethod())
                .createdAt(b.getCreatedAt())
                .isReviewed(isReviewed)
                .build();
    }
}
