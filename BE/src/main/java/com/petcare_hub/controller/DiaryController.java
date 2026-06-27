package com.petcare_hub.controller;

import com.petcare_hub.dto.response.DiaryResponse;
import com.petcare_hub.service.DiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/diaries")
@RequiredArgsConstructor
@Tag(name = "Diary", description = "Quản lý nhật ký chăm sóc thú cưng")
public class DiaryController {

    private final DiaryService diaryService;

    @Operation(summary = "Lấy danh sách nhật ký của một thú cưng cụ thể")
    @GetMapping("/pet/{petId}")
    public ResponseEntity<List<DiaryResponse>> getDiariesByPet(
            @PathVariable UUID petId) {
        return ResponseEntity.ok(diaryService.getDiariesByPet(petId));
    }

    @Operation(summary = "Lấy tất cả nhật ký của tất cả các bé cưng thuộc về chủ nuôi hiện tại")
    @GetMapping("/my")
    public ResponseEntity<List<DiaryResponse>> getMyDiaries(
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.getDiariesByOwner(ownerId));
    }
}
