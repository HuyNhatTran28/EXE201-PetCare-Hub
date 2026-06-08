package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import com.petcare_hub.base.BaseEntity;
import java.math.BigDecimal;

@Entity
@Table(name = "partner_wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWallet extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false, unique = true)
    private User partner;

    @Column(nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "pending_balance", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal pendingBalance = BigDecimal.ZERO;
}
