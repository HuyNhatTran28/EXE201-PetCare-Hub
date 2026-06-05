package com.petcare_hub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class HotelRequest {

    @NotBlank(message = "Tên khách sạn không được để trống")
    private String name;

    private String address;

    private Double locationLat;

    private Double locationLong;

    private String googleMapsUrl;

    private String description;
    private List<String> amenities;
    private String checkInTime;
    private String checkOutTime;
}
