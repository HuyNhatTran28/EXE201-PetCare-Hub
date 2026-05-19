package com.petcare_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.petcare_hub.enums.ConditionType;
import com.petcare_hub.enums.PriceAction;
import com.petcare_hub.enums.RuleStatus;
import com.petcare_hub.base.BaseEntity;

@Entity
@Table(name = "rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Rule extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    private String ruleName;

    @Enumerated(EnumType.STRING)
    private ConditionType conditionType;

    private String conditionConfigJson;

    @Enumerated(EnumType.STRING)
    private PriceAction priceAction;

    private BigDecimal adjustmentValue;

    @Enumerated(EnumType.STRING)
    private RuleStatus ruleStatus;

    private Integer priorityOrder;
}
