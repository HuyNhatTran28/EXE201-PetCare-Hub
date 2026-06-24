package com.petcare_hub.service;

import com.petcare_hub.dto.response.ConversationResponse;
import com.petcare_hub.dto.response.MessageResponse;

import java.util.List;
import java.util.UUID;

public interface ConversationService {

    ConversationResponse getOrCreateByBooking(UUID bookingId, UUID currentUserId);

    List<ConversationResponse> getOwnerConversations(UUID ownerId);

    List<ConversationResponse> getHotelConversations(UUID staffUserId);

    List<ConversationResponse> getHotelConversationsForPartner(UUID partnerId, UUID hotelId);

    List<MessageResponse> getMessages(UUID conversationId, UUID currentUserId);

    MessageResponse sendMessage(UUID conversationId, UUID senderId, String content);
}
