package com.petcare_hub.controller;

import com.petcare_hub.dto.response.UserResponse;
import com.petcare_hub.entity.User;
import com.petcare_hub.enums.Role;
import com.petcare_hub.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.BookingRepository;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.enums.BookingStatus;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Quản trị hệ thống")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final BookingRepository bookingRepository;

    // GET /api/admin/users
    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String role,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<User> users;
        if (role != null && !role.isEmpty()) {
            users = userRepository.findByRole(Role.valueOf(role), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return ResponseEntity.ok(users.map(this::toUserResponse));
    }

    // PATCH /api/admin/users/{id}/status
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> toggleUserStatus(
            @PathVariable UUID id,
            @RequestParam boolean active) {

        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(active);
        return ResponseEntity.ok(toUserResponse(userRepository.save(user)));
    }

    // Thống kê tổng quan
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers = userRepository.count();
        long totalHotels = hotelRepository.count();
        long activeHotels = hotelRepository.countByStatus(HotelStatus.ACTIVE);
        long totalBookings = bookingRepository.count();
        BigDecimal totalRevenue = bookingRepository.sumTotalAmount();

        return ResponseEntity.ok(Map.of(
            "totalUsers", totalUsers,
            "totalHotels", totalHotels,
            "activeHotels", activeHotels,
            "totalBookings", totalBookings,
            "totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO
        ));
    }

    // Booking theo status
    @GetMapping("/stats/bookings")
    public ResponseEntity<Map<String, Long>> getBookingStats() {
        return ResponseEntity.ok(Map.of(
            "PENDING",    bookingRepository.countByStatus(BookingStatus.PENDING),
            "CONFIRMED",  bookingRepository.countByStatus(BookingStatus.CONFIRMED),
            "CHECKED_IN", bookingRepository.countByStatus(BookingStatus.CHECKED_IN),
            "COMPLETED",  bookingRepository.countByStatus(BookingStatus.COMPLETED),
            "CANCELLED",  bookingRepository.countByStatus(BookingStatus.CANCELLED)
        ));
    }

    private UserResponse toUserResponse(User u) {
        return UserResponse.builder()
            .id(u.getId())
            .email(u.getEmail())
            .fullName(u.getFullName())
            .phone(u.getPhone())
            .role(u.getRole())
            .isActive(u.getIsActive())
            .isVerified(u.getIsVerified())
            .avatarUrl(u.getAvatarUrl())
            .createdAt(u.getCreatedAt())
            .build();
    }
}
