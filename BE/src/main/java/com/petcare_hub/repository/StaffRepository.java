package com.petcare_hub.repository;

import com.petcare_hub.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {
    List<Staff> findByWorkplaceIdAndDeletedFalse(UUID hotelId);
    List<Staff> findByWorkplaceIdAndDeletedFalseOrderByCreatedAtDesc(UUID workplaceId);
    Optional<Staff> findByUserAccountIdAndDeletedFalse(UUID userId);
    boolean existsByUserAccountIdAndWorkplaceIdAndDeletedFalse(UUID userAccountId, UUID workplaceId);
    boolean existsByUserAccountIdAndDeletedFalse(UUID userId);

}
