package com.petcare_hub.service.impl;

import com.petcare_hub.dto.response.DiaryResponse;
import com.petcare_hub.entity.Diary;
import com.petcare_hub.entity.Pet;
import com.petcare_hub.repository.DiaryRepository;
import com.petcare_hub.service.DiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiaryServiceImpl implements DiaryService {

    private final DiaryRepository diaryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiariesByPet(UUID petId) {
        return diaryRepository.findByPetId(petId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiariesByOwner(UUID ownerId) {
        return diaryRepository.findByOwnerId(ownerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private DiaryResponse toResponse(Diary diary) {
        String staffName = "Nhân viên";
        if (diary.getWrittenByStaff() != null && diary.getWrittenByStaff().getUserAccount() != null) {
            staffName = diary.getWrittenByStaff().getUserAccount().getFullName();
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
                .build();
    }
}
