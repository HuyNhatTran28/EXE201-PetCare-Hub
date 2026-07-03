package com.petcare_hub.controller;

import com.petcare_hub.entity.Booking;
import com.petcare_hub.entity.Payment;
import com.petcare_hub.entity.PartnerWallet;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.enums.PaymentMethod;
import com.petcare_hub.enums.PaymentStatus;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.repository.PaymentRepository;
import com.petcare_hub.repository.PartnerWalletRepository;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.service.AsyncEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final PartnerWalletRepository partnerWalletRepository;
    private final PayOS payOS;
    private final AsyncEmailService asyncEmailService;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    private static final AtomicLong orderCodeGenerator = new AtomicLong(System.currentTimeMillis() % 1_000_000_000L);

    @PostMapping("/create-payment-link")
    @Transactional
    public ResponseEntity<?> createPaymentLink(@RequestBody Map<String, String> request) {
        String bookingIdStr = request.get("bookingId");
        if (bookingIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId is required"));
        }
        UUID bookingId = UUID.fromString(bookingIdStr);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException("Không tìm thấy booking", HttpStatus.NOT_FOUND));

        if (booking.getStatus() != BookingStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ có thể thanh toán cho booking ở trạng thái PENDING"));
        }

        // orderCode must fit in a long and be reasonable length
        long orderCode = orderCodeGenerator.incrementAndGet();

        // 1. Create and Save Payment transaction
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentMethod(PaymentMethod.VIETQR);
        payment.setPaymentMethodLabel("VietQR (payOS)");
        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setGatewayReferenceId(String.valueOf(orderCode));
        payment.setAmountPaid(booking.getTotalAmount());
        payment.setQrExpiresAt(LocalDateTime.now().plusMinutes(15));
        paymentRepository.save(payment);

        // 2. Call payOS to create payment link
        String returnUrl = frontendBaseUrl + "/payment-result?status=success&bookingId=" + booking.getId();
        String cancelUrl = frontendBaseUrl + "/payment-result?status=cancelled&bookingId=" + booking.getId();

        // description must be ≤ 25 chars, no special characters
        String description = "PetCare " + orderCode;
        if (description.length() > 25) {
            description = "PC" + orderCode;
        }

        CreatePaymentLinkRequest paymentData = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(booking.getTotalAmount().longValue())
                .description(description)
                .cancelUrl(cancelUrl)
                .returnUrl(returnUrl)
                .build();

        try {
            CreatePaymentLinkResponse response = payOS.paymentRequests().create(paymentData);
            Map<String, Object> result = new HashMap<>();
            result.put("checkoutUrl", response.getCheckoutUrl());
            result.put("orderCode", orderCode);
            result.put("qrCode", response.getQrCode());
            result.put("bin", response.getBin());
            result.put("accountNumber", response.getAccountNumber());
            result.put("accountName", response.getAccountName());
            result.put("amount", response.getAmount());
            result.put("description", response.getDescription());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Lỗi khi tạo payment link với payOS: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi hệ thống khi tạo link thanh toán: " + e.getMessage()));
        }
    }

    @GetMapping("/verify/{bookingId}")
    @Transactional
    public ResponseEntity<?> verifyPaymentStatus(@PathVariable UUID bookingId) {
        log.info("Kiểm tra trạng thái thanh toán từ payOS cho booking: {}", bookingId);
        try {
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new AppException("Không tìm thấy booking", HttpStatus.NOT_FOUND));

            // Tìm Payment gần nhất của Booking này ở trạng thái PENDING
            java.util.List<Payment> payments = paymentRepository.findByBookingId(bookingId);
            Payment payment = payments.stream()
                    .filter(p -> p.getPaymentStatus() == PaymentStatus.PENDING)
                    .findFirst()
                    .orElse(null);

            if (payment == null) {
                return ResponseEntity.ok(Map.of(
                        "bookingStatus", booking.getStatus().toString(),
                        "message", "Không có giao dịch thanh toán PENDING"
                ));
            }

            long orderCode = Long.parseLong(payment.getGatewayReferenceId());
            var info = payOS.paymentRequests().get(orderCode);
            log.info("Trạng thái từ payOS cho orderCode {}: {}", orderCode, info.getStatus());

            if (PaymentLinkStatus.PAID == info.getStatus()) {
                if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
                    payment.setPaymentStatus(PaymentStatus.SUCCESS);
                    payment.setPaidAt(LocalDateTime.now());
                    paymentRepository.save(payment);

                    if (booking.getStatus() == BookingStatus.PENDING) {
                        booking.setStatus(BookingStatus.CONFIRMED);
                        bookingRepository.save(booking);

                        asyncEmailService.sendConfirmEmailAsync(
                            booking.getInvoiceNumber(),
                            booking.getOwner().getEmail(),
                            booking.getOwner().getFullName(),
                            booking.getHotel().getName(),
                            booking.getRoomType().getName(),
                            booking.getCheckInDate(),
                            booking.getCheckOutDate(),
                            booking.getTotalAmount()
                        );

                        BigDecimal totalAmount = booking.getTotalAmount();
                        BigDecimal commissionFee = totalAmount
                                .multiply(BigDecimal.valueOf(booking.getCommissionRate()))
                                .setScale(0, RoundingMode.HALF_UP);
                        BigDecimal partnerShare = totalAmount.subtract(commissionFee).setScale(0, RoundingMode.HALF_UP);

                        com.petcare_hub.entity.User partner = booking.getHotel().getPartner();
                        if (partner != null) {
                            PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partner.getId())
                                    .orElseGet(() -> {
                                        PartnerWallet newWallet = new PartnerWallet();
                                        newWallet.setPartner(partner);
                                        newWallet.setBalance(BigDecimal.ZERO);
                                        newWallet.setPendingBalance(BigDecimal.ZERO);
                                        return partnerWalletRepository.save(newWallet);
                                    });
                            wallet.setPendingBalance(wallet.getPendingBalance().add(partnerShare));
                            partnerWalletRepository.save(wallet);
                            log.info("Cộng {} VNĐ vào pendingBalance của đối tác {}", partnerShare, partner.getEmail());
                        }
                    }
                }
            } else if (PaymentLinkStatus.CANCELLED == info.getStatus() || PaymentLinkStatus.EXPIRED == info.getStatus()) {
                payment.setPaymentStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
                if (booking.getStatus() == BookingStatus.PENDING) {
                    booking.setStatus(BookingStatus.CANCELLED);
                    bookingRepository.save(booking);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "bookingStatus", booking.getStatus().toString(),
                    "paymentStatus", payment.getPaymentStatus().toString()
            ));
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra trạng thái thanh toán từ payOS: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi kiểm tra trạng thái: " + e.getMessage()));
        }
    }

    @PostMapping("/payos-webhook")
    @Transactional
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Nhận webhook payOS: {}", payload);
        try {
            String code = (String) payload.get("code");
            String desc = (String) payload.get("desc");
            Boolean success = (Boolean) payload.get("success");
            String signature = (String) payload.get("signature");

            @SuppressWarnings("unchecked")
            Map<String, Object> dataMap = (Map<String, Object>) payload.get("data");
            if (dataMap == null) {
                log.warn("Webhook PayOS thiếu field 'data', bỏ qua");
                return ResponseEntity.ok(Map.of("success", false, "message", "Data field is required"));
            }

            Long orderCode = Long.valueOf(dataMap.get("orderCode").toString());
            Integer amount = ((Number) dataMap.get("amount")).intValue();
            String description = (String) dataMap.get("description");
            String accountNumber = (String) dataMap.get("accountNumber");
            String reference = (String) dataMap.get("reference");
            String transactionDateTime = (String) dataMap.get("transactionDateTime");
            String currency = (String) dataMap.get("currency");
            String paymentLinkId = (String) dataMap.get("paymentLinkId");
            String dataCode = (String) dataMap.get("code");
            String dataDesc = (String) dataMap.get("desc");

            String counterAccountBankId = (String) dataMap.get("counterAccountBankId");
            String counterAccountBankName = (String) dataMap.get("counterAccountBankName");
            String counterAccountName = (String) dataMap.get("counterAccountName");
            String counterAccountNumber = (String) dataMap.get("counterAccountNumber");
            String virtualAccountName = (String) dataMap.get("virtualAccountName");
            String virtualAccountNumber = (String) dataMap.get("virtualAccountNumber");

            WebhookData webhookData = WebhookData.builder()
                    .orderCode(orderCode)
                    .amount((long) amount)
                    .description(description)
                    .accountNumber(accountNumber)
                    .reference(reference)
                    .transactionDateTime(transactionDateTime)
                    .currency(currency)
                    .paymentLinkId(paymentLinkId)
                    .code(dataCode)
                    .desc(dataDesc)
                    .counterAccountBankId(counterAccountBankId)
                    .counterAccountBankName(counterAccountBankName)
                    .counterAccountName(counterAccountName)
                    .counterAccountNumber(counterAccountNumber)
                    .virtualAccountName(virtualAccountName)
                    .virtualAccountNumber(virtualAccountNumber)
                    .build();

            Webhook webhook = Webhook.builder()
                    .code(code)
                    .desc(desc)
                    .success(success)
                    .data(webhookData)
                    .signature(signature)
                    .build();

            WebhookData verifiedData = payOS.webhooks().verify(webhook);
            log.info("Xác thực webhook thành công cho orderCode: {}", verifiedData.getOrderCode());

            if ("00".equals(verifiedData.getCode())) {
                Payment payment = paymentRepository.findByGatewayReferenceId(String.valueOf(verifiedData.getOrderCode()))
                        .orElseThrow(() -> new AppException("Không tìm thấy giao dịch thanh toán", HttpStatus.NOT_FOUND));

                if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
                    payment.setPaymentStatus(PaymentStatus.SUCCESS);
                    payment.setPaidAt(LocalDateTime.now());
                    paymentRepository.save(payment);

                    Booking bookedItem = payment.getBooking();
                    if (bookedItem.getStatus() == BookingStatus.PENDING) {
                        bookedItem.setStatus(BookingStatus.CONFIRMED);
                        bookingRepository.save(bookedItem);

                        asyncEmailService.sendConfirmEmailAsync(
                            bookedItem.getInvoiceNumber(),
                            bookedItem.getOwner().getEmail(),
                            bookedItem.getOwner().getFullName(),
                            bookedItem.getHotel().getName(),
                            bookedItem.getRoomType().getName(),
                            bookedItem.getCheckInDate(),
                            bookedItem.getCheckOutDate(),
                            bookedItem.getTotalAmount()
                        );

                        BigDecimal totalAmount = bookedItem.getTotalAmount();
                        BigDecimal commissionFee = totalAmount
                                .multiply(BigDecimal.valueOf(bookedItem.getCommissionRate()))
                                .setScale(0, RoundingMode.HALF_UP);
                        BigDecimal partnerShare = totalAmount.subtract(commissionFee).setScale(0, RoundingMode.HALF_UP);

                        com.petcare_hub.entity.User partner = bookedItem.getHotel().getPartner();
                        if (partner != null) {
                            PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partner.getId())
                                    .orElseGet(() -> {
                                        PartnerWallet newWallet = new PartnerWallet();
                                        newWallet.setPartner(partner);
                                        newWallet.setBalance(BigDecimal.ZERO);
                                        newWallet.setPendingBalance(BigDecimal.ZERO);
                                        return partnerWalletRepository.save(newWallet);
                                    });
                            wallet.setPendingBalance(wallet.getPendingBalance().add(partnerShare));
                            partnerWalletRepository.save(wallet);
                            log.info("Cộng {} VNĐ vào pendingBalance của đối tác {}", partnerShare, partner.getEmail());
                        }
                    }
                }
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Lỗi xử lý webhook payOS (vẫn ack 200 để PayOS không retry): ", e);
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
