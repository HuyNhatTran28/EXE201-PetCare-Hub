package com.petcare_hub.payment;

import com.petcare_hub.dto.request.BookingRequest;
import com.petcare_hub.entity.*;
import com.petcare_hub.enums.*;
import com.petcare_hub.exception.AppException;
import com.petcare_hub.repository.*;
import com.petcare_hub.service.AsyncEmailService;
import com.petcare_hub.service.impl.BookingServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit test cho BookingServiceImpl.createBooking() — tập trung vào tính toán hóa đơn có dịch vụ.
 *
 * Covers:
 *   S  – Booking có dịch vụ: totalAmount = (room + services) × 1.08; commission đúng
 *   T  – Dịch vụ thuộc hotel khác → AppException
 *   U  – ServiceId không tồn tại → AppException
 *   V  – priceSnapshot lưu giá từ DB, không bị ảnh hưởng khi giá Service thay đổi sau này
 *   W  – serviceId trùng trong request → dedup, chỉ tạo 1 BookedService, charge 1 lần
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BookingServiceImpl — createBooking với dịch vụ")
class BookingCreateTest {

    @Mock private BookingRepository         bookingRepository;
    @Mock private UserRepository            userRepository;
    @Mock private HotelRepository           hotelRepository;
    @Mock private RoomTypeRepository        roomTypeRepository;
    @Mock private PetRepository             petRepository;
    @Mock private VoucherRepository         voucherRepository;
    @Mock private AsyncEmailService         asyncEmailService;
    @Mock private ReviewRepository          reviewRepository;
    @Mock private PartnerWalletRepository   partnerWalletRepository;
    @Mock private ServiceRepository         serviceRepository;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private static final UUID OWNER_ID     = UUID.randomUUID();
    private static final UUID HOTEL_ID     = UUID.randomUUID();
    private static final UUID ROOM_TYPE_ID = UUID.randomUUID();
    private static final UUID PET_ID       = UUID.randomUUID();
    private static final UUID SVC_ID_1     = UUID.randomUUID();
    private static final UUID SVC_ID_2     = UUID.randomUUID();

    // room 200.000/đêm × 2 đêm = 400.000; services: 100.000 + 50.000 = 150.000
    // taxableBase = 550.000; VAT(8%) = 44.000; total = 594.000 (không còn +10.000 phí tiện ích)
    private static final BigDecimal PRICE_PER_NIGHT = new BigDecimal("200000");
    private static final BigDecimal SVC1_PRICE      = new BigDecimal("100000");
    private static final BigDecimal SVC2_PRICE      = new BigDecimal("50000");
    private static final BigDecimal EXPECTED_TOTAL  = new BigDecimal("594000");
    private static final BigDecimal EXPECTED_COMMISSION = new BigDecimal("47520"); // 594000×0.08
    private static final BigDecimal EXPECTED_PARTNER    = new BigDecimal("546480"); // 594000−47520

    private Hotel   hotelMock;
    private Hotel   otherHotelMock;

    // ─── Setup ────────────────────────────────────────────────────────────────

