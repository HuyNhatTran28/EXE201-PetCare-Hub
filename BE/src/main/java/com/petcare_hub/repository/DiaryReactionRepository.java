package com.petcare_hub.repository;

import com.petcare_hub.entity.DiaryReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiaryReactionRepository extends JpaRepository<DiaryReaction, UUID> {
    List<DiaryReaction> findByDiaryId(UUID diaryId);
    Optional<DiaryReaction> findByDiaryIdAndUserId(UUID diaryId, UUID userId);
    long countByDiaryId(UUID diaryId);
    void deleteByDiaryId(UUID diaryId);
}
