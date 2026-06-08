package com.petcare_hub.repository;

import com.petcare_hub.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByGatewayReferenceId(String gatewayReferenceId);
    java.util.List<Payment> findByBookingId(UUID bookingId);
}
