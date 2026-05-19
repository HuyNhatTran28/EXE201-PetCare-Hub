package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Booking extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User owner;

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    @ManyToOne
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    @ManyToOne
    @JoinColumn(name = "voucher_id")
    private Voucher appliedVoucher;





    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    private BigDecimal totalAmount;
    private Double commissionRate;
    private BigDecimal commissionFee;
    private BigDecimal convenienceFee;
    private BigDecimal vatAmount;
    private BigDecimal voucherDiscountAmount;
    private Integer loyaltyPointsUsed;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private String checkinPhotoUrl;
    private String ownerSignatureUrl;
    private String invoiceNumber;
}
