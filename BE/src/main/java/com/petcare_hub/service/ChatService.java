package com.petcare_hub.service;

import com.petcare_hub.dto.request.ChatRequest;
import com.petcare_hub.dto.response.ChatResponse;

public interface ChatService {
    ChatResponse chat(ChatRequest request);
}
