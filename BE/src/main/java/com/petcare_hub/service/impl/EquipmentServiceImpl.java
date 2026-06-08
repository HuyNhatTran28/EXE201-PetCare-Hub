package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.EquipmentRequest;
import com.petcare_hub.dto.response.EquipmentResponse;
import com.petcare_hub.entity.Equipment;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.EquipmentRepository;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.service.EquipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EquipmentServiceImpl implements EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final HotelRepository hotelRepository;

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentResponse> getEquipmentByHotel(UUID hotelId, UUID partnerId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException("Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền truy cập cơ sở này", HttpStatus.FORBIDDEN);
        }

        return equipmentRepository.findByHotelIdAndDeletedFalse(hotelId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public EquipmentResponse addEquipment(UUID hotelId, UUID partnerId, EquipmentRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException("Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý cơ sở này", HttpStatus.FORBIDDEN);
        }

        Equipment equipment = Equipment.builder()
                .hotel(hotel)
                .name(request.getName().trim())
                .quantity(request.getQuantity())
                .status(request.getStatus())
                .lastMaintenance(request.getLastMaintenance())
                .build();
        equipment.setDeleted(false);

        return toResponse(equipmentRepository.save(equipment));
    }

    @Override
    @Transactional
    public EquipmentResponse updateEquipment(UUID equipmentId, UUID partnerId, EquipmentRequest request) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new AppException("Không tìm thấy thiết bị", HttpStatus.NOT_FOUND));

        if (equipment.getDeleted()) {
            throw new AppException("Thiết bị này đã bị xóa", HttpStatus.BAD_REQUEST);
        }

        if (!equipment.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý thiết bị này", HttpStatus.FORBIDDEN);
        }

        equipment.setName(request.getName().trim());
        equipment.setQuantity(request.getQuantity());
        equipment.setStatus(request.getStatus());
        equipment.setLastMaintenance(request.getLastMaintenance());

        return toResponse(equipmentRepository.save(equipment));
    }

    @Override
    @Transactional
    public void deleteEquipment(UUID equipmentId, UUID partnerId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new AppException("Không tìm thấy thiết bị", HttpStatus.NOT_FOUND));

        if (equipment.getDeleted()) {
            return;
        }

        if (!equipment.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý thiết bị này", HttpStatus.FORBIDDEN);
        }

        // Soft delete
        equipment.setDeleted(true);
        equipment.setDeletedAt(LocalDateTime.now());
        equipmentRepository.save(equipment);
    }

    private EquipmentResponse toResponse(Equipment e) {
        return EquipmentResponse.builder()
                .id(e.getId())
                .hotelId(e.getHotel().getId())
                .hotelName(e.getHotel().getName())
                .name(e.getName())
                .quantity(e.getQuantity())
                .status(e.getStatus())
                .lastMaintenance(e.getLastMaintenance())
                .build();
    }
}
