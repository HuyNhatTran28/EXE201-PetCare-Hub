package com.petcare_hub.repository;

import com.petcare_hub.entity.WithdrawalRequest;
import com.petcare_hub.enums.WithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {
    List<WithdrawalRequest> findByPartnerIdOrderByCreatedAtDesc(UUID partnerId);
    List<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);
}
