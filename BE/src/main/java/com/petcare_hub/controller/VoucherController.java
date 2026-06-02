package com.petcare_hub.controller;

import com.petcare_hub.entity.Voucher;
import com.petcare_hub.enums.VoucherStatus;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.VoucherRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@Tag(name = "Voucher")
public class VoucherController {

    private final VoucherRepository voucherRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Voucher>> getAllVouchers(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(voucherRepository.findAll(pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Voucher> createVoucher(@RequestBody Voucher voucher) {
        // Default values for new voucher
        if (voucher.getCurrentUsageCount() == null) {
            voucher.setCurrentUsageCount(0);
        }
        return ResponseEntity.status(201).body(voucherRepository.save(voucher));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Voucher> updateStatus(
            @PathVariable UUID id,
            @RequestParam VoucherStatus status) {
        Voucher v = voucherRepository.findById(id)
            .orElseThrow(() -> new AppException("Không tìm thấy voucher", HttpStatus.NOT_FOUND));
        v.setVoucherStatus(status);
        return ResponseEntity.ok(voucherRepository.save(v));
    }
}
