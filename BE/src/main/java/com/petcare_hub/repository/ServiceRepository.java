package com.petcare_hub.repository;

import com.petcare_hub.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceRepository extends JpaRepository<Service, UUID> {

    // Lấy dịch vụ đang bật của 1 KS
    List<Service> findByHotelIdAndIsEnabledTrue(UUID hotelId);

    // Lấy tất cả dịch vụ của 1 KS (kể cả tắt)
    List<Service> findByHotelId(UUID hotelId);
}
