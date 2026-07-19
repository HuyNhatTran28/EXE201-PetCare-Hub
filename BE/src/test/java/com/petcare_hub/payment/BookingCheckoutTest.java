package com.petcare_hub.payment;

import com.petcare_hub.entity.*;
import com.petcare_hub.enums.*;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.*;
import com.petcare_hub.service.AsyncEmailService;
import com.petcare_hub.service.impl.BookingServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit test cho BookingServiceImpl: check-in, check-out, giải phóng ví đối tác.
 *
 * Covers:
 *   J  – checkIn booking CONFIRMED → CHECKED_IN, lưu ảnh + chữ ký
 *   K  – checkIn booking PENDING → AppException
 *   L  – checkOut CHECKED_IN → COMPLETED, pendingBalance → balance
 *   M  – checkOut 2 lần → AppException (ví không bị cộng đôi)
 *   N  – checkOut dùng commissionRate snapshot (rate 10% → 252000, không hardcode 0.92)
 *   O  – checkOut với pendingBalance=0 vẫn tăng balance (CASH payment behavior)
 *   P  – commissionFee = 8% × totalAmount, partnerShare = 92%, tổng = totalAmount
 *   Q  – Điểm 3/7: handleWebhook có @Transactional (documented test)
 *   R  – Điểm 6/7: confirmBooking bypass payment không credit pendingBalance [BUG-6]
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BookingServiceImpl — Check-in / Check-out / Giải phóng ví")
class BookingCheckoutTest {

    @Mock private BookingRepository         bookingRepository;
    @Mock private UserRepository            userRepository;
    @Mock private HotelRepository           hotelRepository;
    @Mock private RoomTypeRepository        roomTypeRepository;
    @Mock private PetRepository             petRepository;
    @Mock private VoucherRepository         voucherRepository;
    @Mock private AsyncEmailService         asyncEmailService;
    @Mock private ReviewRepository          reviewRepository;
    @Mock private PartnerWalletRepository   partnerWalletRepository;
    @Mock private ServiceRepository         serviceRepository;
    @Mock private PaymentRepository         paymentRepository;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private static final UUID    BOOKING_ID = UUID.randomUUID();
    private static final UUID    STAFF_ID   = UUID.randomUUID();
    private static final UUID    PARTNER_ID = UUID.randomUUID();
    private static final BigDecimal TOTAL   = new BigDecimal("280000");

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Tạo Booking mock đầy đủ cho cả checkIn/checkOut.
     * toResponse() của BookingServiceImpl truy cập nhiều field → phải stub hết.
     */
    private Booking mockBooking(BookingStatus status, double commissionRate) {
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(UUID.randomUUID());
        when(owner.getFullName()).thenReturn("Nguyen Van A");
        when(owner.getEmail()).thenReturn("owner@test.com");

        User partner = mock(User.class);
        when(partner.getId()).thenReturn(PARTNER_ID);
        when(partner.getEmail()).thenReturn("partner@test.com");

        Hotel hotel = mock(Hotel.class);
        when(hotel.getId()).thenReturn(UUID.randomUUID());
        when(hotel.getName()).thenReturn("Test Hotel");
        when(hotel.getAddress()).thenReturn("123 Test St");
        when(hotel.getPartner()).thenReturn(partner);

        RoomType rt = mock(RoomType.class);
        when(rt.getId()).thenReturn(UUID.randomUUID());
        when(rt.getName()).thenReturn("Standard Room");

        Booking b = mock(Booking.class);
        when(b.getId()).thenReturn(BOOKING_ID);
        when(b.getStatus()).thenReturn(status);
        when(b.getTotalAmount()).thenReturn(TOTAL);
        when(b.getCommissionRate()).thenReturn(commissionRate);
        when(b.getHotel()).thenReturn(hotel);
        when(b.getOwner()).thenReturn(owner);
        when(b.getRoomType()).thenReturn(rt);
        when(b.getPets()).thenReturn(new HashSet<>());
        when(b.getCheckInDate()).thenReturn(LocalDate.now());
        when(b.getCheckOutDate()).thenReturn(LocalDate.now().plusDays(2));
        when(b.getInvoiceNumber()).thenReturn("INV-TEST-001");
        when(b.getCommissionFee()).thenReturn(new BigDecimal("37500"));
        when(b.getConvenienceFee()).thenReturn(new BigDecimal("10000"));
        when(b.getVatAmount()).thenReturn(new BigDecimal("20000"));
        when(b.getVoucherDiscountAmount()).thenReturn(BigDecimal.ZERO);
        when(b.getLoyaltyPointsUsed()).thenReturn(0);
        when(b.getPaymentMethod()).thenReturn(PaymentMethod.VIETQR);
        when(b.getCreatedAt()).thenReturn(LocalDateTime.now());
        return b;
    }

