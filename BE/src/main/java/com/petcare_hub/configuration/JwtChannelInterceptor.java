package com.petcare_hub.configuration;

import com.petcare_hub.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
            message, StompHeaderAccessor.class);

        // Chỉ xác thực frame CONNECT — các frame khác kế thừa Principal đã set
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("[WS] Thiếu JWT trong header Authorization khi CONNECT");
        }

        String token = authHeader.substring(7);

        if (!jwtUtils.isTokenValid(token) || !jwtUtils.isAccessToken(token)) {
            throw new IllegalArgumentException("[WS] JWT không hợp lệ hoặc đã hết hạn");
        }

        UUID   userId = jwtUtils.extractUserId(token);
        String role   = jwtUtils.extractRole(token);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            userId, null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role)));

        accessor.setUser(auth);
        log.debug("[WS] STOMP CONNECT xác thực OK: userId={}, role={}", userId, role);
        return message;
    }
}
