package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import com.petcare_hub.enums.DiscountType;
import com.petcare_hub.enums.VoucherStatus;
import com.petcare_hub.enums.Audience;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Voucher extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    private String voucherCode;

    @Enumerated(EnumType.STRING)
    private DiscountType discountType;

    private BigDecimal discountValue;
    private LocalDate expiresOn;
    private Integer maxUsageCount;
    private Integer currentUsageCount;

    @Enumerated(EnumType.STRING)
    private VoucherStatus voucherStatus;

    @Enumerated(EnumType.STRING)
    private Audience audience;
}
