package com.petcare_hub.controller;

import com.petcare_hub.base.ApiResponse;
import com.petcare_hub.dto.response.ConversationResponse;
import com.petcare_hub.dto.response.MessageResponse;
import com.petcare_hub.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    // ── POST /api/conversations/booking/{bookingId} ────────────────────────────
    // Chỉ OWNER của booking mới tạo được hội thoại
    @PostMapping("/booking/{bookingId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<ConversationResponse>> getOrCreate(
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.success(
            conversationService.getOrCreateByBooking(bookingId, currentUserId())));
    }

    // ── GET /api/conversations/me ─────────────────────────────────────────────
    // Danh sách hội thoại của chủ nuôi đang đăng nhập (kèm tin cuối + số chưa đọc)
    @GetMapping("/me")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getMyConversations() {
        return ResponseEntity.ok(ApiResponse.success(
            conversationService.getOwnerConversations(currentUserId())));
    }

    // ── GET /api/conversations/hotel ──────────────────────────────────────────
    // STAFF: danh sách hội thoại của khách sạn mà staff phụ trách
    // PARTNER: cần thêm ?hotelId=<uuid> (phải là hotel do họ sở hữu)
    @GetMapping("/hotel")
    @PreAuthorize("hasRole('STAFF') or hasRole('PARTNER')")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getHotelConversations(
            @RequestParam(required = false) UUID hotelId,
            Authentication authentication) {
        boolean isPartner = authentication.getAuthorities().stream()
            .anyMatch(ga -> ga.getAuthority().equals("ROLE_PARTNER"));
        log.debug("[GET /hotel] userId={} roles={} isPartner={} hotelId={}",
            currentUserId(), authentication.getAuthorities(), isPartner, hotelId);
        List<ConversationResponse> result = isPartner
            ? conversationService.getHotelConversationsForPartner(currentUserId(), hotelId)
            : conversationService.getHotelConversations(currentUserId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── GET /api/conversations/{id}/messages ──────────────────────────────────
    // Lịch sử tin nhắn; đồng thời đánh dấu đã đọc tin của phía đối diện
    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getMessages(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
            conversationService.getMessages(id, currentUserId())));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext()
            .getAuthentication().getPrincipal();
    }
}
