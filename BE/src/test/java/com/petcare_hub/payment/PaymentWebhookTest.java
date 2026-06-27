package com.petcare_hub.payment;

import com.petcare_hub.controller.PaymentController;
import com.petcare_hub.entity.*;
import com.petcare_hub.enums.*;
import com.petcare_hub.repository.*;
import com.petcare_hub.service.AsyncEmailService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit test cho luồng thanh toán PayOS.
 * Không cần Spring context, không cần DB — dùng Mockito thuần.
 *
 * Covers:
 *   A  – Webhook hợp lệ code=00 → booking CONFIRMED + pendingBalance tăng
 *   B  – Webhook chữ ký sai → phải trả HTTP 200 (không để PayOS retry)  [BUG-2]
 *   C  – Webhook trùng lặp (payment đã SUCCESS) → idempotent
 *   D  – partnerShare dùng commissionRate snapshot (rate 10% → 252000, không hardcode 0.92)
 *   E  – Webhook orderCode không tồn tại → phải trả HTTP 200
 *   F  – Webhook code != 00 → không làm gì, trả OK
 *   G  – verifyPaymentStatus gọi khi payment đã SUCCESS → không cộng ví nữa
 *   H  – Điểm 1/7: webhook đọc 'code' từ verifiedData (đã xác thực) không phải body thô
 *   I  – partnerShare có setScale(0, HALF_UP) → VNĐ không có số lẻ
 *   J  – verifyPaymentStatus PAID dùng booking.commissionRate snapshot (rate 10% → 252000)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PayOS Webhook — Luồng thanh toán")
class PaymentWebhookTest {

    // PayOS dùng deep stubs vì: payOS.webhooks().verify(...) là chain 2 cấp
    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private PayOS payOS;

    @Mock private BookingRepository bookingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PartnerWalletRepository partnerWalletRepository;
    @Mock private AsyncEmailService asyncEmailService;

    @InjectMocks
    private PaymentController controller;

    private static final UUID    BOOKING_ID = UUID.randomUUID();
    private static final UUID    PARTNER_ID = UUID.randomUUID();
    private static final long    ORDER_CODE = 987654L;
    private static final BigDecimal TOTAL   = new BigDecimal("280000");

