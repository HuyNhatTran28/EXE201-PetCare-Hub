package com.petcare_hub.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewRequest {

    @NotNull(message = "Mã đặt phòng không được để trống")
    private UUID bookingId;

    @NotNull(message = "Số sao đánh giá không được để trống")
    @Min(value = 1, message = "Đánh giá thấp nhất là 1 sao")
    @Max(value = 5, message = "Đánh giá cao nhất là 5 sao")
    private Integer starRating;

    @NotBlank(message = "Bình luận không được để trống")
    private String comment;

    private List<String> photoUrls;
}
