package com.petcare_hub.dto.request;

import com.petcare_hub.enums.PaymentMethod;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class BookingRequest {

    @NotNull(message = "Loại phòng không được để trống")
    private UUID roomTypeId;

    @NotNull(message = "Khách sạn không được để trống")
    private UUID hotelId;

    @NotNull(message = "Ngày check-in không được để trống")
    @FutureOrPresent(message = "Ngày check-in không được ở quá khứ")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày check-out không được để trống")
    private LocalDate checkOutDate;

    // Danh sách thú cưng gửi
    @NotNull(message = "Phải chọn ít nhất 1 thú cưng")
    private List<UUID> petIds;

    // Dịch vụ đi kèm (optional)
    private List<UUID> serviceIds;

    // Voucher (optional)
    private String voucherCode;

    // Điểm loyalty muốn dùng (optional)
    private Integer loyaltyPointsToUse;

    private PaymentMethod paymentMethod;
}
