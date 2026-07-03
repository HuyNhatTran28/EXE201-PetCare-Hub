package com.petcare_hub.controller;

import com.petcare_hub.dto.request.ChatRequest;
import com.petcare_hub.dto.response.ChatResponse;
import com.petcare_hub.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    private static final int    RATE_LIMIT_MAX       = 10;
    private static final long   RATE_LIMIT_WINDOW_MS = 60_000L;
    private static final String RATE_LIMIT_REPLY     =
        "Bạn nhắn hơi nhanh, chờ vài giây rồi hỏi lại giúp mình nhé 🐾";

    // long[0] = window start (ms), long[1] = request count in window
    private final ConcurrentHashMap<String, long[]> rateLimitMap = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @RequestBody ChatRequest request,
            HttpServletRequest httpRequest) {

        String ip = extractIp(httpRequest);
        if (isRateLimited(ip)) {
            log.warn("[RateLimit] IP={} vượt {}/60s", ip, RATE_LIMIT_MAX);
            return ResponseEntity.status(429).body(
                ChatResponse.builder().reply(RATE_LIMIT_REPLY).build());
        }

        return ResponseEntity.ok(chatService.chat(request));
    }

    private String extractIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        long[] slot = rateLimitMap.compute(ip, (k, v) -> {
            if (v == null || now - v[0] >= RATE_LIMIT_WINDOW_MS) {
                return new long[]{now, 1};
            }
            v[1]++;
            return v;
        });
        return slot[1] > RATE_LIMIT_MAX;
    }
}
