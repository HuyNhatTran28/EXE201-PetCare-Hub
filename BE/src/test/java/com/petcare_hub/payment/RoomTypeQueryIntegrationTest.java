package com.petcare_hub.payment;

import com.petcare_hub.entity.Hotel;
import com.petcare_hub.entity.RoomType;
import com.petcare_hub.enums.HotelStatus;
import com.petcare_hub.repository.HotelRepository;
import com.petcare_hub.repository.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
@DisplayName("RoomTypeRepository - findActiveDogAndCatRoomTypes Integration Test")
class RoomTypeQueryIntegrationTest {

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private HotelRepository hotelRepository;

    private Hotel testHotel;

    @BeforeEach
    void setUp() {
        // Setup Hotel
        testHotel = Hotel.builder()
                .name("Test Hotel for Room Query")
                .address("456 Room Query Street")
                .status(HotelStatus.ACTIVE)
                .build();
        testHotel = hotelRepository.save(testHotel);
    }

    @Test
    @DisplayName("Verify that active dog/cat rooms are fetched, sorted by price desc, and similar strings are excluded")
    void testQueryFilteringAndSorting() {
        // 1. Create a DOG room type (Price: 300,000)
        RoomType dogRoom = RoomType.builder()
                .hotel(testHotel)
                .name("VIP Dog Room")
                .pricePerNight(new BigDecimal("300000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("DOG"))
                .isActive(true)
                .build();
        roomTypeRepository.save(dogRoom);

        // 2. Create a lowercase cat room type (Price: 150,000)
        RoomType catRoom = RoomType.builder()
                .hotel(testHotel)
                .name("Cozy cat Room")
                .pricePerNight(new BigDecimal("150000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("cat"))
                .isActive(true)
                .build();
        roomTypeRepository.save(catRoom);

        // 3. Create a dog_small room type (Price: 500,000) - Should be sorted first
        RoomType smallDogRoom = RoomType.builder()
                .hotel(testHotel)
                .name("Super Small Dog Suite")
                .pricePerNight(new BigDecimal("500000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("DOG_SMALL"))
                .isActive(true)
                .build();
        roomTypeRepository.save(smallDogRoom);

        // 4. Create a non-matching room type for BIRD (Price: 600,000)
        RoomType birdRoom = RoomType.builder()
                .hotel(testHotel)
                .name("Luxury Bird Cage")
                .pricePerNight(new BigDecimal("600000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("BIRD"))
                .isActive(true)
                .build();
        roomTypeRepository.save(birdRoom);

        // 5. Create a false positive check room type containing "doggy" or "catfish" (Price: 700,000)
        RoomType doggyRoom = RoomType.builder()
                .hotel(testHotel)
                .name("Doggy Play Center")
                .pricePerNight(new BigDecimal("700000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("doggy"))
                .isActive(true)
                .build();
        roomTypeRepository.save(doggyRoom);

        // 6. Create an inactive dog room type (Price: 800,000) - Should be filtered out
        RoomType inactiveDogRoom = RoomType.builder()
                .hotel(testHotel)
                .name("Inactive Dog Room")
                .pricePerNight(new BigDecimal("800000"))
                .totalRooms(5)
                .allowedPetTypes(Collections.singletonList("DOG"))
                .isActive(false)
                .build();
        roomTypeRepository.save(inactiveDogRoom);

        // Executing the query
        List<RoomType> result = roomTypeRepository.findActiveDogAndCatRoomTypes();

        // We expect that result contains dogRoom, catRoom, and smallDogRoom.
        // We also expect birdRoom, doggyRoom, and inactiveDogRoom are NOT in the result.
        List<UUID> matchingIds = result.stream().map(RoomType::getId).toList();

        assertThat(matchingIds).contains(dogRoom.getId(), catRoom.getId(), smallDogRoom.getId());
        assertThat(matchingIds).doesNotContain(birdRoom.getId(), doggyRoom.getId(), inactiveDogRoom.getId());

        // Checking exact sorting order among the 3 matching rooms (Price desc: 500k > 300k > 150k)
        int idxSmallDog = matchingIds.indexOf(smallDogRoom.getId());
        int idxDog = matchingIds.indexOf(dogRoom.getId());
        int idxCat = matchingIds.indexOf(catRoom.getId());

        assertThat(idxSmallDog).isLessThan(idxDog);
        assertThat(idxDog).isLessThan(idxCat);
    }
}
