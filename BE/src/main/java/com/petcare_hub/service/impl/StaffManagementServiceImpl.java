package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.CreateStaffRequest;
import com.petcare_hub.dto.response.StaffResponse;
import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.Staff;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.Role;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.StaffRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.service.AsyncEmailService;
import com.petcare_hub.service.StaffManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffManagementServiceImpl implements StaffManagementService {

    private final UserRepository     userRepository;
    private final StaffRepository    staffRepository;
    private final HotelRepository    hotelRepository;
    private final PasswordEncoder    passwordEncoder;
    private final AsyncEmailService  asyncEmailService;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    private static final String PASSWORD_CHARS =
        "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";

    private static String generateTempPassword() {
        SecureRandom random = new SecureRandom();
        return IntStream.range(0, 12)
            .mapToObj(i -> String.valueOf(PASSWORD_CHARS.charAt(random.nextInt(PASSWORD_CHARS.length()))))
            .collect(Collectors.joining());
    }

    @Override
    @Transactional
    public StaffResponse createStaff(UUID partnerId, CreateStaffRequest request) {
        Hotel hotel = hotelRepository.findByIdAndPartnerId(request.getHotelId(), partnerId)
                .orElseThrow(() -> new AppException(
                        "Khách sạn không tồn tại hoặc bạn không có quyền quản lý", HttpStatus.FORBIDDEN));

        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new AppException("Email đã được sử dụng bởi tài khoản khác", HttpStatus.CONFLICT);
        }

        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new AppException("Số điện thoại đã được sử dụng", HttpStatus.CONFLICT);
        }

        String tempPassword = generateTempPassword();

        User staffUser = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone())
                .role(Role.STAFF)
                .isVerified(true)
                .mustChangePassword(true)
                .build();
        staffUser = userRepository.save(staffUser);

        Staff staff = Staff.builder()
                .userAccount(staffUser)
                .workplace(hotel)
                .jobPosition(request.getJobPosition())
                .build();
        staff = staffRepository.save(staff);

        log.info("Partner {} tạo tài khoản nhân viên {} cho hotel {}",
                partnerId, staffUser.getEmail(), hotel.getId());

        // Gửi thông tin đăng nhập qua email — ASYNC, không chặn response
        // try-catch để mail lỗi (kể cả khi caller đồng bộ) không rollback transaction tạo staff
        try {
            asyncEmailService.sendStaffWelcomeEmailAsync(
                    staffUser.getEmail(),
                    staffUser.getFullName(),
                    hotel.getName(),
                    tempPassword,
                    frontendBaseUrl + "/login"
            );
        } catch (Exception e) {
            log.warn("Gửi mail nhân viên thất bại (không rollback tạo staff): {}", e.getMessage());
        }

        return toResponse(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffResponse> getStaffByHotel(UUID partnerId, UUID hotelId) {
        hotelRepository.findByIdAndPartnerId(hotelId, partnerId)
                .orElseThrow(() -> new AppException(
                        "Khách sạn không tồn tại hoặc bạn không có quyền quản lý", HttpStatus.FORBIDDEN));

        return staffRepository.findByWorkplaceIdAndDeletedFalseOrderByCreatedAtDesc(hotelId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StaffResponse toggleActive(UUID partnerId, UUID staffId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new AppException("Không tìm thấy nhân viên", HttpStatus.NOT_FOUND));

        hotelRepository.findByIdAndPartnerId(staff.getWorkplace().getId(), partnerId)
                .orElseThrow(() -> new AppException(
                        "Bạn không có quyền thay đổi nhân viên này", HttpStatus.FORBIDDEN));

        User user = staff.getUserAccount();
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);

        log.info("Partner {} {} tài khoản nhân viên {}",
                partnerId, user.getIsActive() ? "kích hoạt" : "vô hiệu hóa", user.getEmail());

        return toResponse(staff);
    }

    private StaffResponse toResponse(Staff staff) {
        User u  = staff.getUserAccount();
        Hotel h = staff.getWorkplace();
        return StaffResponse.builder()
                .id(staff.getId())
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .isActive(u.getIsActive())
                .jobPosition(staff.getJobPosition())
                .shiftStatus(staff.getShiftStatus())
                .workplaceId(h.getId())
                .workplaceName(h.getName())
                .createdAt(staff.getCreatedAt())
                .build();
    }
}
