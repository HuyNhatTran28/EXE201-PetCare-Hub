package com.petcare_hub.controller;

import com.petcare_hub.dto.request.SendMessageRequest;
import com.petcare_hub.dto.response.MessageResponse;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Slf4j
public class StompChatController {

    private final ConversationService    conversationService;
    private final SimpMessagingTemplate  messagingTemplate;

    /**
     * Client gửi tới: /app/chat/{conversationId}
     * Payload: { "content": "..." }
     * Broadcast tới: /topic/conversation/{conversationId}
     */
    @MessageMapping("/chat/{conversationId}")
    public void handleMessage(
            @DestinationVariable UUID conversationId,
            @Payload SendMessageRequest request,
            Principal principal) {

        if (principal == null) {
            log.warn("[WS] Tin nhắn không có xác thực, bỏ qua (conversationId={})", conversationId);
            return;
        }

        UUID senderId = extractUserId(principal);

        try {
            MessageResponse response = conversationService.sendMessage(
                conversationId, senderId, request.getContent());

            // Broadcast cho tất cả subscriber của conversation
            messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId, response);

        } catch (AppException e) {
            log.warn("[WS] Lỗi gửi tin (conv={}, sender={}): {}", conversationId, senderId, e.getMessage());
            // Trả lỗi riêng về cho người gửi
            messagingTemplate.convertAndSendToUser(
                principal.getName(), "/queue/errors",
                Map.of("error", e.getMessage(), "conversationId", conversationId.toString()));
        } catch (Exception e) {
            log.error("[WS] Lỗi không mong đợi (conv={}): {}", conversationId, e.getMessage(), e);
        }
    }

    private UUID extractUserId(Principal principal) {
        return (UUID) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
    }
}
