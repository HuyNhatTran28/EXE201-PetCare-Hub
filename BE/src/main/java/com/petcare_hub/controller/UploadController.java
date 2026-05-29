package com.petcare_hub.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "Upload", description = "Upload ảnh lên Cloudinary")
public class UploadController {

    private final Cloudinary cloudinary;

    @Operation(summary = "Upload 1 ảnh")
    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        try {
            var result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "petcare-hub",
                    "resource_type", "image"
                )
            );
            String url = (String) result.get("secure_url");
            log.info("Upload ảnh thành công: {}", url);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            log.error("Upload ảnh thất bại: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Upload thất bại"));
        }
    }
}
