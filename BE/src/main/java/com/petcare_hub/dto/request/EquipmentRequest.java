package com.petcare_hub.dto.request;

import com.petcare_hub.enums.EquipmentStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EquipmentRequest {

    @NotBlank(message = "Tên thiết bị không được để trống")
    private String name;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn hoặc bằng 1")
    private Integer quantity;

    @NotNull(message = "Trạng thái không được để trống")
    private EquipmentStatus status;

    private LocalDate lastMaintenance;
}
