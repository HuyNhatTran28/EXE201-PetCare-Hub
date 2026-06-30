package com.petcare_hub.controller;

import com.petcare_hub.dto.request.DiaryRequest;
import com.petcare_hub.dto.response.DiaryResponse;
import com.petcare_hub.service.DiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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
            @PathVariable UUID petId,
            Authentication authentication) {
        UUID currentUserId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.getDiariesByPet(petId, currentUserId));
    }

    @Operation(summary = "Lấy tất cả nhật ký của tất cả các bé cưng thuộc về chủ nuôi hiện tại")
    @GetMapping("/my")
    public ResponseEntity<List<DiaryResponse>> getMyDiaries(
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.getDiariesByOwner(ownerId, ownerId));
    }

    @Operation(summary = "Tạo nhật ký chăm sóc thú cưng mới (dành cho Staff hoặc Partner)")
    @PostMapping
    public ResponseEntity<DiaryResponse> createDiary(
            @RequestBody @jakarta.validation.Valid DiaryRequest request,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.createDiary(userId, request));
    }

    @Operation(summary = "Thả cảm xúc / Thích bài viết nhật ký")
    @PostMapping("/{diaryId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable UUID diaryId,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.toggleReaction(userId, diaryId));
    }

    @Operation(summary = "Bình luận vào bài viết nhật ký")
    @PostMapping("/{diaryId}/comment")
    public ResponseEntity<DiaryResponse.CommentResponse> addComment(
            @PathVariable UUID diaryId,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        String content = body.get("content");
        return ResponseEntity.ok(diaryService.addComment(userId, diaryId, content));
    }

    @Operation(summary = "Sửa bài viết nhật ký")
    @PutMapping("/{diaryId}")
    public ResponseEntity<DiaryResponse> updateDiary(
            @PathVariable UUID diaryId,
            @RequestBody @jakarta.validation.Valid DiaryRequest request,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(diaryService.updateDiary(userId, diaryId, request));
    }

    @Operation(summary = "Xóa bài viết nhật ký (Chỉ dành cho Partner/Chủ khách sạn)")
    @DeleteMapping("/{diaryId}")
    public ResponseEntity<Void> deleteDiary(
            @PathVariable UUID diaryId,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        diaryService.deleteDiary(userId, diaryId);
        return ResponseEntity.noContent().build();
    }
}
