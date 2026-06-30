package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.DiaryRequest;
import com.petcare_hub.dto.response.DiaryResponse;
import com.petcare_hub.entity.Booking;
import com.petcare_hub.entity.Diary;
import com.petcare_hub.entity.DiaryComment;
import com.petcare_hub.entity.DiaryReaction;
import com.petcare_hub.entity.Pet;
import com.petcare_hub.entity.Staff;
import com.petcare_hub.entity.User;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.repository.DiaryCommentRepository;
import com.petcare_hub.repository.DiaryRepository;
import com.petcare_hub.repository.DiaryReactionRepository;
import com.petcare_hub.repository.StaffRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.DiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiaryServiceImpl implements DiaryService {

    private final DiaryRepository diaryRepository;
    private final BookingRepository bookingRepository;
    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final DiaryCommentRepository diaryCommentRepository;
    private final DiaryReactionRepository diaryReactionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiariesByPet(UUID petId, UUID currentUserId) {
        return diaryRepository.findByPetId(petId).stream()
                .map(d -> toResponse(d, currentUserId))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiariesByOwner(UUID ownerId, UUID currentUserId) {
        return diaryRepository.findByOwnerId(ownerId).stream()
                .map(d -> toResponse(d, currentUserId))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DiaryResponse createDiary(UUID userId, DiaryRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin đặt phòng", HttpStatus.NOT_FOUND));

        // Check if user is staff of the hotel
        Staff staff = staffRepository.findByUserAccountIdAndDeletedFalse(userId).orElse(null);

        // Verification:
        // 1. If staff, staff's workplace must be the booking's hotel
        // 2. If partner, partner must be the owner of the booking's hotel
        boolean isAuthorized = false;
        if (staff != null) {
            if (staff.getWorkplace() != null && staff.getWorkplace().getId().equals(booking.getHotel().getId())) {
                isAuthorized = true;
            }
        } else if (booking.getHotel().getPartner().getId().equals(userId)) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            throw new AppException("Bạn không có quyền cập nhật nhật ký cho cơ sở này", HttpStatus.FORBIDDEN);
        }

        Diary diary = new Diary();
        diary.setBooking(booking);
        diary.setWrittenByStaff(staff); // can be null if written by Partner
        diary.setEntryTime(LocalDateTime.now());
        
        String title = request.getEntryTitle();
        if (title == null || title.trim().isEmpty()) {
            title = "Cập nhật hoạt động";
        }
        diary.setEntryTitle(title);

        String content = request.getEntryContent();
        if (content == null || content.trim().isEmpty()) {
            content = "Bảo mẫu đã chia sẻ một hình ảnh hoạt động mới.";
        }
        diary.setEntryContent(content);

        diary.setAttachedMediaUrls(request.getAttachedMediaUrls());
        diary.setEating(request.getEating());
        diary.setMood(request.getMood());
        diary.setActivity(request.getActivity());

        Diary saved = diaryRepository.save(diary);
        DiaryResponse response = toResponse(saved, userId);

        try {
            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "DIARY_CREATE");
            wsMsg.put("diaryId", saved.getId().toString());
            wsMsg.put("hotelId", saved.getBooking().getHotel().getId().toString());
            wsMsg.put("bookingId", saved.getBooking().getId().toString());
            wsMsg.put("message", "Đã đăng nhật ký chăm sóc mới cho bé.");
            messagingTemplate.convertAndSend("/topic/diaries", wsMsg);
        } catch (Exception e) {
            // Log warning
        }

        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> toggleReaction(UUID userId, UUID diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new AppException("Không tìm thấy nhật ký", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        Optional<DiaryReaction> existing = diaryReactionRepository.findByDiaryIdAndUserId(diaryId, userId);
        boolean liked;
        if (existing.isPresent()) {
            diaryReactionRepository.delete(existing.get());
            liked = false;
        } else {
            DiaryReaction reaction = DiaryReaction.builder()
                    .diary(diary)
                    .user(user)
                    .reactionType("HEART")
                    .build();
            diaryReactionRepository.save(reaction);
            liked = true;
        }

        long count = diaryReactionRepository.countByDiaryId(diaryId);

        Map<String, Object> result = new HashMap<>();
        result.put("likesCount", (int) count);
        result.put("isLikedByMe", liked);

        try {
            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "LIKE");
            wsMsg.put("diaryId", diaryId.toString());
            wsMsg.put("hotelId", diary.getBooking().getHotel().getId().toString());
            wsMsg.put("bookingId", diary.getBooking().getId().toString());
            wsMsg.put("liked", liked);
            wsMsg.put("likesCount", (int) count);
            wsMsg.put("authorName", user.getFullName());
            wsMsg.put("message", user.getFullName() + (liked ? " đã thả tim nhật ký chăm sóc của bé." : " đã bỏ tim nhật ký chăm sóc của bé."));
            messagingTemplate.convertAndSend("/topic/diaries", wsMsg);
        } catch (Exception e) {
            // Log warning
        }

        return result;
    }

    @Override
    @Transactional
    public DiaryResponse.CommentResponse addComment(UUID userId, UUID diaryId, String content) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new AppException("Không tìm thấy nhật ký", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        if (content == null || content.trim().isEmpty()) {
            throw new AppException("Nội dung bình luận không được để trống", HttpStatus.BAD_REQUEST);
        }

        DiaryComment comment = DiaryComment.builder()
                .diary(diary)
                .user(user)
                .content(content.trim())
                .build();

        DiaryComment saved = diaryCommentRepository.save(comment);

        DiaryResponse.CommentResponse response = DiaryResponse.CommentResponse.builder()
                .id(saved.getId())
                .content(saved.getContent())
                .authorName(user.getFullName())
                .createdAt(saved.getCreatedAt())
                .build();

        try {
            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "COMMENT");
            wsMsg.put("diaryId", diaryId.toString());
            wsMsg.put("hotelId", diary.getBooking().getHotel().getId().toString());
            wsMsg.put("bookingId", diary.getBooking().getId().toString());
            wsMsg.put("comment", response);
            wsMsg.put("authorName", user.getFullName());
            wsMsg.put("message", user.getFullName() + " đã bình luận vào nhật ký: " + content);
            messagingTemplate.convertAndSend("/topic/diaries", wsMsg);
        } catch (Exception e) {
            // Log warning
        }

        return response;
    }

    @Override
    @Transactional
    public DiaryResponse updateDiary(UUID userId, UUID diaryId, DiaryRequest request) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new AppException("Không tìm thấy nhật ký", HttpStatus.NOT_FOUND));

        Booking booking = diary.getBooking();
        Staff staff = staffRepository.findByUserAccountIdAndDeletedFalse(userId).orElse(null);

        boolean isAuthorized = false;
        if (staff != null) {
            if (staff.getWorkplace() != null && staff.getWorkplace().getId().equals(booking.getHotel().getId())) {
                isAuthorized = true;
            }
        } else if (booking.getHotel().getPartner().getId().equals(userId)) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            throw new AppException("Bạn không có quyền sửa nhật ký cho cơ sở này", HttpStatus.FORBIDDEN);
        }

        String title = request.getEntryTitle();
        if (title != null && !title.trim().isEmpty()) {
            diary.setEntryTitle(title.trim());
        }
        String content = request.getEntryContent();
        if (content != null && !content.trim().isEmpty()) {
            diary.setEntryContent(content.trim());
        }

        diary.setAttachedMediaUrls(request.getAttachedMediaUrls());
        diary.setEating(request.getEating());
        diary.setMood(request.getMood());
        diary.setActivity(request.getActivity());

        Diary saved = diaryRepository.save(diary);
        DiaryResponse response = toResponse(saved, userId);

        try {
            Map<String, Object> wsMsg = new HashMap<>();
            wsMsg.put("type", "DIARY_UPDATE");
            wsMsg.put("diaryId", saved.getId().toString());
            wsMsg.put("hotelId", saved.getBooking().getHotel().getId().toString());
            wsMsg.put("bookingId", saved.getBooking().getId().toString());
            wsMsg.put("message", "Đã cập nhật nhật ký chăm sóc của bé.");
            messagingTemplate.convertAndSend("/topic/diaries", wsMsg);
        } catch (Exception e) {
            // Log warning
        }

        return response;
    }

    @Override
    @Transactional
    public void deleteDiary(UUID userId, UUID diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new AppException("Không tìm thấy nhật ký", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        // Strict role check: Only PARTNER role is allowed to delete
        if (!user.getRole().equals(com.petcare_hub.enums.Role.PARTNER)) {
            throw new AppException("Chỉ có chủ khách sạn mới được phép xóa nhật ký", HttpStatus.FORBIDDEN);
        }

        // Must verify that the partner actually owns the hotel of the diary's booking
        if (!diary.getBooking().getHotel().getPartner().getId().equals(userId)) {
            throw new AppException("Bạn không có quyền xóa nhật ký của cơ sở khác", HttpStatus.FORBIDDEN);
        }

        // Delete all related comments and reactions first
        diaryCommentRepository.deleteByDiaryId(diaryId);
        diaryReactionRepository.deleteByDiaryId(diaryId);

        // Delete the diary
        diaryRepository.delete(diary);
    }

    private DiaryResponse toResponse(Diary diary, UUID currentUserId) {
        String staffName = "Nhân viên";
        if (diary.getWrittenByStaff() != null && diary.getWrittenByStaff().getUserAccount() != null) {
            staffName = diary.getWrittenByStaff().getUserAccount().getFullName();
        } else if (diary.getCreatedBy() != null) {
            staffName = diary.getCreatedBy();
        }

        String hotelName = "Cửa hàng thú cưng";
        if (diary.getBooking() != null && diary.getBooking().getHotel() != null) {
            hotelName = diary.getBooking().getHotel().getName();
        }

        List<String> petNames = List.of();
        if (diary.getBooking() != null && diary.getBooking().getPets() != null) {
            petNames = diary.getBooking().getPets().stream()
                    .map(Pet::getName)
                    .collect(Collectors.toList());
        }

        // Fetch comments
        List<DiaryResponse.CommentResponse> commentList = diaryCommentRepository.findByDiaryIdOrderByCreatedAtAsc(diary.getId())
                .stream()
                .map(c -> DiaryResponse.CommentResponse.builder()
                        .id(c.getId())
                        .content(c.getContent())
                        .authorName(c.getUser() != null ? c.getUser().getFullName() : "Người dùng")
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // Fetch reactions
        long likesCount = diaryReactionRepository.countByDiaryId(diary.getId());
        boolean isLikedByMe = false;
        if (currentUserId != null) {
            isLikedByMe = diaryReactionRepository.findByDiaryIdAndUserId(diary.getId(), currentUserId).isPresent();
        }

        return DiaryResponse.builder()
                .id(diary.getId())
                .bookingId(diary.getBooking() != null ? diary.getBooking().getId() : null)
                .hotelName(hotelName)
                .staffName(staffName)
                .entryTime(diary.getEntryTime())
                .entryTitle(diary.getEntryTitle())
                .entryContent(diary.getEntryContent())
                .attachedMediaUrls(diary.getAttachedMediaUrls())
                .eating(diary.getEating())
                .mood(diary.getMood())
                .activity(diary.getActivity())
                .petNames(petNames)
                .likesCount((int) likesCount)
                .isLikedByMe(isLikedByMe)
                .comments(commentList)
                .build();
    }
}
