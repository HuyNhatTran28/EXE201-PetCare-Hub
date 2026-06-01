package com.petcare_hub.dto.response;

import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.enums.PaymentMethod;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BookingResponse {

    private UUID id;
    private String invoiceNumber;

    // Thông tin cơ bản
    private UUID ownerId;
    private String ownerName;
    private UUID hotelId;
    private String hotelName;
    private String hotelAddress;
    private UUID roomTypeId;
    private String roomTypeName;

    // Thú cưng
    private List<PetInfo> pets;

    // Ngày
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;

    // Tài chính
    private BigDecimal totalAmount;
    private BigDecimal commissionFee;
    private BigDecimal convenienceFee;
    private BigDecimal vatAmount;
    private BigDecimal voucherDiscountAmount;
    private Integer loyaltyPointsUsed;

    // Trạng thái
    private BookingStatus status;
    private PaymentMethod paymentMethod;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class PetInfo {
        private UUID id;
        private String name;
        private String species;
    }
}
