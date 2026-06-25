package com.petcare_hub.repository;

import com.petcare_hub.entity.Diary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiaryRepository extends JpaRepository<Diary, UUID> {

    @Query("""
        SELECT d FROM Diary d 
        JOIN d.booking b 
        JOIN b.pets p 
        WHERE p.id = :petId 
        ORDER BY d.entryTime DESC
    """)
    List<Diary> findByPetId(@Param("petId") UUID petId);

    @Query("""
        SELECT d FROM Diary d 
        JOIN d.booking b 
        WHERE b.owner.id = :ownerId 
        ORDER BY d.entryTime DESC
    """)
    List<Diary> findByOwnerId(@Param("ownerId") UUID ownerId);
}
