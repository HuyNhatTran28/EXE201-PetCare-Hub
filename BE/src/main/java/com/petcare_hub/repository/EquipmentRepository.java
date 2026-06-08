package com.petcare_hub.repository;

import com.petcare_hub.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {
    List<Equipment> findByHotelIdAndDeletedFalse(UUID hotelId);
}
