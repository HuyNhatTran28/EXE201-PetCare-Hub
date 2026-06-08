package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import com.petcare_hub.base.BaseEntity;
import com.petcare_hub.enums.WithdrawalStatus;
import java.math.BigDecimal;

@Entity
@Table(name = "withdrawal_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WithdrawalRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Column(name = "bank_account_number", nullable = false)
    private String bankAccountNumber;

    @Column(name = "bank_account_name", nullable = false)
    private String bankAccountName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WithdrawalStatus status = WithdrawalStatus.PENDING;

    @Column(name = "receipt_image_url", columnDefinition = "text")
    private String receiptImageUrl;
}
