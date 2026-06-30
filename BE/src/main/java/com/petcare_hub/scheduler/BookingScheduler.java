package com.petcare_hub.scheduler;

import com.petcare_hub.entity.Booking;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final com.petcare_hub.service.AsyncEmailService emailService;

    /**
     * Tự động quét hệ thống mỗi phút:
     * 1. Hủy các đơn đặt phòng PENDING quá 15 phút.
     * 2. Gửi email nhắc nhở thanh toán khi PENDING đạt 8 phút.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processPendingBookings() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Quét và Hủy các booking PENDING quá 15 phút
        LocalDateTime expireTime = now.minusMinutes(15);
        List<Booking> expiredBookings = bookingRepository.findExpiredPendingBookings(expireTime);
        if (!expiredBookings.isEmpty()) {
            log.info("Quét hệ thống: Phát hiện {} đơn đặt phòng PENDING đã quá 15 phút", expiredBookings.size());
            for (Booking booking : expiredBookings) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                log.info("Đã tự động hủy đơn đặt phòng hết hạn: {}", booking.getId());
            }
        }

        // 2. Quét và Gửi email nhắc nhở cho các booking PENDING đã quá 8 phút (nhưng chưa quá 15 phút)
        LocalDateTime reminderTime = now.minusMinutes(8);
        List<Booking> needingReminder = bookingRepository.findPendingBookingsNeedingReminder(reminderTime);
        if (!needingReminder.isEmpty()) {
            log.info("Quét hệ thống: Phát hiện {} đơn đặt phòng PENDING cần gửi email nhắc nhở (đã quá 8 phút)", needingReminder.size());
            for (Booking booking : needingReminder) {
                booking.setReminderSent(true);
                bookingRepository.save(booking);
                
                // Gửi mail async
                emailService.sendPaymentReminderEmailAsync(
                    booking.getInvoiceNumber(),
                    booking.getOwner().getEmail(),
                    booking.getOwner().getFullName(),
                    booking.getHotel().getName(),
                    booking.getRoomType().getName(),
                    booking.getCheckInDate(),
                    booking.getCheckOutDate(),
                    booking.getTotalAmount()
                );
                log.info("Đã gửi email nhắc nhở thanh toán cho đặt phòng: {}", booking.getId());
            }
        }

        // 3. Quét và Hủy các đơn CASH PENDING quá 24 giờ (đối tác không xác nhận)
        LocalDateTime cashExpireTime = now.minusHours(24);
        List<Booking> expiredCashBookings = bookingRepository.findExpiredCashPendingBookings(cashExpireTime);
        if (!expiredCashBookings.isEmpty()) {
            log.info("Quét hệ thống: Phát hiện {} đơn đặt phòng CASH PENDING đã quá 24 giờ", expiredCashBookings.size());
            for (Booking booking : expiredCashBookings) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                log.info("Đã tự động hủy đơn đặt phòng CASH hết hạn: {}", booking.getId());
            }
        }
    }
}
