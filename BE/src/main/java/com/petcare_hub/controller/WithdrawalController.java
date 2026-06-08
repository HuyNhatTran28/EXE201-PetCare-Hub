package com.petcare_hub.controller;

import com.petcare_hub.entity.User;
import com.petcare_hub.entity.PartnerWallet;
import com.petcare_hub.entity.WithdrawalRequest;
import com.petcare_hub.enums.WithdrawalStatus;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.repository.PartnerWalletRepository;
import com.petcare_hub.repository.WithdrawalRequestRepository;
import com.petcare_hub.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class WithdrawalController {

    private final UserRepository userRepository;
    private final PartnerWalletRepository partnerWalletRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    // ── Partner Wallet ──────────────────────────────────────────
    @GetMapping("/partner/wallet")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<?> getPartnerWallet(Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partnerId)
                .orElseGet(() -> {
                    User partner = userRepository.findById(partnerId)
                            .orElseThrow(() -> new AppException("Không tìm thấy đối tác", HttpStatus.NOT_FOUND));
                    PartnerWallet newWallet = PartnerWallet.builder()
                            .partner(partner)
                            .balance(BigDecimal.ZERO)
                            .pendingBalance(BigDecimal.ZERO)
                            .build();
                    return partnerWalletRepository.save(newWallet);
                });

        Map<String, Object> result = new HashMap<>();
        result.put("balance", wallet.getBalance());
        result.put("pendingBalance", wallet.getPendingBalance());
        return ResponseEntity.ok(result);
    }

    // ── Submit Withdrawal Request ────────────────────────────────
    @PostMapping("/partner/withdraw")
    @PreAuthorize("hasRole('PARTNER')")
    @Transactional
    public ResponseEntity<?> requestWithdrawal(@RequestBody Map<String, Object> request, Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        String bankName = (String) request.get("bankName");
        String bankAccountNumber = (String) request.get("bankAccountNumber");
        String bankAccountName = (String) request.get("bankAccountName");

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số tiền rút phải lớn hơn 0"));
        }

        PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new AppException("Không tìm thấy ví của đối tác", HttpStatus.NOT_FOUND));

        if (wallet.getBalance().compareTo(amount) < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số dư khả dụng không đủ"));
        }

        User partner = wallet.getPartner();

        // Freeze amount
        wallet.setBalance(wallet.getBalance().subtract(amount));
        partnerWalletRepository.save(wallet);

        // Create Withdrawal request
        WithdrawalRequest withdrawalRequest = WithdrawalRequest.builder()
                .partner(partner)
                .amount(amount)
                .bankName(bankName)
                .bankAccountNumber(bankAccountNumber)
                .bankAccountName(bankAccountName)
                .status(WithdrawalStatus.PENDING)
                .build();
        withdrawalRequestRepository.save(withdrawalRequest);

        log.info("Đối tác {} yêu cầu rút {} VNĐ", partner.getEmail(), amount);
        return ResponseEntity.ok(Map.of("success", true, "message", "Gửi yêu cầu rút tiền thành công"));
    }

    // ── Get Partner Withdrawal Logs ─────────────────────────────
    @GetMapping("/partner/withdrawals")
    @PreAuthorize("hasRole('PARTNER')")
    public ResponseEntity<?> getPartnerWithdrawalLogs(Authentication auth) {
        UUID partnerId = (UUID) auth.getPrincipal();
        List<WithdrawalRequest> requests = withdrawalRequestRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId);

        List<Map<String, Object>> response = requests.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("amount", r.getAmount());
            map.put("bankName", r.getBankName());
            map.put("bankAccountNumber", r.getBankAccountNumber());
            map.put("bankAccountName", r.getBankAccountName());
            map.put("status", r.getStatus());
            map.put("receiptImageUrl", r.getReceiptImageUrl());
            map.put("createdAt", r.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ── Get All Requests (Admin) ───────────────────────────────
    @GetMapping("/admin/withdrawals")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAdminWithdrawalLogs(
            @RequestParam(required = false) WithdrawalStatus status) {
        List<WithdrawalRequest> requests;
        if (status != null) {
            requests = withdrawalRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            requests = withdrawalRequestRepository.findAll().stream()
                    .sorted(Comparator.comparing(WithdrawalRequest::getCreatedAt).reversed())
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> response = requests.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("amount", r.getAmount());
            map.put("bankName", r.getBankName());
            map.put("bankAccountNumber", r.getBankAccountNumber());
            map.put("bankAccountName", r.getBankAccountName());
            map.put("status", r.getStatus());
            map.put("receiptImageUrl", r.getReceiptImageUrl());
            map.put("createdAt", r.getCreatedAt());
            map.put("partnerName", r.getPartner().getFullName());
            map.put("partnerEmail", r.getPartner().getEmail());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ── Approve Request (Admin) ──────────────────────────────────
    @PostMapping("/admin/withdrawals/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> approveWithdrawal(@PathVariable UUID id, @RequestBody Map<String, String> requestBody) {
        String receiptImageUrl = requestBody.get("receiptImageUrl");
        if (receiptImageUrl == null || receiptImageUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hình ảnh hóa đơn chuyển khoản là bắt buộc"));
        }

        WithdrawalRequest request = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException("Không tìm thấy yêu cầu rút tiền", HttpStatus.NOT_FOUND));

        if (request.getStatus() != WithdrawalStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Yêu cầu này đã được xử lý trước đó"));
        }

        request.setStatus(WithdrawalStatus.APPROVED);
        request.setReceiptImageUrl(receiptImageUrl);
        withdrawalRequestRepository.save(request);

        log.info("Admin đã duyệt yêu cầu rút tiền {} cho đối tác {}, hóa đơn: {}", id, request.getPartner().getEmail(), receiptImageUrl);
        return ResponseEntity.ok(Map.of("success", true, "message", "Duyệt yêu cầu rút tiền thành công"));
    }

    // ── Reject Request (Admin) ──────────────────────────────────
    @PostMapping("/admin/withdrawals/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> rejectWithdrawal(@PathVariable UUID id) {
        WithdrawalRequest request = withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException("Không tìm thấy yêu cầu rút tiền", HttpStatus.NOT_FOUND));

        if (request.getStatus() != WithdrawalStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Yêu cầu này đã được xử lý trước đó"));
        }

        request.setStatus(WithdrawalStatus.REJECTED);
        withdrawalRequestRepository.save(request);

        // Refund money back to balance
        UUID partnerId = request.getPartner().getId();
        PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new AppException("Không tìm thấy ví của đối tác", HttpStatus.NOT_FOUND));
        wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        partnerWalletRepository.save(wallet);

        log.info("Admin đã từ chối yêu cầu rút tiền {} cho đối tác {}", id, request.getPartner().getEmail());
        return ResponseEntity.ok(Map.of("success", true, "message", "Từ chối yêu cầu rút tiền thành công"));
    }
}
