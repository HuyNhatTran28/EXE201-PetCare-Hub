package com.petcare_hub.payment;

import com.petcare_hub.entity.*;
import com.petcare_hub.enums.*;
import com.petcare_hub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
@DisplayName("BookingRepository - countOverlappingBookings Integration Test")
class BookingOverlapIntegrationTest {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    private User testUser;
    private Hotel testHotel;
    private RoomType roomA;

    @BeforeEach
    void setUp() {
        // Setup User
        testUser = User.builder()
                .email("test_overlap_" + UUID.randomUUID() + "@example.com")
                .fullName("Test Overlap User")
                .role(Role.OWNER)
                .build();
        testUser = userRepository.save(testUser);

        // Setup Hotel
        testHotel = Hotel.builder()
                .name("Integration Test Hotel")
                .address("123 Test Street")
                .status(HotelStatus.ACTIVE)
                .build();
        testHotel = hotelRepository.save(testHotel);

        // Setup RoomType Phòng A (totalRooms = 1)
        roomA = RoomType.builder()
                .hotel(testHotel)
                .name("Phòng A")
                .pricePerNight(new BigDecimal("200000"))
                .dayRate(new BigDecimal("150000"))
                .maxPets(2)
                .totalRooms(1)
                .allowedPetTypes(Collections.singletonList("CAT"))
                .build();
        roomA = roomTypeRepository.save(roomA);
    }

    private void createExistingBooking(LocalDate checkIn, LocalDate checkOut, BookingType type) {
        Booking booking = Booking.builder()
                .owner(testUser)
                .hotel(testHotel)
                .roomType(roomA)
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .bookingType(type)
                .status(BookingStatus.CONFIRMED)
                .totalAmount(new BigDecimal("500000"))
                .commissionRate(0.08)
                .vatRate(0.08)
                .invoiceNumber("INV-INTEG-" + UUID.randomUUID())
                .paymentMethod(PaymentMethod.VIETQR)
                .build();
        bookingRepository.save(booking);
    }

    @Test
    @DisplayName("Case 1: Existing OVERNIGHT 22->23, đặt DAYCARE 22 (reqStart=22,reqEnd=22) -> count=1")
    void testCase1() {
        LocalDate start = LocalDate.of(2026, 6, 22);
        LocalDate end = LocalDate.of(2026, 6, 23);
        createExistingBooking(start, end, BookingType.OVERNIGHT);

        long count = bookingRepository.countOverlappingBookings(
                roomA.getId(),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 22)
        );
        assertThat(count).isEqualTo(1L);
    }

    @Test
    @DisplayName("Case 2: Existing OVERNIGHT 21->22, đặt DAYCARE 22 (reqStart=22,reqEnd=22) -> count=0")
    void testCase2() {
        LocalDate start = LocalDate.of(2026, 6, 21);
        LocalDate end = LocalDate.of(2026, 6, 22);
        createExistingBooking(start, end, BookingType.OVERNIGHT);

        long count = bookingRepository.countOverlappingBookings(
                roomA.getId(),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 22)
        );
        assertThat(count).isEqualTo(0L);
    }

    @Test
    @DisplayName("Case 3: Existing DAYCARE 22, đặt DAYCARE 22 (reqStart=22,reqEnd=22) -> count=1")
    void testCase3() {
        LocalDate start = LocalDate.of(2026, 6, 22);
        LocalDate end = LocalDate.of(2026, 6, 22);
        createExistingBooking(start, end, BookingType.DAYCARE);

        long count = bookingRepository.countOverlappingBookings(
                roomA.getId(),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 22)
        );
        assertThat(count).isEqualTo(1L);
    }

    @Test
    @DisplayName("Case 4: Existing DAYCARE 23, đặt OVERNIGHT 22->24 (reqStart=22,reqEnd=23) -> count=1")
    void testCase4() {
        LocalDate start = LocalDate.of(2026, 6, 23);
        LocalDate end = LocalDate.of(2026, 6, 23);
        createExistingBooking(start, end, BookingType.DAYCARE);

        long count = bookingRepository.countOverlappingBookings(
                roomA.getId(),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 23)
        );
        assertThat(count).isEqualTo(1L);
    }

    @Test
    @DisplayName("Case 5: Existing DAYCARE 20, đặt DAYCARE 22 (reqStart=22,reqEnd=22) -> count=0")
    void testCase5() {
        LocalDate start = LocalDate.of(2026, 6, 20);
        LocalDate end = LocalDate.of(2026, 6, 20);
        createExistingBooking(start, end, BookingType.DAYCARE);

        long count = bookingRepository.countOverlappingBookings(
                roomA.getId(),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 22)
        );
        assertThat(count).isEqualTo(0L);
    }
}
