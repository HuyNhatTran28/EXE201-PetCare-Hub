package com.petcare_hub.controller;

import com.petcare_hub.service.KycService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/merchant/kyc")
@RequiredArgsConstructor
@Tag(name = "KYC Merchant API", description = "API xác thực danh tính điện tử VNPT eKYC")
public class KycController {

    private final KycService kycService;

    @Operation(summary = "Xác thực danh tính đối tác (eKYC)")
    @PostMapping("/verify")
    public ResponseEntity<?> verifyMerchantKyc(
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage,
            @RequestParam("selfieImage") MultipartFile selfieImage) {

        try {
            Map<String, Object> result = kycService.processKyc(frontImage, backImage, selfieImage);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Lỗi xử lý hệ thống eKYC: " + e.getMessage());
            return ResponseEntity.status(500).body(errorMap);
        }
    }
}
