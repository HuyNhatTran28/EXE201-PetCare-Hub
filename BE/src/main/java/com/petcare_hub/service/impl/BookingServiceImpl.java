package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.entity.*;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.enums.DiscountType;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.*;
import com.petcare_hub.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository    bookingRepository;
    private final UserRepository       userRepository;
    private final HotelRepository      hotelRepository;
    private final RoomTypeRepository   roomTypeRepository;
    private final PetRepository        petRepository;
    private final VoucherRepository    voucherRepository;

    // Tỷ lệ hoa hồng mặc định 15%
    private static final double DEFAULT_COMMISSION_RATE = 0.15;
    // VAT 8%
    private static final double VAT_RATE = 0.08;
    // Phí tiện ích cố định
    private static final BigDecimal CONVENIENCE_FEE = BigDecimal.valueOf(10000);

    // ── Tạo Booking ───────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse createBooking(UUID ownerId, BookingRequest request) {

        // Validate ngày
        if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
            throw new AppException(
                "Ngày check-out phải sau ngày check-in",
                HttpStatus.BAD_REQUEST);
        }
        if (request.getCheckInDate().isBefore(LocalDate.now())) {
            throw new AppException(
                "Ngày check-in không được ở quá khứ",
                HttpStatus.BAD_REQUEST);
        }

        // Lấy các entity cần thiết
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        // Kiểm tra phòng còn trống không
        long overlapping = bookingRepository.countOverlappingBookings(
                roomType.getId(),
                request.getCheckInDate(),
                request.getCheckOutDate()
        );
        if (overlapping >= roomType.getTotalRooms()) {
            throw new AppException(
                "Không còn phòng trống trong khoảng thời gian này",
                HttpStatus.CONFLICT);
        }

        // Lấy danh sách pet
        List<Pet> pets = petRepository.findAllById(request.getPetIds());
        if (pets.size() != request.getPetIds().size()) {
            throw new AppException(
                "Một hoặc nhiều thú cưng không tồn tại",
                HttpStatus.BAD_REQUEST);
        }

        // Tính số đêm
        long totalNights = ChronoUnit.DAYS.between(
                request.getCheckInDate(), request.getCheckOutDate());

        // Tính tiền phòng
        BigDecimal roomTotal = roomType.getPricePerNight()
                .multiply(BigDecimal.valueOf(totalNights));

        // Tính giảm giá voucher
        BigDecimal voucherDiscount = BigDecimal.ZERO;
        Voucher voucher = null;
        if (request.getVoucherCode() != null) {
            voucher = validateAndApplyVoucher(
                    request.getVoucherCode(), roomTotal);
            voucherDiscount = calculateDiscount(voucher, roomTotal);
        }

        // Tính VAT
        BigDecimal subTotal = roomTotal.subtract(voucherDiscount);
        BigDecimal vatAmount = subTotal
                .multiply(BigDecimal.valueOf(VAT_RATE))
                .setScale(0, RoundingMode.HALF_UP);

        // Tổng tiền cuối
        BigDecimal totalAmount = subTotal
                .add(vatAmount)
                .add(CONVENIENCE_FEE);

        // Tính hoa hồng — snapshot tại thời điểm đặt
        BigDecimal commissionFee = roomTotal
                .multiply(BigDecimal.valueOf(DEFAULT_COMMISSION_RATE))
                .setScale(0, RoundingMode.HALF_UP);

        // Tạo invoice number
        String invoiceNumber = "INV-" + System.currentTimeMillis();

        // Tạo Booking
        Booking booking = Booking.builder()
                .owner(owner)
                .hotel(hotel)
                .roomType(roomType)
                .appliedVoucher(voucher)
                .pets(new HashSet<>(pets))
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .totalAmount(totalAmount)
                .commissionRate(DEFAULT_COMMISSION_RATE)
                .commissionFee(commissionFee)
                .convenienceFee(CONVENIENCE_FEE)
                .vatAmount(vatAmount)
                .voucherDiscountAmount(voucherDiscount)
                .loyaltyPointsUsed(0)
                .invoiceNumber(invoiceNumber)
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking mới: {} bởi owner: {}", saved.getInvoiceNumber(), ownerId);

        return toResponse(saved);
    }

    // ── Xem chi tiết ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId, UUID userId) {
        Booking booking = findBookingById(bookingId);
        return toResponse(booking);
    }

    // ── Owner xem booking của mình ────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(UUID ownerId, Pageable pageable) {
        return bookingRepository
                .findByOwnerIdOrderByCreatedAtDesc(ownerId, pageable)
                .map(this::toResponse);
    }

    // ── Partner xem booking KS ────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getHotelBookings(
            UUID hotelId, UUID partnerId, Pageable pageable) {
        return bookingRepository
                .findByHotelIdOrderByCreatedAtDesc(hotelId, pageable)
                .map(this::toResponse);
    }

    // ── Hủy booking ───────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, UUID userId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() == BookingStatus.CHECKED_IN ||
            booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException(
                "Không thể hủy booking đang hoặc đã hoàn tất",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        log.info("Booking {} đã bị hủy bởi: {}", bookingId, userId);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Check-in ──────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse checkIn(UUID bookingId, UUID staffId,
                                   String checkinPhotoUrl,
                                   String ownerSignatureUrl) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(
                "Chỉ có thể check-in booking đã CONFIRMED",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckinPhotoUrl(checkinPhotoUrl);
        booking.setOwnerSignatureUrl(ownerSignatureUrl);

        log.info("Booking {} đã CHECK_IN", bookingId);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Check-out ─────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse checkOut(UUID bookingId, UUID staffId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new AppException(
                "Chỉ có thể check-out booking đang CHECKED_IN",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.COMPLETED);
        log.info("Booking {} đã COMPLETED", bookingId);
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse confirmBooking(UUID bookingId) {
        Booking booking = findBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException(
                "Chỉ có thể xác nhận booking đang PENDING",
                HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        log.info("Booking {} đã CONFIRMED", bookingId);
        return toResponse(bookingRepository.save(booking));
    }

    // ── Private helpers ────────────────────────────────────────

    private Booking findBookingById(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy booking", HttpStatus.NOT_FOUND));
    }

    private Voucher validateAndApplyVoucher(String code, BigDecimal amount) {
        Voucher voucher = voucherRepository.findByVoucherCode(code)
                .orElseThrow(() -> new AppException(
                    "Mã voucher không tồn tại", HttpStatus.BAD_REQUEST));

        if (voucher.getVoucherStatus() != com.petcare_hub.enums.VoucherStatus.ACTIVE) {
            throw new AppException("Mã voucher đã hết hạn hoặc không còn hiệu lực",
                    HttpStatus.BAD_REQUEST);
        }

        if (voucher.getExpiresOn() != null &&
            voucher.getExpiresOn().isBefore(LocalDate.now())) {
            throw new AppException("Mã voucher đã hết hạn", HttpStatus.BAD_REQUEST);
        }

        if (voucher.getMaxUsageCount() != null &&
            voucher.getCurrentUsageCount() >= voucher.getMaxUsageCount()) {
            throw new AppException("Mã voucher đã hết lượt sử dụng",
                    HttpStatus.BAD_REQUEST);
        }

        // Tăng số lần dùng
        voucher.setCurrentUsageCount(voucher.getCurrentUsageCount() + 1);
        voucherRepository.save(voucher);

        return voucher;
    }

    private BigDecimal calculateDiscount(Voucher voucher, BigDecimal amount) {
        if (voucher.getDiscountType() == DiscountType.PERCENT) {
            return amount
                .multiply(voucher.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }
        return voucher.getDiscountValue().min(amount);
    }

    private BookingResponse toResponse(Booking b) {
        long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());

        List<BookingResponse.PetInfo> petInfos = b.getPets().stream()
                .map(p -> BookingResponse.PetInfo.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .species(p.getSpecies())
                        .build())
                .toList();

        return BookingResponse.builder()
                .id(b.getId())
                .invoiceNumber(b.getInvoiceNumber())
                .ownerId(b.getOwner().getId())
                .ownerName(b.getOwner().getFullName())
                .hotelId(b.getHotel().getId())
                .hotelName(b.getHotel().getName())
                .hotelAddress(b.getHotel().getAddress())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .pets(petInfos)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .totalNights((int) nights)
                .totalAmount(b.getTotalAmount())
                .commissionFee(b.getCommissionFee())
                .convenienceFee(b.getConvenienceFee())
                .vatAmount(b.getVatAmount())
                .voucherDiscountAmount(b.getVoucherDiscountAmount())
                .loyaltyPointsUsed(b.getLoyaltyPointsUsed())
                .status(b.getStatus())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
