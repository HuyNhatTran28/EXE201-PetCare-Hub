package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.PaymentMethod;
import com.petcare_hub.enums.PaymentStatus;
import com.petcare_hub.enums.RefundStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payment extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    private String paymentMethodLabel;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private String gatewayReferenceId;
    private BigDecimal amountPaid;
    private LocalDateTime qrExpiresAt;
    private LocalDateTime paidAt;

    private BigDecimal refundAmount;
    private String refundReason;

    @Enumerated(EnumType.STRING)
    private RefundStatus refundStatus;

    private LocalDateTime refundProcessedAt;
}