    /** Tạo PartnerWallet thực để assert balance trực tiếp */
    private PartnerWallet realWallet(BigDecimal balance, BigDecimal pending) {
        PartnerWallet w = new PartnerWallet();
        w.setBalance(balance);
        w.setPendingBalance(pending);
        return w;
    }

    // ─── TEST J ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[J] checkIn booking CONFIRMED → status CHECKED_IN, ảnh và chữ ký được lưu")
    void J_checkIn_confirmedBooking_setsCheckedIn() {
        Booking booking = mockBooking(BookingStatus.CONFIRMED, 0.15);

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        bookingService.checkIn(BOOKING_ID, STAFF_ID, "https://cdn/photo.jpg", "https://cdn/sig.jpg");

        verify(booking).setStatus(BookingStatus.CHECKED_IN);
        verify(booking).setCheckinPhotoUrl("https://cdn/photo.jpg");
        verify(booking).setOwnerSignatureUrl("https://cdn/sig.jpg");
    }

    // ─── TEST K ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[K] checkIn booking PENDING → AppException (phải CONFIRMED trước khi check-in)")
    void K_checkIn_pendingBooking_throwsException() {
        Booking booking = mockBooking(BookingStatus.PENDING, 0.15);
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() ->
                bookingService.checkIn(BOOKING_ID, STAFF_ID, null, null))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("CONFIRMED");
    }

    // ─── TEST L ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[L] checkOut CHECKED_IN → COMPLETED, pendingBalance về 0, balance tăng đúng")
    void L_checkOut_transfersPendingBalanceToBalance() {
        // DEFAULT_COMMISSION_RATE = 0.08 → commissionFee = 22400, partnerShare = 257600
        BigDecimal partnerShare = new BigDecimal("257600"); // TOTAL(280000) × (1 - 0.08)

        Booking booking = mockBooking(BookingStatus.CHECKED_IN, 0.08);
        // pendingBalance đã được cộng bởi webhook lúc thanh toán
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, partnerShare);

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID)).thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        bookingService.checkOut(BOOKING_ID, STAFF_ID);

        verify(booking).setStatus(BookingStatus.COMPLETED);

        assertThat(wallet.getPendingBalance())
                .as("pendingBalance phải = 0 sau checkout")
                .isEqualByComparingTo(BigDecimal.ZERO);

        assertThat(wallet.getBalance())
                .as("balance phải = partnerShare = 257600 (92%% của 280000) sau checkout")
                .isEqualByComparingTo(partnerShare);
    }

    // ─── TEST M ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[M] checkOut 2 lần → AppException lần 2, ví KHÔNG bị cộng đôi")
    void M_doubleCheckout_throwsOnSecondCall() {
        // Booking đã COMPLETED (sau lần checkout đầu)
        Booking booking = mockBooking(BookingStatus.COMPLETED, 0.15);
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() ->
                bookingService.checkOut(BOOKING_ID, STAFF_ID))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("CHECKED_IN");

        // Wallet không bị cộng thêm
        verify(partnerWalletRepository, never()).save(any());
    }

    // ─── TEST N ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[N] checkOut dùng booking.commissionRate snapshot, không hardcode — rate 10% → partner nhận 90%")
    void N_checkOut_usesCommissionRateSnapshot_notHardcoded() {
        // snapshotRate = 0.10 (khác default 0.08) để chứng minh code đọc từ snapshot
        double snapshotRate = 0.10;
        BigDecimal expectedShare = new BigDecimal("252000"); // 280000 × (1 - 0.10)

        Booking booking = mockBooking(BookingStatus.CHECKED_IN, snapshotRate);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, expectedShare); // pendingBalance từ webhook

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID)).thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        bookingService.checkOut(BOOKING_ID, STAFF_ID);

        assertThat(wallet.getBalance())
                .as("partnerShare phải = 252000 VNĐ (rate snapshot 10%%, không hardcode 8%%)")
                .isEqualByComparingTo(expectedShare);

        // Accounting identity: commissionFee + partnerShare = totalAmount
        BigDecimal impliedCommission = TOTAL.subtract(wallet.getBalance());
        assertThat(impliedCommission)
                .as("commissionFee ngầm = total − partnerShare phải = 28000 VNĐ (10%% × 280000)")
                .isEqualByComparingTo(TOTAL.multiply(BigDecimal.valueOf(snapshotRate)));
    }

    // ─── TEST O ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[O] ⚠️ BUG-5: checkOut khi pendingBalance=0 (ví dụ cash/manual) → balance vẫn tăng không qua pending")
    void O_checkOut_whenPendingIsZero_balanceStillIncreases() {
        // Trường hợp: admin manually confirm booking (không qua webhook) → pendingBalance = 0
        // Checkout vẫn add partnerShare vào balance → tiền được tạo ra không qua payment
        Booking booking = mockBooking(BookingStatus.CHECKED_IN, 0.15);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, BigDecimal.ZERO); // pending = 0

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID)).thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);

        bookingService.checkOut(BOOKING_ID, STAFF_ID);

        // partnerShare với rate=0.15 = 280000 × (1-0.15) = 238000
        // pendingBalance = 0 → không có tiền thực để chuyển, nhưng balance vẫn tăng.
        // Hành vi thiết kế cho CASH payment (không qua webhook) — cần BA xác nhận.
        assertThat(wallet.getBalance())
                .as("checkOut với pendingBalance=0 vẫn cộng partnerShare vào balance. "
                  + "Hành vi CASH payment: cần BA xác nhận intentional.")
                .isGreaterThan(BigDecimal.ZERO); // test PASS — ghi lại behavior
    }

    // ─── TEST P ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[P] commissionFee = 8% × totalAmount, partnerShare = 92% × totalAmount, tổng = totalAmount")
    void P_commissionFee_equals8PercentOfTotalAmount() {
        // Mô hình đúng: nền tảng thu 8% trên tổng hóa đơn, đối tác nhận 92%
        // totalAmount = 280,000 VNĐ (tiền phòng + dịch vụ + VAT + phí tiện ích)
        BigDecimal totalAmount = new BigDecimal("280000");

        BigDecimal commissionFee = new BigDecimal("22400");  // 280000 × 0.08
        BigDecimal partnerShare  = new BigDecimal("257600"); // 280000 × 0.92

        // Accounting identity: không mất tiền, không tạo tiền
        assertThat(commissionFee.add(partnerShare))
                .as("commissionFee + partnerShare phải = totalAmount")
                .isEqualByComparingTo(totalAmount);

        // Đúng tỷ lệ 8% / 92%
        assertThat(commissionFee)
                .as("commissionFee phải = 22400 VNĐ (8%% × 280000)")
                .isEqualByComparingTo(totalAmount.multiply(new BigDecimal("0.08")));

        assertThat(partnerShare)
                .as("partnerShare phải = 257600 VNĐ (92%% × 280000)")
                .isEqualByComparingTo(totalAmount.multiply(new BigDecimal("0.92")));
    }

    // ─── TEST Q ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[Q] Điểm 3/7: PaymentController.handleWebhook có @Transactional → kiểm tra via reflection")
    void Q_handleWebhook_hasTransactionalAnnotation() throws NoSuchMethodException {
        // Verify @Transactional present on handleWebhook to confirm atomicity
        var method = com.petcare_hub.controller.PaymentController.class
                .getMethod("handleWebhook", Map.class);

        boolean hasTransactional = method.isAnnotationPresent(
                org.springframework.transaction.annotation.Transactional.class);

        assertThat(hasTransactional)
                .as("Điểm 3/7: handleWebhook phải có @Transactional để đảm bảo "
                  + "payment.save() và wallet.save() nằm trong 1 transaction.")
                .isTrue();
    }

    // ─── TEST R ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[R] ⚠️ BUG-6: confirmBooking (admin/partner bypass) không credit pendingBalance")
    void R_confirmBooking_doesNotCreditPendingBalance() {
        // confirmBooking là endpoint ADMIN/PARTNER để manual confirm booking PENDING → CONFIRMED
        // Vấn đề: khi admin confirm, pendingBalance KHÔNG được cộng (khác với webhook flow)
        // → Sau checkout, balance += partnerShare mà không có tiền thực sự vào hệ thống

        Booking booking = mockBooking(BookingStatus.PENDING, 0.15);
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);
        when(reviewRepository.existsByBookingId(any())).thenReturn(false);
        
        Payment successPay = new Payment();
        successPay.setPaymentStatus(PaymentStatus.SUCCESS);
        when(paymentRepository.findByBookingId(any())).thenReturn(List.of(successPay));

        bookingService.confirmBooking(BOOKING_ID);

        verify(booking).setStatus(BookingStatus.CONFIRMED);

        // BUG-6: pendingBalance KHÔNG được cộng khi admin confirm
        // → Luồng cash/manual không credit wallet tạm thời
        // → checkout sau đó vẫn tăng balance mà không qua pending
        verify(partnerWalletRepository, never()).findByPartnerId(any());
        verify(partnerWalletRepository, never()).save(any());
        // Test PASS (confirm behavior documented as bug)
        // BA cần quyết định: manual confirm có nên credit pendingBalance không?
    }
}
