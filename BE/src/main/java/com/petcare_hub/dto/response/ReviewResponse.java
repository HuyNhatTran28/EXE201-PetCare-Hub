package com.petcare_hub.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {
    private UUID id;
    private String reviewerName;
    private String reviewerAvatar;
    private Integer starRating;
    private String comment;
    private List<String> photoUrls;
    private LocalDateTime createdAt;
}
