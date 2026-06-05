package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.ServiceRequest;
import com.petcare_hub.dto.response.ServiceResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.ServiceRepository;
import com.petcare_hub.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceServiceImpl implements ServiceService {

    private final ServiceRepository serviceRepository;
    private final HotelRepository hotelRepository;

    @Override
    @Transactional
    public ServiceResponse createService(
            UUID hotelId, UUID partnerId, ServiceRequest request) {

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền thêm dịch vụ cho KS này",
                    HttpStatus.FORBIDDEN);
        }

        com.petcare_hub.entity.Service service =
                com.petcare_hub.entity.Service.builder()
                .hotel(hotel)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .durationMinutes(request.getDurationMinutes())
                .serviceType(request.getServiceType())
                .imageUrl(request.getImageUrl())
                .build();

        return toResponse(serviceRepository.save(service));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceResponse> getServicesByHotel(UUID hotelId, Boolean enabledOnly) {
        List<com.petcare_hub.entity.Service> services = (enabledOnly == null || enabledOnly)
                ? serviceRepository.findByHotelIdAndIsEnabledTrue(hotelId)
                : serviceRepository.findByHotelId(hotelId);
        return services.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ServiceResponse updateService(
            UUID serviceId, UUID partnerId, ServiceRequest request) {

        com.petcare_hub.entity.Service service = findById(serviceId);
        checkOwner(service, partnerId);

        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setPrice(request.getPrice());
        service.setDurationMinutes(request.getDurationMinutes());
        service.setServiceType(request.getServiceType());
        service.setImageUrl(request.getImageUrl());

        return toResponse(serviceRepository.save(service));
    }

    @Override
    @Transactional
    public ServiceResponse toggleService(UUID serviceId, UUID partnerId) {
        com.petcare_hub.entity.Service service = findById(serviceId);
        checkOwner(service, partnerId);
        service.setIsEnabled(!service.getIsEnabled());
        return toResponse(serviceRepository.save(service));
    }

    // ── Private helpers ────────────────────────────────────────

    private com.petcare_hub.entity.Service findById(UUID id) {
        return serviceRepository.findById(id)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy dịch vụ", HttpStatus.NOT_FOUND));
    }

    private void checkOwner(com.petcare_hub.entity.Service service, UUID partnerId) {
        if (!service.getHotel().getPartner().getId().equals(partnerId)) {
            throw new AppException(
                    "Bạn không có quyền chỉnh sửa dịch vụ này",
                    HttpStatus.FORBIDDEN);
        }
    }

    private ServiceResponse toResponse(com.petcare_hub.entity.Service s) {
        return ServiceResponse.builder()
                .id(s.getId())
                .hotelId(s.getHotel().getId())
                .hotelName(s.getHotel().getName())
                .name(s.getName())
                .description(s.getDescription())
                .price(s.getPrice())
                .durationMinutes(s.getDurationMinutes())
                .serviceType(s.getServiceType())
                .isEnabled(s.getIsEnabled())
                .imageUrl(s.getImageUrl())
                .build();
    }
}
