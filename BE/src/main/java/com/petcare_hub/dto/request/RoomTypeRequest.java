package com.petcare_hub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RoomTypeRequest {

    @NotBlank(message = "Tên loại phòng không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá không được để trống")
    @Positive(message = "Giá phải lớn hơn 0")
    private BigDecimal pricePerNight;

    @Positive(message = "Số thú cưng tối đa phải lớn hơn 0")
    private Integer maxPets;

    @Positive(message = "Tổng số phòng phải lớn hơn 0")
    private Integer totalRooms;

    private List<String> allowedPetTypes;
    private List<String> images;
}
