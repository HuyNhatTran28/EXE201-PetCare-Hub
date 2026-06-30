package com.petcare_hub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class DiaryRequest {

    @NotNull(message = "Mã đặt phòng không được để trống")
    private UUID bookingId;

    private String entryTitle;

    private String entryContent;

    private List<String> attachedMediaUrls;

    private String eating;
    private String mood;
    private String activity;
}
