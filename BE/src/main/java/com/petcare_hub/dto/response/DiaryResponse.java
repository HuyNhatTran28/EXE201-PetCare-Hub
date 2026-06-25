package com.petcare_hub.dto.response;

import com.petcare_hub.enums.Activity;
import com.petcare_hub.enums.Eating;
import com.petcare_hub.enums.Mood;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class DiaryResponse {
    private UUID id;
    private UUID bookingId;
    private String hotelName;
    private String staffName;
    private LocalDateTime entryTime;
    private String entryTitle;
    private String entryContent;
    private List<String> attachedMediaUrls;
    private Eating eating;
    private Mood mood;
    private Activity activity;
    private List<String> petNames;
}
