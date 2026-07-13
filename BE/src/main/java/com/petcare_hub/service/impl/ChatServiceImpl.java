package com.petcare_hub.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.petcare_hub.dto.request.ChatMessage;
import com.petcare_hub.dto.request.ChatRequest;
import com.petcare_hub.dto.response.ChatResponse;
import com.petcare_hub.dto.response.SuggestedRoom;
import com.petcare_hub.entity.Feedback;
import com.petcare_hub.entity.RoomType;
import com.petcare_hub.entity.Service;
import com.petcare_hub.repository.FeedbackRepository;
import com.petcare_hub.repository.RoomTypeRepository;
import com.petcare_hub.repository.ServiceRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final RoomTypeRepository roomTypeRepository;
    private final ServiceRepository  serviceRepository;
    private final ObjectMapper       objectMapper;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository     userRepository;

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Value("${app.chat.daily-limit:1000}")
    private int dailyChatLimit;

    private static final String GROQ_URL =
        "https://api.groq.com/openai/v1/chat/completions";

    private static final int MAX_MESSAGE_CHARS = 1000;
    private static final int MAX_HISTORY_MSGS  = 10;

    private static final Pattern ROOMS_TAG_PATTERN =
        Pattern.compile("\\[\\[ROOMS:\\s*([^\\]]+)\\]\\]");

    private static final Pattern FEEDBACK_TAG_PATTERN =
        Pattern.compile("\\[\\[FEEDBACK:\\s*([^\\|]+)\\|\\s*([^\\]]+)\\]\\]");

    private static final String FALLBACK_REPLY =
        "Xin lỗi, trợ lý đang bận. Bạn vui lòng thử lại sau nhé!";
    private static final String RETRY_FALLBACK =
        "Trợ lý hơi bận, bạn nhắn lại giúp mình nhé";
    private static final String DAILY_LIMIT_REPLY =
        "Trợ lý đang nghỉ, bạn quay lại sau nhé";
    private static final String INPUT_TOO_LONG_REPLY =
        "Tin nhắn hơi dài, bạn rút gọn giúp mình nhé";

    // Lớp 3: đếm request tới Groq theo ngày
    private final AtomicInteger dailyCount    = new AtomicInteger(0);
    private volatile LocalDate  lastResetDate = LocalDate.now();

    @Override
    public ChatResponse chat(ChatRequest request) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("GROQ_API_KEY chưa được cấu hình");
            return ChatResponse.builder()
                .reply("Dịch vụ tư vấn chưa được cấu hình. Vui lòng liên hệ admin.").build();
        }

        // Lớp 2a: validate độ dài từng message
        if (request.getMessages() != null) {
            for (ChatMessage msg : request.getMessages()) {
                if (msg.getContent() != null && msg.getContent().length() > MAX_MESSAGE_CHARS) {
                    return ChatResponse.builder().reply(INPUT_TOO_LONG_REPLY).build();
                }
            }
        }

        // Lớp 3: kiểm tra hạn mức ngày
        
        if (!tryAcquireDailySlot()) {
            log.warn("[DailyLimit] Đã đạt {}/ngày, bỏ qua gọi Groq", dailyChatLimit);
            return ChatResponse.builder().reply(DAILY_LIMIT_REPLY).build();
        }

        try {
            // Fetch catalog — JOIN FETCH để hotel.id khả dụng sau khi session đóng
            List<RoomType> rooms    = roomTypeRepository.findAllActiveWithHotel();
            List<Service>  services = serviceRepository.findAll();

            // Gán mã ngắn: R1, R2, ...
            Map<String, RoomType> codeToRoom = new LinkedHashMap<>();
            for (int i = 0; i < rooms.size(); i++) {
                codeToRoom.put("R" + (i + 1), rooms.get(i));
            }

            // Lớp 2b: giữ 10 message gần nhất
            List<ChatMessage> history = request.getMessages();
            if (history != null && history.size() > MAX_HISTORY_MSGS) {
                history = history.subList(history.size() - MAX_HISTORY_MSGS, history.size());
            }

            String systemPrompt = buildSystemPrompt(codeToRoom, services);
            String requestBody  = buildGroqRequestBody(systemPrompt, history);

            String responseBody = callGroqWithRetry(requestBody);
            String rawReply     = parseGroqReply(responseBody);

            // Parse and save feedback if present
            saveFeedbackIfAny(rawReply);

            // Parse [[ROOMS: R1, R2]] và xóa khỏi text trả về user
            List<SuggestedRoom> suggestedRooms = extractSuggestedRooms(rawReply, codeToRoom);
            String cleanReply = ROOMS_TAG_PATTERN.matcher(rawReply).replaceAll("");
            cleanReply = FEEDBACK_TAG_PATTERN.matcher(cleanReply).replaceAll("").trim();

            return ChatResponse.builder()
                .reply(cleanReply)
                .suggestedRooms(suggestedRooms)
                .build();

        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 503 || status == 429) {
                log.warn("Groq {} sau 3 lần thử, trả retry fallback", status);
                return ChatResponse.builder().reply(RETRY_FALLBACK).build();
            }
            log.error("Groq API lỗi HTTP {}: {}", status, e.getMessage());
            return ChatResponse.builder().reply(FALLBACK_REPLY).build();
        } catch (Exception e) {
            log.error("Lỗi gọi Groq API: {}", e.getMessage(), e);
            return ChatResponse.builder().reply(FALLBACK_REPLY).build();
        }
    }

    // ── Parse [[ROOMS: R1, R2]] → danh sách SuggestedRoom ────────────────────

    private List<SuggestedRoom> extractSuggestedRooms(String text, Map<String, RoomType> codeToRoom) {
        Matcher m = ROOMS_TAG_PATTERN.matcher(text);
        if (!m.find()) return List.of();

        List<SuggestedRoom> result = new ArrayList<>();
        for (String code : m.group(1).split(",")) {
            RoomType room = codeToRoom.get(code.trim());
            if (room == null) continue;

            String imageUrl = (room.getImages() != null && !room.getImages().isEmpty())
                ? room.getImages().get(0) : null;
            String hotelId = room.getHotel().getId().toString();

            result.add(new SuggestedRoom(
                room.getName(),
                room.getPricePerNight(),
                room.getDayRate(),
                imageUrl,
                hotelId
            ));
        }
        return result;
    }

    // ── Lớp 3: daily slot ─────────────────────────────────────────────────────

    private boolean tryAcquireDailySlot() {
        LocalDate today = LocalDate.now();
        if (!today.equals(lastResetDate)) {
            synchronized (this) {
                if (!today.equals(lastResetDate)) {
                    log.info("[DailyLimit] Reset counter (ngày mới): {} → 0", lastResetDate);
                    dailyCount.set(0);
                    lastResetDate = today;
                }
            }
        }
        int current = dailyCount.incrementAndGet();
        if (current > dailyChatLimit) {
            dailyCount.decrementAndGet();
            return false;
        }
        return true;
    }

    // ── Retry với backoff chỉ cho 503/429 ────────────────────────────────────

    private String callGroqWithRetry(String requestBody) throws Exception {
        int[] delaysMs = {1000, 2000, 4000};
        RestClientResponseException lastEx = null;

        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                return RestClient.create()
                    .post()
                    .uri(GROQ_URL)
                    .header("Authorization", "Bearer " + groqApiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                if (status == 503 || status == 429) {
                    lastEx = e;
                    log.warn("Groq {} (lần {}/3), thử lại sau {}ms...", status, attempt + 1, delaysMs[attempt]);
                    if (attempt < 2) Thread.sleep(delaysMs[attempt]);
                } else {
                    throw e; // 400, 401... không retry
                }
            }
        }
        throw lastEx;
    }

    // ── Build system prompt từ catalog DB ─────────────────────────────────────

    private String buildSystemPrompt(Map<String, RoomType> codeToRoom, List<Service> services) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là trợ lý tư vấn của PetCare Hub — nền tảng đặt phòng khách sạn thú cưng tại Việt Nam.\n");
        sb.append("Nhiệm vụ: hỏi thăm loại thú cưng, giống, số ngày lưu trú và ngân sách của khách,\n");
        sb.append("sau đó gợi ý loại phòng + dịch vụ phù hợp và ƯỚC TÍNH giá (chưa phải giá chốt).\n\n");

        sb.append("=== DANH SÁCH LOẠI PHÒNG HIỆN CÓ ===\n");
        for (Map.Entry<String, RoomType> entry : codeToRoom.entrySet()) {
            String   code = entry.getKey();
            RoomType r    = entry.getValue();
            String petTypes = (r.getAllowedPetTypes() != null && !r.getAllowedPetTypes().isEmpty())
                ? String.join(", ", r.getAllowedPetTypes()) : "DOG, CAT";
            String dayRateStr = (r.getDayRate() != null)
                ? String.format("%,.0f đ/ngày", r.getDayRate().doubleValue())
                : "không nhận gửi ngày";
            sb.append(String.format("[%s] %s: %,.0f đ/đêm (gửi ngày: %s) | %s\n",
                code, r.getName(), r.getPricePerNight().doubleValue(), dayRateStr, petTypes));
        }

        sb.append("\n=== DỊCH VỤ BỔ SUNG ===\n");
        for (Service svc : services) {
            sb.append(String.format("- %s: %,.0f đ\n",
                svc.getName(), svc.getPrice().doubleValue()));
        }

        sb.append("\n=== CÔNG THỨC TÍNH GIÁ (để tư vấn ước tính) ===\n");
        sb.append("• Lưu trú qua đêm: giá/đêm × số đêm\n");
        sb.append("• Gửi ngày (Daycare): dayRate × số ngày\n");
        sb.append("• Tổng = (tiền phòng + dịch vụ đã chọn) × 1.08 (VAT 8%)\n");
        sb.append("• Ví dụ: phòng 200.000đ/đêm × 3 đêm + Spa 150.000đ = 594.000đ sau VAT\n\n");

        sb.append("=== QUY TẮC BẮT BUỘC ===\n");
        sb.append("1. CHỈ tư vấn và trả lời các thắc mắc liên quan đến dịch vụ khách sạn thú cưng, chăm sóc chó mèo, đặt phòng, dịch vụ phụ trợ hoặc các góp ý, báo lỗi để cải thiện nền tảng PetCare Hub.\n");
        sb.append("2. Nếu người dùng hỏi các chủ đề KHÔNG liên quan đến thú cưng/khách sạn thú cưng/PetCare Hub (ví dụ: lập trình, nấu ăn, setup bể cá/tép cảnh, kiến thức khoa học/đời sống chung), bạn BẮT BUỘC phải từ chối lịch sự: \"Xin lỗi, mình chỉ hỗ trợ giải đáp các thắc mắc liên quan đến dịch vụ khách sạn và chăm sóc thú cưng của PetCare Hub thui ạ! Bạn có cần mình tư vấn phòng hay dịch vụ gì cho bé cưng không?\". Khi từ chối, tuyệt đối KHÔNG thêm câu ước tính giá ở cuối.\n");
        sb.append("3. CHỈ tư vấn dịch vụ, KHÔNG tự đặt phòng hoặc xác nhận đặt phòng thay cho khách.\n");
        sb.append("4. Đối với các phản hồi tư vấn hợp lệ, luôn kết thúc bằng câu: \"Đây là giá ước tính — giá chính thức sẽ hiện rõ khi bạn chọn phòng trên trang đặt.\"\n");
        sb.append("5. Trả lời thân thiện, lịch sự và tuyệt đối KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji/icon) nào (như 🐾, 🐶, 🐱, v.v.) trong phản hồi.\n");
        sb.append("6. Nếu không có phòng phù hợp cho loại thú cưng được hỏi, nói rõ và xin lỗi.\n");
        sb.append("7. Trả lời bằng tiếng Việt.\n");
        sb.append("8. Sau câu kết thúc của cuộc tư vấn hợp lệ, nếu đã gợi ý phòng cụ thể thì thêm ĐÚNG 1 dòng cuối: [[ROOMS: R1, R2]] (chỉ dùng mã có trong danh sách trên, cách nhau dấu phẩy). Nếu chưa gợi ý phòng cụ thể hoặc khi từ chối câu hỏi không liên quan, BỎ dòng này hoàn toàn.\n");
        sb.append("9. NẾU người dùng đang gửi một góp ý cải thiện, phản ánh lỗi (bug) hoặc đề xuất tính năng mới (ví dụ: 'tôi muốn góp ý...', 'cần cải thiện...', 'nút X bị lỗi...', 'thêm tính năng Y...'), bạn hãy ghi nhận lịch sự và cảm ơn họ. Ở dòng cuối cùng của câu trả lời, bạn BẮT BUỘC phải chèn thêm thẻ định dạng: [[FEEDBACK: LOẠI_FEEDBACK | Nội dung tóm tắt góp ý bằng tiếng Việt]] (trong đó LOẠI_FEEDBACK có thể là BUG, FEATURE_REQUEST hoặc GENERAL; ví dụ: [[FEEDBACK: FEATURE_REQUEST | Người dùng đề xuất thêm phương thức trả góp]]). Nếu không phải góp ý/báo lỗi, tuyệt đối KHÔNG thêm thẻ này.\n");

        return sb.toString();
    }

    // ── Build Groq request body (chuẩn OpenAI) ────────────────────────────────

    private String buildGroqRequestBody(String systemPrompt, List<ChatMessage> messages)
            throws Exception {

        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", groqModel);
        root.put("max_tokens", 2048);
        root.put("temperature", 0.7);

        ArrayNode msgs = root.putArray("messages");

        // System prompt là message đầu tiên với role "system"
        msgs.addObject()
            .put("role", "system")
            .put("content", systemPrompt);

        // Lịch sử hội thoại: "model" → "assistant" cho Groq
        if (messages != null) {
            for (ChatMessage msg : messages) {
                String role = "model".equalsIgnoreCase(msg.getRole()) ? "assistant" : msg.getRole();
                msgs.addObject()
                    .put("role", role)
                    .put("content", msg.getContent());
            }
        }

        return objectMapper.writeValueAsString(root);
    }

    // ── Parse Groq response (chuẩn OpenAI) ───────────────────────────────────

    private String parseGroqReply(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);

        // TẠM: log finish_reason để kiểm tra — xóa sau khi xác nhận "stop"
        String finishReason = root.path("choices").path(0)
            .path("finish_reason").asText("N/A");
        log.info("[Groq] finish_reason={}", finishReason);

        JsonNode content = root.path("choices").path(0)
            .path("message").path("content");

        if (content.isMissingNode() || content.asText().isBlank()) {
            log.warn("Groq trả về response không có content: {}", responseBody);
            return FALLBACK_REPLY;
        }
        return content.asText().trim();
    }

    private void saveFeedbackIfAny(String replyText) {
        try {
            Matcher m = FEEDBACK_TAG_PATTERN.matcher(replyText);
            if (m.find()) {
                String category = m.group(1).trim().toUpperCase();
                String content = m.group(2).trim();

                String ip = "unknown";
                String email = null;

                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    String forwarded = request.getHeader("X-Forwarded-For");
                    if (forwarded != null && !forwarded.isBlank()) {
                        ip = forwarded.split(",")[0].trim();
                    } else {
                        ip = request.getRemoteAddr();
                    }
                }

                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof UUID) {
                    UUID userId = (UUID) auth.getPrincipal();
                    var userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent()) {
                        email = userOpt.get().getEmail();
                    }
                }

                Feedback fb = Feedback.builder()
                        .category(category)
                        .content(content)
                        .senderIp(ip)
                        .senderEmail(email)
                        .build();

                feedbackRepository.save(fb);
                log.info("[AI-Feedback] Saved user feedback: category={}, ip={}, email={}", category, ip, email);
            }
        } catch (Exception e) {
            log.error("Failed to parse or save feedback: {}", e.getMessage(), e);
        }
    }
}
