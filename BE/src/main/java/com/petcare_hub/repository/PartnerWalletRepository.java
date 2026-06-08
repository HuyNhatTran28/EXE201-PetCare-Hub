package com.petcare_hub.repository;

import com.petcare_hub.entity.PartnerWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PartnerWalletRepository extends JpaRepository<PartnerWallet, UUID> {
    Optional<PartnerWallet> findByPartnerId(UUID partnerId);
}
