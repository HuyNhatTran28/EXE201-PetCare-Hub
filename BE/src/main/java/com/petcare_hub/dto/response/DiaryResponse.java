package com.petcare_hub.dto.response;

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
    private String eating;
    private String mood;
    private String activity;
    private List<String> petNames;
    
    // Social interactions
    private Integer likesCount;
    private Boolean isLikedByMe;
    private List<CommentResponse> comments;

    @Data
    @Builder
    public static class CommentResponse {
        private UUID id;
        private String authorName;
        private String content;
        private LocalDateTime createdAt;
    }
}
