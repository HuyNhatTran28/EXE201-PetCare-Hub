package com.petcare_hub.service;

import com.petcare_hub.dto.request.DiaryRequest;
import com.petcare_hub.dto.response.DiaryResponse;

import java.util.List;
import java.util.UUID;
import java.util.Map;

public interface DiaryService {
    List<DiaryResponse> getDiariesByPet(UUID petId, UUID currentUserId);
    List<DiaryResponse> getDiariesByOwner(UUID ownerId, UUID currentUserId);
    DiaryResponse createDiary(UUID userId, DiaryRequest request);
    Map<String, Object> toggleReaction(UUID userId, UUID diaryId);
    DiaryResponse.CommentResponse addComment(UUID userId, UUID diaryId, String content);
    DiaryResponse updateDiary(UUID userId, UUID diaryId, DiaryRequest request);
    void deleteDiary(UUID userId, UUID diaryId);
}
