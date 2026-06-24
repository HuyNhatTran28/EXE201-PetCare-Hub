package com.petcare_hub.repository;

import com.petcare_hub.entity.ConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, UUID> {

    List<ConversationMessage> findByConversationIdOrderBySentAtAsc(UUID conversationId);

    Optional<ConversationMessage> findFirstByConversationIdOrderBySentAtDesc(UUID conversationId);

    long countByConversationIdAndSenderIdNotAndIsReadFalse(UUID conversationId, UUID senderId);

    @Modifying
    @Query("""
        UPDATE ConversationMessage m
        SET m.isRead = true
        WHERE m.conversation.id = :convId
          AND m.senderId != :readerId
          AND m.isRead = false
        """)
    int markOppositeAsRead(@Param("convId") UUID convId, @Param("readerId") UUID readerId);
}
