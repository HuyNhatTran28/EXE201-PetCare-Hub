package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
    name = "bookings",
    indexes = {
        @Index(name = "idx_bookings_user",      columnList = "user_id"),
        @Index(name = "idx_bookings_hotel",     columnList = "hotel_id"),
        @Index(name = "idx_bookings_status",    columnList = "status"),
        @Index(name = "idx_bookings_checkin",   columnList = "check_in_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking extends BaseEntity {

    // ── Quan hệ chính ──────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher appliedVoucher;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "booking_pets",
        joinColumns = @JoinColumn(
            name = "booking_id",
            referencedColumnName = "id"
        ),
        inverseJoinColumns = @JoinColumn(
            name = "pet_id",
            referencedColumnName = "id"
        )
    )
    @Builder.Default
    private Set<Pet> pets = new HashSet<>();

    // ── Ngày check-in / check-out ──────────────────────────────

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    // ── Tài chính ──────────────────────────────────────────────

    @Column(name = "total_amount", nullable = false,
            columnDefinition = "numeric(15,2)")
    private BigDecimal totalAmount;

    // Snapshot tại thời điểm đặt — KHÔNG đọc lại sau này
    @Column(name = "commission_rate", nullable = false)
    private Double commissionRate;

    @Column(name = "commission_fee",
            columnDefinition = "numeric(15,2)")
    private BigDecimal commissionFee;

    @Column(name = "convenience_fee",
            columnDefinition = "numeric(15,2)")
    private BigDecimal convenienceFee;

    @Column(name = "vat_amount",
            columnDefinition = "numeric(15,2)")
    private BigDecimal vatAmount;

    @Column(name = "voucher_discount_amount",
            columnDefinition = "numeric(15,2)")
    @Builder.Default
    private BigDecimal voucherDiscountAmount = BigDecimal.ZERO;

    @Column(name = "loyalty_points_used")
    @Builder.Default
    private Integer loyaltyPointsUsed = 0;

    // ── Trạng thái ─────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    // ── Check-in ───────────────────────────────────────────────

    @Column(name = "checkin_photo_url",
            columnDefinition = "text")
    private String checkinPhotoUrl;

    @Column(name = "owner_signature_url",
            columnDefinition = "text")
    private String ownerSignatureUrl;

    @Column(name = "invoice_number", unique = true)
    private String invoiceNumber;
}
