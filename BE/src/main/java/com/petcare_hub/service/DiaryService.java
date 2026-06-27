package com.petcare_hub.service;

import com.petcare_hub.dto.response.DiaryResponse;

import java.util.List;
import java.util.UUID;

public interface DiaryService {
    List<DiaryResponse> getDiariesByPet(UUID petId);
    List<DiaryResponse> getDiariesByOwner(UUID ownerId);
}
