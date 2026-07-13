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
public class ReportResponse {
    private UUID id;
    private UUID reporterId;
    private String reporterName;
    private String reporterEmail;
    private UUID hotelId;
    private String hotelName;
    private String reason;
    private List<String> imageUrls;
    private String status;
    private String adminNote;
    private LocalDateTime createdAt;
}