    @BeforeEach
    void setup() {
        // @Value("${app.vat-rate}") không được inject bởi @InjectMocks — phải set thủ công
        ReflectionTestUtils.setField(bookingService, "vatRate", 0.08);

        User owner = mock(User.class);
        when(owner.getId()).thenReturn(OWNER_ID);
        when(owner.getFullName()).thenReturn("Nguyen Van A");
        when(owner.getEmail()).thenReturn("owner@test.com");
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));

        hotelMock = mock(Hotel.class);
        when(hotelMock.getId()).thenReturn(HOTEL_ID);
        when(hotelMock.getName()).thenReturn("Test Hotel");
        when(hotelMock.getAddress()).thenReturn("123 Test St");
        when(hotelMock.getStatus()).thenReturn(HotelStatus.ACTIVE);
        when(hotelRepository.findById(HOTEL_ID)).thenReturn(Optional.of(hotelMock));

        otherHotelMock = mock(Hotel.class);
        when(otherHotelMock.getId()).thenReturn(UUID.randomUUID()); // khác HOTEL_ID
        when(otherHotelMock.getStatus()).thenReturn(HotelStatus.ACTIVE);

        RoomType roomType = mock(RoomType.class);
        when(roomType.getId()).thenReturn(ROOM_TYPE_ID);
        when(roomType.getName()).thenReturn("Standard Room");
        when(roomType.getPricePerNight()).thenReturn(PRICE_PER_NIGHT);
        when(roomType.getTotalRooms()).thenReturn(5);
        when(roomTypeRepository.findById(ROOM_TYPE_ID)).thenReturn(Optional.of(roomType));

        when(bookingRepository.countOverlappingBookings(any(), any(), any())).thenReturn(0L);

        Pet pet = mock(Pet.class);
        when(pet.getId()).thenReturn(PET_ID);
        when(pet.getName()).thenReturn("Mochi");
        when(pet.getSpecies()).thenReturn("Cat");
        when(petRepository.findAllById(any())).thenReturn(List.of(pet));

        when(reviewRepository.existsByBookingId(any())).thenReturn(false);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Tạo service mock thuộc đúng hotel */
    private com.petcare_hub.entity.Service mockService(UUID id, BigDecimal price, Hotel hotel) {
        com.petcare_hub.entity.Service svc = mock(com.petcare_hub.entity.Service.class);
        when(svc.getId()).thenReturn(id);
        when(svc.getName()).thenReturn("Service-" + id.toString().substring(0, 4));
        when(svc.getPrice()).thenReturn(price);
        when(svc.getHotel()).thenReturn(hotel);
        when(serviceRepository.findById(id)).thenReturn(Optional.of(svc));
        return svc;
    }

    /** BookingRequest với 2 đêm, có serviceIds */
    private BookingRequest buildRequest(List<UUID> serviceIds) {
        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(3)); // 2 đêm
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(serviceIds);
        req.setPaymentMethod(PaymentMethod.VIETQR);
        return req;
    }

    /** Mock booking trả về từ bookingRepository.save() để satisfy toResponse() */
    private Booking savedBookingMock() {
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(OWNER_ID);
        when(owner.getFullName()).thenReturn("Nguyen Van A");

        Booking b = mock(Booking.class);
        when(b.getId()).thenReturn(UUID.randomUUID());
        when(b.getStatus()).thenReturn(BookingStatus.PENDING);
        when(b.getTotalAmount()).thenReturn(EXPECTED_TOTAL);
        when(b.getCommissionFee()).thenReturn(EXPECTED_COMMISSION);
        when(b.getConvenienceFee()).thenReturn(BigDecimal.ZERO);
        when(b.getVatAmount()).thenReturn(new BigDecimal("44000"));
        when(b.getVoucherDiscountAmount()).thenReturn(BigDecimal.ZERO);
        when(b.getLoyaltyPointsUsed()).thenReturn(0);
        when(b.getOwner()).thenReturn(owner);
        when(b.getHotel()).thenReturn(hotelMock);
        when(b.getRoomType()).thenReturn(mock(RoomType.class));
        when(b.getPets()).thenReturn(new HashSet<>());
        when(b.getCheckInDate()).thenReturn(LocalDate.now().plusDays(1));
        when(b.getCheckOutDate()).thenReturn(LocalDate.now().plusDays(3));
        when(b.getInvoiceNumber()).thenReturn("INV-TEST");
        when(b.getPaymentMethod()).thenReturn(PaymentMethod.VIETQR);
        when(b.getCreatedAt()).thenReturn(LocalDateTime.now());
        return b;
    }

    // ─── TEST S ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[S] Booking có dịch vụ: totalAmount = (room+services)×1.08; commission = 8%")
    void S_createBooking_withServices_correctTotalAndCommission() {
        // room: 200000/đêm × 2 = 400000; svc1: 100000; svc2: 50000
        // taxableBase = 550000; vatAmount(8%) = 44000; total = 594000 (không +10000)
        // commissionFee = 47520; partnerShare = 546480; sum = 594000
        mockService(SVC_ID_1, SVC1_PRICE, hotelMock);
        mockService(SVC_ID_2, SVC2_PRICE, hotelMock);

        // Capture booking thực tế được truyền vào save()
        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, buildRequest(List.of(SVC_ID_1, SVC_ID_2)));

        Booking b = captured[0];

        // Tổng hóa đơn bao gồm cả dịch vụ
        assertThat(b.getTotalAmount())
                .as("totalAmount phải = (room+services)×1.08 = 594000 (không còn +10000)")
                .isEqualByComparingTo(EXPECTED_TOTAL);

        // Commission 8% trên totalAmount
        assertThat(b.getCommissionFee())
                .as("commissionFee = 594000 × 0.08 = 47520")
                .isEqualByComparingTo(EXPECTED_COMMISSION);

        // Accounting identity
        assertThat(b.getCommissionFee().add(EXPECTED_PARTNER))
                .as("commissionFee + partnerShare = totalAmount")
                .isEqualByComparingTo(b.getTotalAmount());

        // Số tiền gửi PayOS = totalAmount (đã gồm dịch vụ)
        assertThat(b.getTotalAmount().longValue())
                .as("PayOS amount = booking.getTotalAmount().longValue() = 594000")
                .isEqualTo(594000L);

        // 2 BookedService được đính kèm với đúng priceSnapshot
        assertThat(b.getServices()).hasSize(2);
        assertThat(b.getServices())
                .extracting(BookedService::getPriceSnapshot)
                .containsExactlyInAnyOrder(SVC1_PRICE, SVC2_PRICE);
    }

    // ─── TEST T ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[T] Dịch vụ thuộc hotel khác → AppException, booking không được tạo")
    void T_createBooking_serviceFromDifferentHotel_throwsException() {
        mockService(SVC_ID_1, SVC1_PRICE, otherHotelMock); // hotel khác!

        assertThatThrownBy(() ->
                bookingService.createBooking(OWNER_ID, buildRequest(List.of(SVC_ID_1))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("không thuộc khách sạn này");

        verify(bookingRepository, never()).save(any());
    }

    // ─── TEST U ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[U] ServiceId không tồn tại trong DB → AppException")
    void U_createBooking_serviceNotFound_throwsException() {
        UUID unknownId = UUID.randomUUID();
        when(serviceRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                bookingService.createBooking(OWNER_ID, buildRequest(List.of(unknownId))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Dịch vụ không tồn tại");

        verify(bookingRepository, never()).save(any());
    }

    // ─── TEST V ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[V] priceSnapshot lưu giá từ DB — thay đổi giá Service sau này không ảnh hưởng")
    void V_priceSnapshot_immutable_afterServicePriceChange() {
        BigDecimal priceAtBookingTime = new BigDecimal("100000");
        com.petcare_hub.entity.Service svc = mockService(SVC_ID_1, priceAtBookingTime, hotelMock);

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, buildRequest(List.of(SVC_ID_1)));

        // Giả lập giá thay đổi sau khi đặt
        when(svc.getPrice()).thenReturn(new BigDecimal("200000"));

        // priceSnapshot trong BookedService vẫn là giá lúc đặt
        BookedService item = captured[0].getServices().iterator().next();
        assertThat(item.getPriceSnapshot())
                .as("priceSnapshot phải = 100000 (giá lúc đặt), không bị ảnh hưởng khi giá thay đổi")
                .isEqualByComparingTo(priceAtBookingTime);

        assertThat(item.getPriceSnapshot())
                .as("priceSnapshot ≠ giá hiện tại 200000")
                .isNotEqualByComparingTo(new BigDecimal("200000"));
    }

    // ─── TEST W ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[W] serviceId trùng trong request → dedup, chỉ tạo 1 BookedService, charge 1 lần")
    void W_duplicateServiceId_deduped_chargedOnce() {
        // SVC_ID_1 xuất hiện 3 lần trong request
        mockService(SVC_ID_1, SVC1_PRICE, hotelMock);

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID,
                buildRequest(List.of(SVC_ID_1, SVC_ID_1, SVC_ID_1)));

        Booking b = captured[0];

        // Chỉ 1 BookedService — không tính đôi
        assertThat(b.getServices())
                .as("dedup → chỉ 1 BookedService dù serviceId gửi 3 lần")
                .hasSize(1);

        // serviceTotal = 100,000 (1 lần), không phải 300,000 (3 lần)
        // taxableBase = roomTotal(400,000) + serviceTotal(100,000) = 500,000
        // vatAmount(8%) = 40,000; totalAmount = 540,000 (không +10,000)
        BigDecimal expectedTotal = new BigDecimal("540000");
        assertThat(b.getTotalAmount())
                .as("totalAmount = 540,000 (service charge 1 lần, không phải 3 lần)")
                .isEqualByComparingTo(expectedTotal);
    }

    // ─── TEST X ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[X] check-in = check-out (0 đêm) → AppException HTTP 400, booking không được tạo")
    void X_checkInEqualsCheckOut_throwsException() {
        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        req.setCheckInDate(tomorrow);
        req.setCheckOutDate(tomorrow); // cùng ngày → 0 đêm
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);

        assertThatThrownBy(() -> bookingService.createBooking(OWNER_ID, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("ít nhất 1 đêm");

        verify(bookingRepository, never()).save(any());
    }

    // ─── TEST Y ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[Y] Đặt 2 đêm → roomTotal = pricePerNight × 2, không bị ép thành 1 đêm")
    void Y_twoNights_roomTotalIsDoubled() {
        // 2 đêm × 200,000 = 400,000; taxableBase = 400,000 (không dịch vụ)
        // vatAmount(8%) = 32,000; totalAmount = 432,000
        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(3)); // 2 đêm
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, req);

        BigDecimal expectedRoomTotal = PRICE_PER_NIGHT.multiply(BigDecimal.valueOf(2)); // 400,000
        BigDecimal expectedVat = expectedRoomTotal.multiply(BigDecimal.valueOf(0.08)).setScale(0, java.math.RoundingMode.HALF_UP); // 32,000
        BigDecimal expectedTotal = expectedRoomTotal.add(expectedVat); // 432,000

        assertThat(captured[0].getTotalAmount())
                .as("2 đêm × 200,000 × 1.08 = 432,000 (roomTotal KHÔNG bị ép thành 1 đêm)")
                .isEqualByComparingTo(expectedTotal);
    }

    // ─── DAYCARE TESTS ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Đặt Daycare cùng ngày (1 ngày) -> roomTotal = dayRate * 1")
    void testCreateDaycareBookingSameDay() {
        RoomType roomType = roomTypeRepository.findById(ROOM_TYPE_ID).orElseThrow();
        when(roomType.getDayRate()).thenReturn(new BigDecimal("150000"));

        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(1)); // Cùng ngày
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);
        req.setBookingType(BookingType.DAYCARE);
        req.setDropOffTime(LocalTime.of(8, 0));
        req.setPickUpTime(LocalTime.of(18, 0));

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, req);

        Booking b = captured[0];
        assertThat(b.getBookingType()).isEqualTo(BookingType.DAYCARE);
        assertThat(b.getDropOffTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(b.getPickUpTime()).isEqualTo(LocalTime.of(18, 0));

        // roomTotal = 150.000 * 1 = 150.000
        // VAT(8%) = 12.000
        // totalAmount = 162.000
        assertThat(b.getTotalAmount()).isEqualByComparingTo(new BigDecimal("162000"));
    }

    @Test
    @DisplayName("Đặt Daycare nhiều ngày (3 ngày) -> roomTotal = dayRate * 3")
    void testCreateDaycareBookingMultipleDays() {
        RoomType roomType = roomTypeRepository.findById(ROOM_TYPE_ID).orElseThrow();
        when(roomType.getDayRate()).thenReturn(new BigDecimal("150000"));

        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(3)); // 3 ngày
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);
        req.setBookingType(BookingType.DAYCARE);
        req.setDropOffTime(LocalTime.of(8, 0));
        req.setPickUpTime(LocalTime.of(18, 0));

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, req);

        Booking b = captured[0];
        // roomTotal = 150.000 * 3 = 450.000
        // VAT(8%) = 36.000
        // totalAmount = 486.000
        assertThat(b.getTotalAmount()).isEqualByComparingTo(new BigDecimal("486000"));
    }

    @Test
    @DisplayName("Đặt Daycare ở phòng không hỗ trợ Daycare -> ném AppException")
    void testCreateDaycareMissingDayRate() {
        RoomType roomType = roomTypeRepository.findById(ROOM_TYPE_ID).orElseThrow();
        when(roomType.getDayRate()).thenReturn(null); // Không có dayRate

        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(1));
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);
        req.setBookingType(BookingType.DAYCARE);
        req.setDropOffTime(LocalTime.of(8, 0));
        req.setPickUpTime(LocalTime.of(18, 0));

        assertThatThrownBy(() -> bookingService.createBooking(OWNER_ID, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("không hỗ trợ dịch vụ gửi ngày");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt Daycare có giờ nhận >= giờ trả -> ném AppException")
    void testCreateDaycareInvalidTimes() {
        RoomType roomType = roomTypeRepository.findById(ROOM_TYPE_ID).orElseThrow();
        when(roomType.getDayRate()).thenReturn(new BigDecimal("150000"));

        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(1));
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of());
        req.setPaymentMethod(PaymentMethod.VIETQR);
        req.setBookingType(BookingType.DAYCARE);
        req.setDropOffTime(LocalTime.of(17, 0));
        req.setPickUpTime(LocalTime.of(8, 0)); // Nhận sau Trả!

        assertThatThrownBy(() -> bookingService.createBooking(OWNER_ID, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Giờ nhận phải trước giờ trả");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt Daycare có dịch vụ đi kèm -> dịch vụ tính 1 lần duy nhất")
    void testCreateDaycareWithServices() {
        RoomType roomType = roomTypeRepository.findById(ROOM_TYPE_ID).orElseThrow();
        when(roomType.getDayRate()).thenReturn(new BigDecimal("150000"));

        mockService(SVC_ID_1, SVC1_PRICE, hotelMock); // 100.000

        BookingRequest req = new BookingRequest();
        req.setHotelId(HOTEL_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setCheckInDate(LocalDate.now().plusDays(1));
        req.setCheckOutDate(LocalDate.now().plusDays(3)); // 3 ngày
        req.setPetIds(List.of(PET_ID));
        req.setServiceIds(List.of(SVC_ID_1));
        req.setPaymentMethod(PaymentMethod.VIETQR);
        req.setBookingType(BookingType.DAYCARE);
        req.setDropOffTime(LocalTime.of(8, 0));
        req.setPickUpTime(LocalTime.of(18, 0));

        Booking[] captured = new Booking[1];
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return savedBookingMock();
        });

        bookingService.createBooking(OWNER_ID, req);

        Booking b = captured[0];
        // roomTotal = 150.000 * 3 = 450.000
        // serviceTotal = 100.000 (tính 1 lần duy nhất)
        // taxableBase = 550.000
        // VAT(8%) = 44.000
        // totalAmount = 594.000
        assertThat(b.getTotalAmount()).isEqualByComparingTo(new BigDecimal("594000"));
        assertThat(b.getServices()).hasSize(1);
    }
}
