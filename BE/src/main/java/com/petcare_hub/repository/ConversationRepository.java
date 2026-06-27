package com.petcare_hub.repository;

import com.petcare_hub.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByBookingId(UUID bookingId);

    List<Conversation> findByPetOwnerIdAndDeletedFalseOrderByLastMessageAtDesc(UUID petOwnerId);

    List<Conversation> findByHotelIdAndDeletedFalseOrderByLastMessageAtDesc(UUID hotelId);
}
