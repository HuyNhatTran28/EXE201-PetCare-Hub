package com.petcare_hub.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuggestedRoom {
    private String     name;
    private BigDecimal pricePerNight;
    private BigDecimal dayRate;
    private String     imageUrl;
    private String     hotelId;
}
