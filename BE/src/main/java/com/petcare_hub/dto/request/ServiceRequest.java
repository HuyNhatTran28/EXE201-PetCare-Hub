package com.petcare_hub.dto.request;

import com.petcare_hub.enums.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ServiceRequest {

    @NotBlank(message = "Tên dịch vụ không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá không được để trống")
    @Positive(message = "Giá phải lớn hơn 0")
    private BigDecimal price;

    @Positive(message = "Thời gian phải lớn hơn 0")
    private Integer durationMinutes;

    @NotNull(message = "Loại dịch vụ không được để trống")
    private ServiceType serviceType;

    private String imageUrl;
    private java.util.List<String> imageUrls;
}
