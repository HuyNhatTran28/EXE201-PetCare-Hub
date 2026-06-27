package com.petcare_hub.service.impl;

import com.petcare_hub.dto.response.ConversationResponse;
import com.petcare_hub.dto.response.MessageResponse;
import com.petcare_hub.entity.Conversation;
import com.petcare_hub.entity.ConversationMessage;
import com.petcare_hub.entity.Staff;
import com.petcare_hub.enums.SenderRole;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.repository.ConversationMessageRepository;
import com.petcare_hub.repository.ConversationRepository;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.StaffRepository;
import com.petcare_hub.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository        conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final BookingRepository             bookingRepository;
    private final StaffRepository               staffRepository;
    private final HotelRepository               hotelRepository;

    // ── GET-OR-CREATE ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ConversationResponse getOrCreateByBooking(UUID bookingId, UUID currentUserId) {
        var booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new AppException("Không tìm thấy booking", HttpStatus.NOT_FOUND));

        if (!booking.getOwner().getId().equals(currentUserId)) {
            throw new AppException("Không có quyền truy cập booking này", HttpStatus.FORBIDDEN);
        }

        return conversationRepository.findByBookingId(bookingId)
            .map(conv -> {
                if (Boolean.TRUE.equals(conv.getDeleted())) {
                    conv.setDeleted(false);
                    conv.setDeletedAt(null);
                    conv.setDeletedBy(null);
                    return toResponse(conversationRepository.save(conv));
                }
                return toResponse(conv);
            })
            .orElseGet(() -> {
                Conversation conv = Conversation.builder()
                    .bookingId(bookingId)
                    .petOwnerId(booking.getOwner().getId())
                    .hotelId(booking.getHotel().getId())
                    .lastMessageAt(Instant.now())
                    .build();
                return toResponse(conversationRepository.save(conv));
            });
    }

    // ── DANH SÁCH ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getOwnerConversations(UUID ownerId) {
        return conversationRepository
            .findByPetOwnerIdAndDeletedFalseOrderByLastMessageAtDesc(ownerId)
            .stream()
            .map(conv -> toResponseWithMeta(conv, ownerId))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getHotelConversations(UUID staffUserId) {
        Staff staff = staffRepository.findByUserAccountIdAndDeletedFalse(staffUserId)
            .orElseThrow(() -> new AppException(
                "Bạn chưa được gán vào khách sạn nào", HttpStatus.FORBIDDEN));

        UUID hotelId = staff.getWorkplace().getId();
        return conversationRepository
            .findByHotelIdAndDeletedFalseOrderByLastMessageAtDesc(hotelId)
            .stream()
            .map(conv -> toResponseWithMeta(conv, staffUserId))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getHotelConversationsForPartner(UUID partnerId, UUID hotelId) {
        if (hotelId == null) {
            throw new AppException("Vui lòng chọn cơ sở", HttpStatus.BAD_REQUEST);
        }
        hotelRepository.findByIdAndPartnerId(hotelId, partnerId)
            .orElseThrow(() -> new AppException(
                "Khách sạn không tồn tại hoặc bạn không có quyền", HttpStatus.FORBIDDEN));

        return conversationRepository
            .findByHotelIdAndDeletedFalseOrderByLastMessageAtDesc(hotelId)
            .stream()
            .map(conv -> toResponseWithMeta(conv, partnerId))
            .toList();
    }

    // ── LỊCH SỬ TIN NHẮN ─────────────────────────────────────────────────────

    @Override
    @Transactional
    public List<MessageResponse> getMessages(UUID conversationId, UUID currentUserId) {
        Conversation conv = findAndAuthorize(conversationId, currentUserId);
        // Đánh dấu đã đọc các tin của phía đối diện
        messageRepository.markOppositeAsRead(conv.getId(), currentUserId);
        return messageRepository.findByConversationIdOrderBySentAtAsc(conv.getId())
            .stream()
            .map(this::toMessageResponse)
            .toList();
    }

    // ── GỬI TIN (được gọi từ STOMP controller) ───────────────────────────────

    @Override
    @Transactional
    public MessageResponse sendMessage(UUID conversationId, UUID senderId, String content) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new AppException("Không tìm thấy hội thoại", HttpStatus.NOT_FOUND));

        // Suy senderRole từ DB — KHÔNG tin payload client
        SenderRole role;
        if (senderId.equals(conv.getPetOwnerId())) {
            role = SenderRole.OWNER;
        } else if (staffRepository.existsByUserAccountIdAndWorkplaceIdAndDeletedFalse(
                senderId, conv.getHotelId())) {
            role = SenderRole.STAFF;
        } else if (hotelRepository.findByIdAndPartnerId(conv.getHotelId(), senderId).isPresent()) {
            role = SenderRole.STAFF; // PARTNER sở hữu hotel → phía khách sạn
        } else {
            throw new AppException(
                "Không có quyền gửi tin nhắn trong hội thoại này", HttpStatus.FORBIDDEN);
        }

        if (content == null || content.isBlank()) {
            throw new AppException("Nội dung tin nhắn không được để trống", HttpStatus.BAD_REQUEST);
        }

        ConversationMessage msg = ConversationMessage.builder()
            .conversation(conv)
            .senderId(senderId)
            .senderRole(role)
            .content(content.trim())
            .sentAt(Instant.now())
            .isRead(false)
            .build();
        ConversationMessage saved = messageRepository.save(msg);

        if (Boolean.TRUE.equals(conv.getDeleted())) {
            conv.setDeleted(false);
            conv.setDeletedAt(null);
            conv.setDeletedBy(null);
        }
        conv.setLastMessageAt(saved.getSentAt());
        conversationRepository.save(conv);

        return toMessageResponse(saved);
    }

    @Override
    @Transactional
    public void deleteConversation(UUID conversationId, UUID currentUserId) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new AppException("Không tìm thấy hội thoại", HttpStatus.NOT_FOUND));

        boolean isOwner = currentUserId.equals(conv.getPetOwnerId());
        boolean isStaff = staffRepository.existsByUserAccountIdAndWorkplaceIdAndDeletedFalse(
            currentUserId, conv.getHotelId());
        boolean isPartner = hotelRepository.findByIdAndPartnerId(conv.getHotelId(), currentUserId).isPresent();

        if (!isOwner && !isStaff && !isPartner) {
            throw new AppException("Không có quyền xóa hội thoại này", HttpStatus.FORBIDDEN);
        }

        conv.setDeleted(true);
        conv.setDeletedAt(java.time.LocalDateTime.now());
        conv.setDeletedBy(currentUserId.toString());
        conversationRepository.save(conv);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private Conversation findAndAuthorize(UUID conversationId, UUID userId) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new AppException("Không tìm thấy hội thoại", HttpStatus.NOT_FOUND));

        boolean isOwner = userId.equals(conv.getPetOwnerId());
        boolean isStaff = staffRepository.existsByUserAccountIdAndWorkplaceIdAndDeletedFalse(
            userId, conv.getHotelId());
        boolean isPartner = hotelRepository.findByIdAndPartnerId(conv.getHotelId(), userId).isPresent();

        if (!isOwner && !isStaff && !isPartner) {
            throw new AppException("Không có quyền truy cập hội thoại này", HttpStatus.FORBIDDEN);
        }
        return conv;
    }

    // ── MAPPERS ───────────────────────────────────────────────────────────────

    private String resolveHotelName(UUID hotelId) {
        return hotelRepository.findById(hotelId)
            .map(h -> h.getName())
            .orElse("Khách sạn");
    }

    private ConversationResponse toResponse(Conversation conv) {
        var builder = ConversationResponse.builder()
            .id(conv.getId())
            .bookingId(conv.getBookingId())
            .petOwnerId(conv.getPetOwnerId())
            .hotelId(conv.getHotelId())
            .hotelName(resolveHotelName(conv.getHotelId()))
            .lastMessageAt(conv.getLastMessageAt());

        bookingRepository.findById(conv.getBookingId()).ifPresent(b -> {
            String petNames = b.getPets().stream()
                .map(com.petcare_hub.entity.Pet::getName)
                .collect(java.util.stream.Collectors.joining(", "));
            builder.petNames(petNames)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .bookingType(b.getBookingType() != null ? b.getBookingType().name() : "OVERNIGHT");
        });

        return builder.build();
    }

    private ConversationResponse toResponseWithMeta(Conversation conv, UUID currentUserId) {
        String lastContent = messageRepository
            .findFirstByConversationIdOrderBySentAtDesc(conv.getId())
            .map(ConversationMessage::getContent)
            .orElse(null);
        long unread = messageRepository
            .countByConversationIdAndSenderIdNotAndIsReadFalse(conv.getId(), currentUserId);

        var builder = ConversationResponse.builder()
            .id(conv.getId())
            .bookingId(conv.getBookingId())
            .petOwnerId(conv.getPetOwnerId())
            .hotelId(conv.getHotelId())
            .hotelName(resolveHotelName(conv.getHotelId()))
            .lastMessageAt(conv.getLastMessageAt())
            .lastMessageContent(lastContent)
            .unreadCount(unread);

        bookingRepository.findById(conv.getBookingId()).ifPresent(b -> {
            String petNames = b.getPets().stream()
                .map(com.petcare_hub.entity.Pet::getName)
                .collect(java.util.stream.Collectors.joining(", "));
            builder.petNames(petNames)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .bookingType(b.getBookingType() != null ? b.getBookingType().name() : "OVERNIGHT");
        });

        return builder.build();
    }

    private MessageResponse toMessageResponse(ConversationMessage msg) {
        return MessageResponse.builder()
            .id(msg.getId())
            .conversationId(msg.getConversation().getId())
            .senderId(msg.getSenderId())
            .senderRole(msg.getSenderRole())
            .content(msg.getContent())
            .sentAt(msg.getSentAt())
            .isRead(msg.getIsRead())
            .build();
    }
}
