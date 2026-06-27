package com.petcare_hub.service.impl;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.dto.response.BookingResponse;
import com.petcare_hub.entity.*;
import com.petcare_hub.enums.BookingStatus;
import com.petcare_hub.enums.BookingType;
import com.petcare_hub.enums.DiscountType;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.enums.BookingType;
import java.time.LocalTime;
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
import com.petcare_hub.service.AsyncEmailService;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
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
    private final AsyncEmailService    asyncEmailService;
    private final ReviewRepository     reviewRepository;
    private final PartnerWalletRepository partnerWalletRepository;
    private final ServiceRepository    serviceRepository;

    // Hoa hồng nền tảng: 8% trên tổng hóa đơn (totalAmount), đối tác nhận 92%
    private static final double DEFAULT_COMMISSION_RATE = 0.08;

    // VAT được inject từ app.vat-rate (8% đến hết 31/12/2026; sau đó về 10%)
    @Value("${app.vat-rate:0.08}")
    private double vatRate;

    // ── Tạo Booking ───────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse createBooking(UUID ownerId, BookingRequest request) {

        // Validate ngày & loại booking
        if (request.getCheckInDate().isBefore(LocalDate.now())) {
            throw new AppException(
                "Ngày check-in không được ở quá khứ",
                HttpStatus.BAD_REQUEST);
        }

        if (request.getBookingType() == BookingType.OVERNIGHT) {
            if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
                throw new AppException(
                    "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm",
                    HttpStatus.BAD_REQUEST);
            }
        } else { // DAYCARE
            if (request.getCheckOutDate().isBefore(request.getCheckInDate())) {
                throw new AppException(
                    "Ngày check-out không được trước ngày check-in",
                    HttpStatus.BAD_REQUEST);
            }
            if (request.getDropOffTime() == null || request.getPickUpTime() == null) {
                throw new AppException(
                    "Giờ gửi và giờ đón không được để trống",
                    HttpStatus.BAD_REQUEST);
            }
            if (!request.getDropOffTime().isBefore(request.getPickUpTime())) {
                throw new AppException(
                    "Giờ nhận phải trước giờ trả",
                    HttpStatus.BAD_REQUEST);
            }
        }

        // Lấy các entity cần thiết
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy khách sạn", HttpStatus.NOT_FOUND));

        if (hotel.getStatus() != HotelStatus.ACTIVE) {
            throw new AppException(
                "Khách sạn này hiện không nhận đặt phòng",
                HttpStatus.BAD_REQUEST);
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy loại phòng", HttpStatus.NOT_FOUND));

        if (request.getBookingType() == BookingType.DAYCARE && roomType.getDayRate() == null) {
            throw new AppException(
                "Loại phòng này không hỗ trợ dịch vụ gửi ngày",
                HttpStatus.BAD_REQUEST);
        }

        // Tính toán khoảng ngày thực tế để check room trống
        LocalDate reqStart = request.getCheckInDate();
        LocalDate reqEnd = request.getBookingType() == BookingType.DAYCARE ? 
                request.getCheckOutDate() : request.getCheckOutDate().minusDays(1);

        // Kiểm tra phòng còn trống không
        long overlapping = bookingRepository.countOverlappingBookings(
                roomType.getId(),
                reqStart,
                reqEnd
        );
        if (overlapping >= roomType.getTotalRooms()) {
            throw new AppException(
                "Loại phòng này đã hết chỗ trong thời gian bạn chọn",
                HttpStatus.CONFLICT);
        }

        // Lấy danh sách pet
        List<Pet> pets = petRepository.findAllById(request.getPetIds());
        if (pets.size() != request.getPetIds().size()) {
            throw new AppException(
                "Một hoặc nhiều thú cưng không tồn tại",
                HttpStatus.BAD_REQUEST);
        }

        // Validate dịch vụ và snapshot giá từ DB (KHÔNG lấy giá từ client)
        BigDecimal serviceTotal = BigDecimal.ZERO;
        List<BookedService> bookedServices = new ArrayList<>();
        if (request.getServiceIds() != null && !request.getServiceIds().isEmpty()) {
            List<UUID> distinctServiceIds = request.getServiceIds().stream().distinct().toList();
            for (UUID svcId : distinctServiceIds) {
                com.petcare_hub.entity.Service svc = serviceRepository.findById(svcId)
                        .orElseThrow(() -> new AppException(
                            "Dịch vụ không tồn tại: " + svcId, HttpStatus.BAD_REQUEST));
                if (!svc.getHotel().getId().equals(hotel.getId())) {
                    throw new AppException(
                        "Dịch vụ '" + svc.getName() + "' không thuộc khách sạn này",
                        HttpStatus.BAD_REQUEST);
                }
                bookedServices.add(BookedService.builder()
                        .service(svc)
                        .priceSnapshot(svc.getPrice())
                        .build());
                serviceTotal = serviceTotal.add(svc.getPrice());
            }
        }

        // Tính tiền phòng
        BigDecimal roomTotal = BigDecimal.ZERO;
        if (request.getBookingType() == BookingType.DAYCARE) {
            long totalDays = ChronoUnit.DAYS.between(
                    request.getCheckInDate(), request.getCheckOutDate()) + 1;
            roomTotal = roomType.getDayRate()
                    .multiply(BigDecimal.valueOf(totalDays))
                    .setScale(0, RoundingMode.HALF_UP);
        } else {
            long totalNights = ChronoUnit.DAYS.between(
                    request.getCheckInDate(), request.getCheckOutDate());
            roomTotal = roomType.getPricePerNight()
                    .multiply(BigDecimal.valueOf(totalNights))
                    .setScale(0, RoundingMode.HALF_UP);
        }

        // Tính giảm giá voucher
        BigDecimal voucherDiscount = BigDecimal.ZERO;
        Voucher voucher = null;
        if (request.getVoucherCode() != null) {
            voucher = validateAndApplyVoucher(
                    request.getVoucherCode(), roomTotal);
            voucherDiscount = calculateDiscount(voucher, roomTotal);
        }

        // Tính VAT — áp lên cả phòng + dịch vụ (sau khi trừ voucher)
        BigDecimal taxableBase = roomTotal.subtract(voucherDiscount).add(serviceTotal);
        BigDecimal vatAmount = taxableBase
                .multiply(BigDecimal.valueOf(vatRate))
                .setScale(0, RoundingMode.HALF_UP);

        // Tổng tiền cuối = taxableBase + VAT (không còn phí tiện ích cố định)
        BigDecimal totalAmount = taxableBase.add(vatAmount);

        // Hoa hồng = rate × totalAmount (tổng hóa đơn khách trả), snapshot tại thời điểm đặt
        BigDecimal commissionFee = totalAmount
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
                .bookingType(request.getBookingType())
                .dropOffTime(request.getBookingType() == BookingType.DAYCARE ? request.getDropOffTime() : null)
                .pickUpTime(request.getBookingType() == BookingType.DAYCARE ? request.getPickUpTime() : null)
                .totalAmount(totalAmount)
                .commissionRate(DEFAULT_COMMISSION_RATE)
                .commissionFee(commissionFee)
                .convenienceFee(BigDecimal.ZERO)
                .vatRate(vatRate)
                .vatAmount(vatAmount)
                .voucherDiscountAmount(voucherDiscount)
                .loyaltyPointsUsed(0)
                .invoiceNumber(invoiceNumber)
                .status(BookingStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .build();

        // Gắn dịch vụ vào booking — CascadeType.ALL lưu BookedService cùng lúc
        for (BookedService item : bookedServices) {
            item.setBooking(booking);
            booking.getServices().add(item);
        }

        Booking saved = bookingRepository.save(booking);
        log.info("Booking mới: {} bởi owner: {}", saved.getInvoiceNumber(), ownerId);

        // Email gửi async — không block HTTP response thread
        asyncEmailService.sendInvoiceEmailAsync(
            saved.getInvoiceNumber(),
            saved.getOwner().getEmail(),
            saved.getOwner().getFullName(),
            saved.getHotel().getName(),
            saved.getRoomType().getName(),
            saved.getCheckInDate(),
            saved.getCheckOutDate(),
            saved.getTotalAmount(),
            saved.getPaymentMethod()
        );

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

        // partnerShare = totalAmount − commissionFee, đọc rate từ snapshot
        BigDecimal totalAmount = booking.getTotalAmount();
        BigDecimal commissionFee = totalAmount
                .multiply(BigDecimal.valueOf(booking.getCommissionRate()))
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal partnerShare = totalAmount.subtract(commissionFee).setScale(0, RoundingMode.HALF_UP);
        User partner = booking.getHotel().getPartner();
        if (partner != null) {
            PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partner.getId())
                    .orElseGet(() -> {
                        PartnerWallet newWallet = new PartnerWallet();
                        newWallet.setPartner(partner);
                        newWallet.setBalance(BigDecimal.ZERO);
                        newWallet.setPendingBalance(BigDecimal.ZERO);
                        return partnerWalletRepository.save(newWallet);
                    });

            BigDecimal pendingToDeduct = wallet.getPendingBalance().min(partnerShare);
            wallet.setPendingBalance(wallet.getPendingBalance().subtract(pendingToDeduct));
            wallet.setBalance(wallet.getBalance().add(partnerShare));
            partnerWalletRepository.save(wallet);
            log.info("Check-out booking {}: Chuyển {} VNĐ từ pendingBalance sang balance khả dụng cho đối tác {}", 
                    bookingId, partnerShare, partner.getEmail());
        }

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
        Booking saved = bookingRepository.save(booking);
        log.info("Booking {} đã CONFIRMED", bookingId);

        asyncEmailService.sendConfirmEmailAsync(
            saved.getInvoiceNumber(),
            saved.getOwner().getEmail(),
            saved.getOwner().getFullName(),
            saved.getHotel().getName(),
            saved.getRoomType().getName(),
            saved.getCheckInDate(),
            saved.getCheckOutDate(),
            saved.getTotalAmount()
        );

        return toResponse(saved);
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

        boolean isReviewed = reviewRepository.existsByBookingId(b.getId());

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
                .bookingType(b.getBookingType())
                .dropOffTime(b.getDropOffTime())
                .pickUpTime(b.getPickUpTime())
                .totalDays((int) (nights + 1))
                .totalAmount(b.getTotalAmount())
                .commissionFee(b.getCommissionFee())
                .convenienceFee(b.getConvenienceFee())
                .vatAmount(b.getVatAmount())
                .voucherDiscountAmount(b.getVoucherDiscountAmount())
                .loyaltyPointsUsed(b.getLoyaltyPointsUsed())
                .status(b.getStatus())
                .paymentMethod(b.getPaymentMethod())
                .createdAt(b.getCreatedAt())
                .isReviewed(isReviewed)
                .build();
    }
}
