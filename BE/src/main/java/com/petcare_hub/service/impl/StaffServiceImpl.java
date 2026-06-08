package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.StaffRequest;
import com.petcare_hub.dto.response.StaffResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.Staff;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.Role;
import com.petcare_hub.enums.ShiftStatus;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.StaffRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffRepository staffRepository;
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StaffResponse> getStaffByHotel(UUID hotelId, UUID partnerId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException("Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý cơ sở này", HttpStatus.FORBIDDEN);
        }

        return staffRepository.findByWorkplaceIdAndDeletedFalse(hotelId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StaffResponse addStaffToHotel(UUID hotelId, UUID partnerId, StaffRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new AppException("Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (!hotel.getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý cơ sở này", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản với email này. Vui lòng yêu cầu nhân viên đăng ký tài khoản trước.", HttpStatus.NOT_FOUND));

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.PARTNER) {
            throw new AppException("Không thể gán vai trò nhân viên cho tài khoản Admin hoặc Đối tác.", HttpStatus.BAD_REQUEST);
        }

        // Check if already active staff
        var existingStaffOpt = staffRepository.findByUserAccountIdAndDeletedFalse(user.getId());
        if (existingStaffOpt.isPresent()) {
            throw new AppException("Tài khoản này đã là nhân viên của cơ sở: " + existingStaffOpt.get().getWorkplace().getName(), HttpStatus.BAD_REQUEST);
        }

        // Update User Role to STAFF
        user.setRole(Role.STAFF);
        userRepository.save(user);

        Staff staff = new Staff();
        staff.setUserAccount(user);
        staff.setWorkplace(hotel);
        staff.setJobPosition(request.getJobPosition());
        staff.setShiftStatus(request.getShiftStatus() != null ? request.getShiftStatus() : ShiftStatus.ACTIVE);
        staff.setDeleted(false);

        return toResponse(staffRepository.save(staff));
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(UUID staffId, UUID partnerId, StaffRequest request) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin nhân viên", HttpStatus.NOT_FOUND));

        if (staff.getDeleted()) {
            throw new AppException("Thông tin nhân viên đã bị xóa", HttpStatus.BAD_REQUEST);
        }

        if (!staff.getWorkplace().getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý nhân viên này", HttpStatus.FORBIDDEN);
        }

        staff.setJobPosition(request.getJobPosition());
        if (request.getShiftStatus() != null) {
            staff.setShiftStatus(request.getShiftStatus());
        }

        return toResponse(staffRepository.save(staff));
    }

    @Override
    @Transactional
    public void removeStaff(UUID staffId, UUID partnerId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin nhân viên", HttpStatus.NOT_FOUND));

        if (staff.getDeleted()) {
            return;
        }

        if (!staff.getWorkplace().getPartner().getId().equals(partnerId)) {
            throw new AppException("Bạn không có quyền quản lý nhân viên này", HttpStatus.FORBIDDEN);
        }

        // Soft delete
        staff.setDeleted(true);
        staff.setDeletedAt(LocalDateTime.now());
        staffRepository.save(staff);

        // Revert user role back to OWNER (regular pet owner/client) if they don't have other staff roles
        User user = staff.getUserAccount();
        if (user != null && user.getRole() == Role.STAFF) {
            user.setRole(Role.OWNER);
            userRepository.save(user);
        }
    }

    private StaffResponse toResponse(Staff staff) {
        return StaffResponse.builder()
                .id(staff.getId())
                .userId(staff.getUserAccount().getId())
                .fullName(staff.getUserAccount().getFullName())
                .email(staff.getUserAccount().getEmail())
                .phone(staff.getUserAccount().getPhone())
                .jobPosition(staff.getJobPosition())
                .shiftStatus(staff.getShiftStatus())
                .workplaceId(staff.getWorkplace().getId())
                .workplaceName(staff.getWorkplace().getName())
                .build();
    }
}