    @BeforeEach
    void setup() {
        // @Value không được inject bởi Mockito → phải set thủ công
        ReflectionTestUtils.setField(controller, "frontendBaseUrl", "http://localhost:5173");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Tạo Booking mock với commissionRate tùy chỉnh */
    private Booking mockBooking(BookingStatus status, double commissionRate) {
        User partner = mock(User.class);
        when(partner.getId()).thenReturn(PARTNER_ID);
        when(partner.getEmail()).thenReturn("partner@test.com");

        User owner = mock(User.class);
        when(owner.getEmail()).thenReturn("owner@test.com");
        when(owner.getFullName()).thenReturn("Owner Test");

        Hotel hotel = mock(Hotel.class);
        when(hotel.getPartner()).thenReturn(partner);
        when(hotel.getName()).thenReturn("Hotel Test");

        RoomType roomType = mock(RoomType.class);
        when(roomType.getName()).thenReturn("Room Test");

        Booking b = mock(Booking.class);
        when(b.getId()).thenReturn(BOOKING_ID);
        when(b.getStatus()).thenReturn(status);
        when(b.getTotalAmount()).thenReturn(TOTAL);
        when(b.getCommissionRate()).thenReturn(commissionRate);
        when(b.getHotel()).thenReturn(hotel);
        when(b.getOwner()).thenReturn(owner);
        when(b.getRoomType()).thenReturn(roomType);
        when(b.getInvoiceNumber()).thenReturn("INV-123456789");
        when(b.getCheckInDate()).thenReturn(java.time.LocalDate.now());
        when(b.getCheckOutDate()).thenReturn(java.time.LocalDate.now().plusDays(2));
        return b;
    }

    /** Tạo Payment mock ở trạng thái cho trước */
    private Payment mockPayment(PaymentStatus status, Booking booking) {
        Payment p = mock(Payment.class);
        when(p.getPaymentStatus()).thenReturn(status);
        when(p.getGatewayReferenceId()).thenReturn(String.valueOf(ORDER_CODE));
        when(p.getBooking()).thenReturn(booking);
        return p;
    }

    /**
     * Tạo PartnerWallet thực (không mock) để assert giá trị balance trực tiếp.
     * Ghi chú: @Builder.Default với Lombok chỉ có tác dụng qua builder(),
     * dùng new PartnerWallet() thì field có thể là null → set explicit.
     */
    private PartnerWallet realWallet(BigDecimal balance, BigDecimal pending) {
        PartnerWallet w = new PartnerWallet();
        w.setBalance(balance);
        w.setPendingBalance(pending);
        return w;
    }

    /** Payload JSON giống như PayOS gửi đến /api/payment/payos-webhook */
    private Map<String, Object> buildPayload(String outerCode, long orderCode) {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode",           orderCode);
        data.put("amount",              280000);
        data.put("description",         "PC" + orderCode);
        data.put("accountNumber",       "1234567890");
        data.put("reference",           "REF001");
        data.put("transactionDateTime", "2026-06-17 10:00:00");
        data.put("currency",            "VND");
        data.put("paymentLinkId",       "link_001");
        data.put("code",                outerCode);
        data.put("desc",                "Thanh toan thanh cong");
        // Counter/virtual account fields — null OK
        data.put("counterAccountBankId",    null);
        data.put("counterAccountBankName",  null);
        data.put("counterAccountName",      null);
        data.put("counterAccountNumber",    null);
        data.put("virtualAccountName",      null);
        data.put("virtualAccountNumber",    null);

        Map<String, Object> payload = new HashMap<>();
        payload.put("code",      outerCode);
        payload.put("desc",      "Thanh toan thanh cong");
        payload.put("success",   "00".equals(outerCode));
        payload.put("signature", "PLACEHOLDER_SIG");
        payload.put("data",      data);
        return payload;
    }

    /** Trả về WebhookData đã được "xác thực" (mock kết quả từ payOS.webhooks().verify) */
    private WebhookData verifiedOk(long orderCode) {
        return WebhookData.builder()
                .orderCode(orderCode)
                .amount(280000L)
                .description("PC" + orderCode)
                .accountNumber("1234567890")
                .reference("REF001")
                .transactionDateTime("2026-06-17 10:00:00")
                .currency("VND")
                .paymentLinkId("link_001")
                .code("00")
                .desc("Thanh toan thanh cong")
                .build();
    }

    // ─── TEST A ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[A] Webhook hợp lệ code=00 → booking CONFIRMED, payment SUCCESS, pendingBalance > 0")
    void A_validWebhook_confirmsBookingAndCreditsWallet() throws Exception {
        Booking booking = mockBooking(BookingStatus.PENDING, 0.15);
        Payment payment = mockPayment(PaymentStatus.PENDING, booking);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, BigDecimal.ZERO);

        when(payOS.webhooks().verify(any())).thenReturn(verifiedOk(ORDER_CODE));
        when(paymentRepository.findByGatewayReferenceId(String.valueOf(ORDER_CODE)))
                .thenReturn(Optional.of(payment));
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID))
                .thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = controller.handleWebhook(buildPayload("00", ORDER_CODE));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(booking).setStatus(BookingStatus.CONFIRMED);
        verify(payment).setPaymentStatus(PaymentStatus.SUCCESS);
        assertThat(wallet.getPendingBalance())
                .as("pendingBalance phải > 0 sau khi thanh toán thành công")
                .isGreaterThan(BigDecimal.ZERO);
    }

    // ─── TEST B ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[B] ⚠️ BUG-2: Chữ ký sai → phải trả HTTP 200, đang trả 400 → PayOS retry vô hạn")
    void B_invalidSignature_shouldReturn200ToPreventInfiniteRetry() throws Exception {
        // payOS.verify() ném RuntimeException khi signature sai
        // (SDK throws unchecked exception — dùng RuntimeException để Mockito không báo lỗi checked)
        when(payOS.webhooks().verify(any())).thenThrow(new RuntimeException("Invalid checksum signature"));

        ResponseEntity<?> resp = controller.handleWebhook(buildPayload("00", ORDER_CODE));

        // PayOS spec: luôn trả HTTP 200 kể cả khi xử lý thất bại.
        // Nếu server trả 4xx, PayOS sẽ retry webhook vô số lần.
        // *** TEST NÀY SẼ FAIL vì code đang trả HttpStatus.BAD_REQUEST ***
        assertThat(resp.getStatusCode())
                .as("BUG-2: handleWebhook phải trả HTTP 200 khi exception, không phải 400. "
                  + "HTTP 400 → PayOS retry liên tục gây nhiễu log và risk cộng ví trùng.")
                .isEqualTo(HttpStatus.OK);

        // Dù lỗi chữ ký, KHÔNG được thay đổi state
        verify(paymentRepository,      never()).save(any());
        verify(bookingRepository,       never()).save(any());
        verify(partnerWalletRepository, never()).save(any());
    }

    // ─── TEST C ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[C] Webhook trùng (payment đã SUCCESS) → idempotent, ví KHÔNG cộng lần 2")
    void C_duplicateWebhook_isIdempotent() throws Exception {
        // Simulate: lần đầu đã xử lý xong
        Booking booking = mockBooking(BookingStatus.CONFIRMED, 0.15);
        Payment payment = mockPayment(PaymentStatus.SUCCESS, booking); // đã SUCCESS

        when(payOS.webhooks().verify(any())).thenReturn(verifiedOk(ORDER_CODE));
        when(paymentRepository.findByGatewayReferenceId(String.valueOf(ORDER_CODE)))
                .thenReturn(Optional.of(payment));

        // Gọi webhook lần 2
        ResponseEntity<?> resp = controller.handleWebhook(buildPayload("00", ORDER_CODE));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Guard condition: payment.status == PENDING → không thỏa, skip toàn bộ
        verify(partnerWalletRepository, never()).findByPartnerId(any());
        verify(partnerWalletRepository, never()).save(any());
        verify(bookingRepository,       never()).save(any());
    }

    // ─── TEST D ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[D] Webhook dùng booking.commissionRate snapshot — rate 10% → partner nhận 90% = 252000 VNĐ")
    void D_partnerShare_mustRespectSnapshotCommissionRate() throws Exception {
        // snapshotRate = 0.10 (khác default 0.08) để chứng minh code đọc từ snapshot
        double snapshotRate = 0.10;
        BigDecimal expectedShare = new BigDecimal("252000"); // 280000 × (1 - 0.10)

        Booking booking = mockBooking(BookingStatus.PENDING, snapshotRate);
        Payment payment  = mockPayment(PaymentStatus.PENDING, booking);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, BigDecimal.ZERO);

        when(payOS.webhooks().verify(any())).thenReturn(verifiedOk(ORDER_CODE));
        when(paymentRepository.findByGatewayReferenceId(String.valueOf(ORDER_CODE)))
                .thenReturn(Optional.of(payment));
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID))
                .thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        controller.handleWebhook(buildPayload("00", ORDER_CODE));

        BigDecimal actualCredited = wallet.getPendingBalance();

        assertThat(actualCredited)
                .as("partnerShare phải = 252000 VNĐ (rate snapshot 10%%, không hardcode 8%%)")
                .isEqualByComparingTo(expectedShare);

        // Accounting identity: commissionFee + partnerShare = totalAmount
        BigDecimal impliedCommission = TOTAL.subtract(actualCredited);
        assertThat(impliedCommission)
                .as("commissionFee = total − partnerShare phải = 28000 VNĐ (10%% × 280000)")
                .isEqualByComparingTo(TOTAL.multiply(BigDecimal.valueOf(snapshotRate)));
    }

    // ─── TEST E ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[E] ⚠️ BUG-2b: orderCode không tồn tại → phải trả HTTP 200, đang trả 400")
    void E_orderCodeNotFound_shouldReturn200NotRetry() throws Exception {
        when(payOS.webhooks().verify(any())).thenReturn(verifiedOk(ORDER_CODE));
        when(paymentRepository.findByGatewayReferenceId(String.valueOf(ORDER_CODE)))
                .thenReturn(Optional.empty()); // không tìm thấy

        ResponseEntity<?> resp = controller.handleWebhook(buildPayload("00", ORDER_CODE));

        // AppException("Không tìm thấy giao dịch") bị catch → trả 400
        // *** TEST NÀY SẼ FAIL ***
        assertThat(resp.getStatusCode())
                .as("BUG-2b: AppException khi not-found bị catch và trả HTTP 400. "
                  + "PayOS sẽ retry webhook đó vô hạn. Phải trả HTTP 200 với success=false.")
                .isEqualTo(HttpStatus.OK);
    }

    // ─── TEST F ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[F] Webhook code != 00 (ví dụ user hủy) → KHÔNG xử lý, trả HTTP 200")
    void F_nonSuccessCode_skipsProcessing() throws Exception {
        // Simulate: payOS.verify() trả verifiedData nhưng code = "01" (không thành công)
        WebhookData cancelData = WebhookData.builder()
                .orderCode(ORDER_CODE).amount(280000L).description("PC" + ORDER_CODE)
                .accountNumber("123").reference("REF").transactionDateTime("2026")
                .currency("VND").paymentLinkId("link").code("01").desc("Cancelled").build();

        when(payOS.webhooks().verify(any())).thenReturn(cancelData);

        ResponseEntity<?> resp = controller.handleWebhook(buildPayload("01", ORDER_CODE));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Code "01" → không vào nhánh "00" → không save payment/booking
        verify(paymentRepository,      never()).save(any());
        verify(bookingRepository,       never()).save(any());
        verify(partnerWalletRepository, never()).save(any());
    }

    // ─── TEST G ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[G] verifyPaymentStatus: không có PENDING payment → trả về sớm, không cộng ví")
    void G_verifyPaymentStatus_noPendingPayment_returnsEarly() throws Exception {
        // Payment đã SUCCESS (từ webhook trước đó) → stream filter PENDING trả empty
        Booking booking = mockBooking(BookingStatus.CONFIRMED, 0.15);
        Payment payment = mockPayment(PaymentStatus.SUCCESS, booking);

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(BOOKING_ID)).thenReturn(List.of(payment));
        // payOS.paymentRequests().get() KHÔNG nên được gọi khi không có PENDING payment

        ResponseEntity<?> resp = controller.verifyPaymentStatus(BOOKING_ID);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(partnerWalletRepository, never()).save(any());
        // Vì không có PENDING payment, code trả về sớm mà không gọi payOS
        verify(payOS.paymentRequests(), never()).get(anyLong());
    }

    // ─── TEST H ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[H] Điểm 1/7: 'code' được đọc từ verifiedData (sau xác thực), không phải body thô")
    void H_webhookCode_readFromVerifiedData_notRawPayload() throws Exception {
        // Body thô có code="00" nhưng verifiedData.code="01" (simulate tampered payload)
        // → phải xử lý như thất bại (code "01"), không thành công
        WebhookData tamperedVerified = WebhookData.builder()
                .orderCode(ORDER_CODE).amount(280000L).description("PC" + ORDER_CODE)
                .accountNumber("123").reference("REF").transactionDateTime("2026")
                .currency("VND").paymentLinkId("link").code("01").desc("Cancelled").build();

        when(payOS.webhooks().verify(any())).thenReturn(tamperedVerified);
        // Kể cả body ngoài có code="00", nhưng verifiedData.code="01" → skip

        controller.handleWebhook(buildPayload("00", ORDER_CODE));

        // verifiedData.code = "01" → không vào nhánh xử lý thành công
        verify(paymentRepository,      never()).save(any());
        verify(partnerWalletRepository, never()).save(any());
    }

    // ─── TEST I ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[I] partnerShare có setScale(0, HALF_UP) → VNĐ không có số lẻ")
    void I_partnerShare_hasCorrectScale() throws Exception {
        // rate=0.08 → commissionFee = 280000×0.08 = 22400 (scale=0), partnerShare = 257600 (scale=0)
        Booking booking = mockBooking(BookingStatus.PENDING, 0.08);
        Payment payment  = mockPayment(PaymentStatus.PENDING, booking);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, BigDecimal.ZERO);

        when(payOS.webhooks().verify(any())).thenReturn(verifiedOk(ORDER_CODE));
        when(paymentRepository.findByGatewayReferenceId(String.valueOf(ORDER_CODE)))
                .thenReturn(Optional.of(payment));
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID))
                .thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        controller.handleWebhook(buildPayload("00", ORDER_CODE));

        BigDecimal credited = wallet.getPendingBalance();

        // VNĐ không có lẻ → scale phải = 0
        assertThat(credited.scale())
                .as("partnerShare phải có scale=0 (VNĐ). "
                  + "Giá trị: %s, scale: %d", credited.toPlainString(), credited.scale())
                .isEqualTo(0);

        assertThat(credited)
                .as("partnerShare = 257600 VNĐ (280000 × 92%%)")
                .isEqualByComparingTo(new BigDecimal("257600"));
    }

    // ─── TEST J ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[J] verifyPaymentStatus PAID dùng booking.commissionRate snapshot — rate 10% → 252000")
    void J_verifyPaymentStatus_usesSnapshotCommissionRate() throws Exception {
        double snapshotRate  = 0.10;
        BigDecimal expectedShare = new BigDecimal("252000"); // 280000 × 0.90

        Booking booking = mockBooking(BookingStatus.PENDING, snapshotRate);
        Payment payment  = mockPayment(PaymentStatus.PENDING, booking);
        PartnerWallet wallet = realWallet(BigDecimal.ZERO, BigDecimal.ZERO);

        PaymentLink infoMock = mock(PaymentLink.class);
        when(infoMock.getStatus()).thenReturn(PaymentLinkStatus.PAID);

        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(BOOKING_ID)).thenReturn(List.of(payment));
        when(payOS.paymentRequests().get(anyLong())).thenReturn(infoMock);
        when(partnerWalletRepository.findByPartnerId(PARTNER_ID)).thenReturn(Optional.of(wallet));
        when(partnerWalletRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(paymentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> resp = controller.verifyPaymentStatus(BOOKING_ID);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // partnerShare phải dùng snapshotRate, không phải 0.92 cứng
        assertThat(wallet.getPendingBalance())
                .as("partnerShare phải = 252000 (rate snapshot 10%%, không hardcode 0.92)")
                .isEqualByComparingTo(expectedShare);

        // Accounting identity: commissionFee + partnerShare = totalAmount
        BigDecimal impliedCommission = TOTAL.subtract(wallet.getPendingBalance());
        assertThat(impliedCommission)
                .as("commissionFee = 28000 (10%% × 280000)")
                .isEqualByComparingTo(TOTAL.multiply(BigDecimal.valueOf(snapshotRate))
                        .setScale(0, java.math.RoundingMode.HALF_UP));
    }
}
