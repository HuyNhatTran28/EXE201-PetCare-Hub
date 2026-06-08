package com.petcare_hub.repository;

import com.petcare_hub.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PetRepository extends JpaRepository<Pet, UUID> {
    List<Pet> findByOwnerId(UUID ownerId);

    @Query("""
        SELECT DISTINCT p FROM Booking b
        JOIN b.pets p
        WHERE b.hotel.partner.id = :partnerId
    """)
    List<Pet> findPetsByPartnerId(@Param("partnerId") UUID partnerId);
}

