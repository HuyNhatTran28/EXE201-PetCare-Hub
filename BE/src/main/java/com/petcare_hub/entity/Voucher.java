package com.petcare_hub.entity;

import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.DiscountType;
import com.petcare_hub.enums.VoucherStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher extends BaseEntity {

    // Nullable = voucher toàn nền tảng do Admin tạo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    @Column(name = "voucher_code", nullable = false, unique = true)
    private String voucherCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false,
            columnDefinition = "numeric(10,2)")
    private BigDecimal discountValue;

    @Column(name = "expires_on")
    private LocalDate expiresOn;

    @Column(name = "max_usage_count")
    private Integer maxUsageCount;

    @Column(name = "current_usage_count")
    @Builder.Default
    private Integer currentUsageCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "voucher_status", nullable = false)
    @Builder.Default
    private VoucherStatus voucherStatus = VoucherStatus.ACTIVE;

    @Column(name = "target_audience")
    private String targetAudience;
}
