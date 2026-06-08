package com.petcare_hub.configuration;

import com.petcare_hub.entity.*;
import com.petcare_hub.enums.*;
import com.petcare_hub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

// @Component  // Disabled: DataSeeder chỉ dùng khi demo — không chạy trên production
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingRepository bookingRepository;
    private final StaffRepository staffRepository;
    private final EquipmentRepository equipmentRepository;
    private final PetRepository petRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final PartnerWalletRepository partnerWalletRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("=== STARTING DATABASE SEEDING FOR CLIENT DEMO ===");

        // 1. Get or Create Partner User
        User partner = userRepository.findByEmail("newpartner@gmail.com").orElse(null);
        if (partner == null) {
            partner = User.builder()
                    .email("newpartner@gmail.com")
                    .passwordHash(passwordEncoder.encode("123123123"))
                    .fullName("New Partner")
                    .phone("0912345678")
                    .role(Role.PARTNER)
                    .isActive(true)
                    .isVerified(true)
                    .build();
            partner = userRepository.save(partner);
            log.info("Created new partner account: newpartner@gmail.com");
        } else {
            // Update role/password/status to make sure they're active
            partner.setRole(Role.PARTNER);
            partner.setIsActive(true);
            partner.setIsVerified(true);
            partner.setPasswordHash(passwordEncoder.encode("123123123"));
            partner = userRepository.save(partner);
            log.info("Updated existing partner account: newpartner@gmail.com");
        }

        // Initialize wallet for partner
        if (partner != null) {
            PartnerWallet wallet = partnerWalletRepository.findByPartnerId(partner.getId()).orElse(null);
            if (wallet == null) {
                wallet = PartnerWallet.builder()
                        .partner(partner)
                        .balance(new BigDecimal("10000000.00"))
                        .pendingBalance(new BigDecimal("2500000.00"))
                        .build();
                partnerWalletRepository.save(wallet);
                log.info("Created and seeded wallet for partner newpartner@gmail.com");
            } else {
                wallet.setBalance(new BigDecimal("10000000.00"));
                wallet.setPendingBalance(new BigDecimal("2500000.00"));
                partnerWalletRepository.save(wallet);
                log.info("Reset wallet values for partner newpartner@gmail.com");
            }
        }

        // 2. Get or Create Clients (Pet Owners)
        User client1 = getOrCreateClient("minhanh.nguyen@gmail.com", "Nguyễn Minh Anh", "0987654321");
        User client2 = getOrCreateClient("lebinh.pet@gmail.com", "Lê Thị Bình", "0901234567");
        User client3 = getOrCreateClient("chien.tm@gmail.com", "Trần Minh Chiến", "0934567890");
        User clientDemo = getOrCreateClient("khachhangdemo@gmail.com", "Khách Hàng Demo", "0999888777");

        // 3. Get or Create Pets
        Pet bo = getOrCreatePet(client1, "Bé Bơ 🐶", "Dog", "Golden Retriever", 25.0, 3, 
                "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300", 
                "Hạt Royal Canin", "3 bữa/ngày", Arrays.asList("Thân thiện", "Năng động", "Thích bơi"));

        Pet kiki = getOrCreatePet(client1, "Kiki 🐶", "Dog", "Corgi", 11.2, 4, 
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300", 
                "Pate & Ức gà", "2 bữa/ngày", Arrays.asList("Tinh nghịch", "Thích chạy nhảy"));

        Pet miumiu = getOrCreatePet(client2, "Miu Miu 🐱", "Cat", "British Shorthair", 4.5, 2, 
                "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300", 
                "Hạt Whiskas", "2 bữa/ngày", Arrays.asList("Quấn chủ", "Lười biếng", "Hiền lành"));

        Pet lulu = getOrCreatePet(client3, "Lu Lu 🐕", "Dog", "Poodle", 3.5, 1, 
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300", 
                "Hạt Purina", "3 bữa/ngày", Arrays.asList("Thông minh", "Dễ thương"));

        Pet dau = getOrCreatePet(clientDemo, "Bé Đậu 🐱", "Cat", "Scottish Fold", 4.2, 2, 
                "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300", 
                "Hạt Royal Canin", "2 bữa/ngày", Arrays.asList("Lanh lợi", "Hay tò mò"));

        Pet botbot = getOrCreatePet(clientDemo, "Bột Bột 🐶", "Dog", "Samoyed", 20.5, 3, 
                "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300", 
                "Hạt & Thịt bò", "3 bữa/ngày", Arrays.asList("Hiền lành", "Tông màu trắng"));

        // 4. Clean up old partner hotels to re-seed clean, fresh data
        List<Hotel> oldHotels = hotelRepository.findByPartnerId(partner.getId(), org.springframework.data.domain.Pageable.unpaged()).getContent();
        for (Hotel oldHotel : oldHotels) {
            log.info("Cleaning up old hotel data for: " + oldHotel.getName());
            
            // Delete reviews
            List<Booking> oldBookings = bookingRepository.findByHotelIdOrderByCreatedAtDesc(oldHotel.getId(), org.springframework.data.domain.Pageable.unpaged()).getContent();
            for (Booking ob : oldBookings) {
                reviewRepository.findByBookingId(ob.getId()).ifPresent(reviewRepository::delete);
            }
            
            // Delete bookings
            bookingRepository.deleteAll(oldBookings);
            
            // Delete staff
            List<Staff> oldStaff = staffRepository.findByWorkplaceIdAndDeletedFalse(oldHotel.getId());
            for (Staff os : oldStaff) {
                User sUser = os.getUserAccount();
                staffRepository.delete(os);
                if (sUser != null) {
                    userRepository.delete(sUser);
                }
            }
            
            // Delete equipments
            List<Equipment> oldEquip = equipmentRepository.findByHotelIdAndDeletedFalse(oldHotel.getId());
            equipmentRepository.deleteAll(oldEquip);
            
            // Delete room types
            List<RoomType> oldRoomTypes = roomTypeRepository.findByHotelId(oldHotel.getId());
            roomTypeRepository.deleteAll(oldRoomTypes);
            
            // Delete hotel
            hotelRepository.delete(oldHotel);
        }

        // 5. Create Hotels
        // Hotel 1: Miu Miu Pet Hotel
        Map<String, Object> extraInfo1 = new HashMap<>();
        extraInfo1.put("petTarget", "BOTH");
        extraInfo1.put("logoUrl", "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=150");
        extraInfo1.put("frontUrl", "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600");
        extraInfo1.put("roomsUrl", "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600");
        extraInfo1.put("imageUrls", Arrays.asList(
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"
        ));
        extraInfo1.put("cccd", Map.of("number", "012345678901", "frontUrl", "", "backUrl", ""));
        extraInfo1.put("banking", Map.of("bankName", "Techcombank", "accountNumber", "1903456789001", "accountName", "NGUYEN VAN A"));

        Hotel hotel1 = Hotel.builder()
                .partner(partner)
                .name("Miu Miu Pet Hotel (Quận 1)")
                .address("123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh")
                .locationLat(10.7769)
                .locationLong(106.7009)
                .googleMapsUrl("https://www.google.com/maps/place/10%C2%B046'36.8%22N+106%C2%B042'03.2%22E/@10.7769,106.7009,17z/")
                .description(serializeJson(extraInfo1))
                .amenities(Arrays.asList("Pet Boarding", "Grooming & Spa", "Veterinary"))
                .checkInTime("08:00")
                .checkOutTime("20:00")
                .status(HotelStatus.ACTIVE)
                .averageRating(4.8)
                .totalReviews(2)
                .build();
        hotel1 = hotelRepository.save(hotel1);
        log.info("Seeded Hotel 1: Miu Miu Pet Hotel (Quận 1)");

        // Hotel 2: Poodle House Resort
        Map<String, Object> extraInfo2 = new HashMap<>();
        extraInfo2.put("petTarget", "DOG_ONLY");
        extraInfo2.put("logoUrl", "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=150");
        extraInfo2.put("frontUrl", "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600");
        extraInfo2.put("roomsUrl", "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600");
        extraInfo2.put("imageUrls", Arrays.asList(
                "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600"
        ));
        extraInfo2.put("cccd", Map.of("number", "012345678902", "frontUrl", "", "backUrl", ""));
        extraInfo2.put("banking", Map.of("bankName", "MBBank", "accountNumber", "97042211223344", "accountName", "NGUYEN VAN A"));

        Hotel hotel2 = Hotel.builder()
                .partner(partner)
                .name("Poodle House Resort (Thủ Đức)")
                .address("45 Đường Số 9, Phường Linh Tây, Thành phố Thủ Đức, Thành phố Hồ Chí Minh")
                .locationLat(10.8524)
                .locationLong(106.7589)
                .googleMapsUrl("https://www.google.com/maps/place/10%C2%B051'08.6%22N+106%C2%B045'32.0%22E/@10.8524,106.7589,17z/")
                .description(serializeJson(extraInfo2))
                .amenities(Arrays.asList("Pet Boarding", "Grooming & Spa", "Pet Shop"))
                .checkInTime("07:30")
                .checkOutTime("21:00")
                .status(HotelStatus.ACTIVE)
                .averageRating(4.5)
                .totalReviews(1)
                .build();
        hotel2 = hotelRepository.save(hotel2);
        log.info("Seeded Hotel 2: Poodle House Resort (Thủ Đức)");

        // 6. Create Room Types for Hotel 1
        RoomType rt1Standard = createRoomType(hotel1, "Standard Cozy Room", "Phòng tiêu chuẩn ấm cúng cho các bé size nhỏ và vừa. Đầy đủ đệm nằm, khay nước tự động và đồ chơi cơ bản.", 150000, 2, 15, Arrays.asList("CAT", "DOG_SMALL"), false, Arrays.asList("https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400"));
        RoomType rt1Deluxe = createRoomType(hotel1, "Deluxe Suite", "Phòng Deluxe cao cấp với không gian rộng rãi, trang bị Camera HD xem trực tiếp 24/7 qua ứng dụng, đệm memory foam êm ái.", 300000, 3, 8, Arrays.asList("CAT", "DOG_SMALL", "DOG_LARGE"), true, Arrays.asList("https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400"));
        RoomType rt1VIP = createRoomType(hotel1, "V.I.P Presidential Villa", "Biệt thự hoàng gia siêu rộng cho đại gia đình thú cưng. Có camera AI theo dõi hành vi, bồn tắm sục mini và chế độ dinh dưỡng thiết kế riêng.", 600000, 5, 4, Arrays.asList("CAT", "DOG_SMALL", "DOG_LARGE"), true, Arrays.asList("https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400"));

        // Create Room Types for Hotel 2
        RoomType rt2Standard = createRoomType(hotel2, "Standard Cozy Room", "Phòng tiêu chuẩn ấm cúng.", 150000, 2, 10, Arrays.asList("DOG_SMALL"), false, Arrays.asList("https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400"));
        RoomType rt2Deluxe = createRoomType(hotel2, "Deluxe Suite", "Phòng Deluxe cao cấp.", 300000, 3, 5, Arrays.asList("DOG_SMALL", "DOG_LARGE"), true, Arrays.asList("https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400"));

        // 7. Create Staff Members
        createStaff(hotel1, "nam.nh@petcare.com", "Nguyễn Hoàng Nam", "Lễ tân", ShiftStatus.ACTIVE);
        createStaff(hotel1, "thu.pm@petcare.com", "Phạm Minh Thư", "Bác sĩ thú y", ShiftStatus.ACTIVE);
        createStaff(hotel1, "bao.lq@petcare.com", "Lê Quốc Bảo", "Chăm sóc viên", ShiftStatus.OFF_DUTY);

        createStaff(hotel2, "kiet.lm@petcare.com", "Lâm Minh Kiệt", "Lễ tân", ShiftStatus.ACTIVE);
        createStaff(hotel2, "hoa.nt@petcare.com", "Nguyễn Thanh Hoa", "Chăm sóc viên", ShiftStatus.ON_LEAVE);

        // 8. Create Equipment
        createEquipment(hotel1, "Máy sấy lông chuyên dụng 3000W", 3, EquipmentStatus.GOOD, LocalDate.now().minusDays(20));
        createEquipment(hotel1, "Lồng hấp sấy khử trùng thú cưng", 2, EquipmentStatus.MAINTENANCE, LocalDate.now().minusDays(10));
        createEquipment(hotel1, "Bộ kéo tỉa lông cao cấp Aesculap", 5, EquipmentStatus.GOOD, LocalDate.now().minusDays(45));

        createEquipment(hotel2, "Máy sấy lông chuyên dụng 3000W", 2, EquipmentStatus.GOOD, LocalDate.now().minusDays(15));
        createEquipment(hotel2, "Bàn tắm cắt tỉa điện nâng hạ", 1, EquipmentStatus.BROKEN, LocalDate.now().minusDays(5));

        // 9. Create Bookings (Realistic scenarios overlapping today/this week)
        LocalDate today = LocalDate.now();

        // Booking 1: Active checked in booking (Yesterday -> Tomorrow)
        Booking b1 = createBooking(client1, hotel1, rt1Deluxe, bo, today.minusDays(1), today.plusDays(1), 600000, BookingStatus.CHECKED_IN, PaymentMethod.VNPAY, "INV-2026-0001");
        b1.setCheckinPhotoUrl("https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300");
        b1.setOwnerSignatureUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAABk...");
        bookingRepository.save(b1);

        // Booking 2: Confirmed booking checking in today/tomorrow (Today -> 3 days later)
        createBooking(client2, hotel1, rt1Standard, miumiu, today, today.plusDays(3), 450000, BookingStatus.CONFIRMED, PaymentMethod.CASH, "INV-2026-0002");

        // Booking 3: Completed booking (Last week)
        Booking b3 = createBooking(client3, hotel1, rt1VIP, lulu, today.minusDays(7), today.minusDays(5), 1200000, BookingStatus.COMPLETED, PaymentMethod.VNPAY, "INV-2026-0003");
        createReview(b3, client3, hotel1, 5, "Dịch vụ tuyệt vời! Bé cưng nhà mình được chăm sóc rất kỹ, camera HD xem cực rõ và bác sĩ thú y trực ca nhiệt tình tư vấn.");

        // Booking 4: Cancelled booking (2 days ago)
        createBooking(client1, hotel1, rt1Standard, kiki, today.minusDays(3), today.minusDays(2), 150000, BookingStatus.CANCELLED, PaymentMethod.CASH, "INV-2026-0004");

        // Booking 5: Completed historical booking for bo to populate CRM timeline history
        Booking b5 = createBooking(client1, hotel1, rt1Deluxe, bo, today.minusDays(15), today.minusDays(10), 1500000, BookingStatus.COMPLETED, PaymentMethod.VNPAY, "INV-2026-0005");
        createReview(b5, client1, hotel1, 4, "Khách sạn sạch sẽ, nhân viên thân thiện. Bé Bơ về nhà rất vui vẻ và thơm tho.");

        // Booking 6: Pending booking (Next week)
        createBooking(client2, hotel1, rt1VIP, miumiu, today.plusDays(5), today.plusDays(8), 1800000, BookingStatus.PENDING, null, "INV-2026-0006");

        // Bookings for Hotel 2 (Poodle House Resort)
        Booking bHotel2_1 = createBooking(client3, hotel2, rt2Deluxe, lulu, today.minusDays(2), today.plusDays(2), 1200000, BookingStatus.CHECKED_IN, PaymentMethod.VNPAY, "INV-2026-0007");
        createBooking(client1, hotel2, rt2Standard, kiki, today.plusDays(1), today.plusDays(4), 450000, BookingStatus.CONFIRMED, PaymentMethod.CASH, "INV-2026-0008");
        Booking bHotel2_3 = createBooking(client2, hotel2, rt2Deluxe, miumiu, today.minusDays(6), today.minusDays(3), 900000, BookingStatus.COMPLETED, PaymentMethod.VNPAY, "INV-2026-0009");
        createReview(bHotel2_3, client2, hotel2, 5, "Tuyệt vời, cơ sở vật chất mới tinh.");

        // Bookings for clientDemo
        Booking bDemo1 = createBooking(clientDemo, hotel1, rt1Deluxe, botbot, today.minusDays(3), today.minusDays(1), 600000, BookingStatus.COMPLETED, PaymentMethod.VNPAY, "INV-2026-0010");
        createReview(bDemo1, clientDemo, hotel1, 5, "Khách sạn quá đẹp, nhân viên phục vụ chu đáo. Sẽ quay lại!");
        
        createBooking(clientDemo, hotel1, rt1Standard, dau, today, today.plusDays(2), 300000, BookingStatus.CHECKED_IN, PaymentMethod.VNPAY, "INV-2026-0011");
        createBooking(clientDemo, hotel2, rt2Standard, botbot, today.plusDays(3), today.plusDays(6), 450000, BookingStatus.CONFIRMED, PaymentMethod.CASH, "INV-2026-0012");

        log.info("=== SEEDING COMPLETED SUCCESSFULLY ===");
    }

    private User getOrCreateClient(String email, String fullName, String phone) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User c = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode("123123123"))
                    .fullName(fullName)
                    .phone(phone)
                    .role(Role.OWNER)
                    .isActive(true)
                    .isVerified(true)
                    .build();
            return userRepository.save(c);
        });
    }

    private Pet getOrCreatePet(User owner, String name, String species, String breed, Double weight, Integer age, 
                               String avatarUrl, String foodType, String feedingSchedule, List<String> tags) {
        // Find pet under owner
        List<Pet> pets = petRepository.findAll(); // Simple check or check custom
        for (Pet p : pets) {
            if (p.getName().equals(name) && p.getOwner().getId().equals(owner.getId())) {
                return p;
            }
        }
        Pet p = new Pet();
        p.setOwner(owner);
        p.setName(name);
        p.setSpecies(species);
        p.setBreed(breed);
        p.setWeightKg(weight);
        p.setAgeYears(age);
        p.setIsVaccinated(true);
        p.setAvatarUrl(avatarUrl);
        p.setFoodType(foodType);
        p.setFeedingSchedule(feedingSchedule);
        p.setPersonalityTags(tags);
        return petRepository.save(p);
    }

    private RoomType createRoomType(Hotel hotel, String name, String desc, double price, int maxPets, int totalRooms, List<String> allowedPetTypes, boolean webcam, List<String> images) {
        RoomType rt = RoomType.builder()
                .hotel(hotel)
                .name(name)
                .description(desc)
                .pricePerNight(BigDecimal.valueOf(price))
                .maxPets(maxPets)
                .totalRooms(totalRooms)
                .allowedPetTypes(allowedPetTypes)
                .hasWebcam(webcam)
                .images(images)
                .isActive(true)
                .build();
        return roomTypeRepository.save(rt);
    }

    private void createStaff(Hotel hotel, String email, String fullName, String position, ShiftStatus shift) {
        User sUser = userRepository.findByEmail(email).orElse(null);
        if (sUser == null) {
            sUser = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode("123123123"))
                    .fullName(fullName)
                    .role(Role.STAFF)
                    .isActive(true)
                    .isVerified(true)
                    .build();
            sUser = userRepository.save(sUser);
        }

        Staff st = new Staff();
        st.setUserAccount(sUser);
        st.setWorkplace(hotel);
        st.setJobPosition(position);
        st.setShiftStatus(shift);
        staffRepository.save(st);
    }

    private void createEquipment(Hotel hotel, String name, int quantity, EquipmentStatus status, LocalDate lastMaint) {
        Equipment eq = Equipment.builder()
                .hotel(hotel)
                .name(name)
                .quantity(quantity)
                .status(status)
                .lastMaintenance(lastMaint)
                .build();
        equipmentRepository.save(eq);
    }

    private Booking createBooking(User owner, Hotel hotel, RoomType rt, Pet pet, LocalDate in, LocalDate out, double amount, BookingStatus status, PaymentMethod payment, String invNum) {
        Set<Pet> pets = new HashSet<>();
        pets.add(pet);

        Booking b = Booking.builder()
                .owner(owner)
                .hotel(hotel)
                .roomType(rt)
                .pets(pets)
                .checkInDate(in)
                .checkOutDate(out)
                .totalAmount(BigDecimal.valueOf(amount))
                .commissionRate(0.10)
                .commissionFee(BigDecimal.valueOf(amount * 0.10))
                .convenienceFee(BigDecimal.valueOf(10000))
                .vatAmount(BigDecimal.valueOf(amount * 0.08))
                .status(status)
                .paymentMethod(payment)
                .invoiceNumber(invNum)
                .build();
        return bookingRepository.save(b);
    }

    private void createReview(Booking booking, User reviewer, Hotel hotel, int stars, String comment) {
        Review r = new Review();
        r.setBooking(booking);
        r.setReviewer(reviewer);
        r.setHotel(hotel);
        r.setStarRating(stars);
        r.setComment(comment);
        r.setPhotoUrls(Arrays.asList("https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200"));
        reviewRepository.save(r);
    }

    private String serializeJson(Object obj) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
