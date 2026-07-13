package com.petcare_hub.dto.request;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReportRequest {
    private String reason;
    private List<String> imageUrls;
}
