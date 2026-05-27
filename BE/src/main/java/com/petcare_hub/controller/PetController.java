package com.petcare_hub.controller;

import com.petcare_hub.entity.Pet;
import com.petcare_hub.repository.PetRepository;
import com.petcare_hub.repository.UserRepository;
import com.petcare_hub.exception.AppException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets")
@RequiredArgsConstructor
@Tag(name = "Pet", description = "Quản lý thú cưng")
public class PetController {

    private final petRepository petRepository; // wait, let's make it camelCase: private final PetRepository petRepository;
    private final userRepository userRepository; // private final UserRepository userRepository;

    // We will use standard field names:
    private final PetRepository petRepo;
    private final UserRepository userRepo;

    // Let's implement exactly the class requested:
    public PetController(PetRepository petRepository, UserRepository userRepository) {
        this.petRepo = petRepository;
        this.userRepo = userRepository;
    }

    // GET /api/pets/my — Lấy danh sách thú cưng của owner
    @Operation(summary = "Lấy danh sách thú cưng của tôi")
    @GetMapping("/my")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<Pet>> getMyPets(Authentication auth) {
        UUID ownerId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(petRepo.findByOwnerId(ownerId));
    }

    // POST /api/pets — Thêm thú cưng mới
    @Operation(summary = "Thêm thú cưng mới")
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Pet> createPet(
            @RequestBody Pet pet,
            Authentication auth) {

        UUID ownerId = (UUID) auth.getPrincipal();
        var owner = userRepo.findById(ownerId)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy người dùng", HttpStatus.NOT_FOUND));
        pet.setOwner(owner);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(petRepo.save(pet));
    }

    // PUT /api/pets/{id} — Cập nhật thú cưng
    @Operation(summary = "Cập nhật thú cưng")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Pet> updatePet(
            @PathVariable UUID id,
            @RequestBody Pet updated,
            Authentication auth) {

        UUID ownerId = (UUID) auth.getPrincipal();
        Pet pet = petRepo.findById(id)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy thú cưng", HttpStatus.NOT_FOUND));

        if (!pet.getOwner().getId().equals(ownerId)) {
            throw new AppException("Không có quyền", HttpStatus.FORBIDDEN);
        }

        pet.setName(updated.getName());
        pet.setSpecies(updated.getSpecies());
        pet.setBreed(updated.getBreed());
        pet.setWeightKg(updated.getWeightKg());
        pet.setAgeYears(updated.getAgeYears());
        pet.setIsVaccinated(updated.getIsVaccinated());
        pet.setFoodType(updated.getFoodType());
        pet.setSpecialNotes(updated.getSpecialNotes());

        return ResponseEntity.ok(petRepo.save(pet));
    }

    // DELETE /api/pets/{id} — Xóa thú cưng
    @Operation(summary = "Xóa thú cưng")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> deletePet(
            @PathVariable UUID id,
            Authentication auth) {

        UUID ownerId = (UUID) auth.getPrincipal();
        Pet pet = petRepo.findById(id)
                .orElseThrow(() -> new AppException(
                    "Không tìm thấy thú cưng", HttpStatus.NOT_FOUND));

        if (!pet.getOwner().getId().equals(ownerId)) {
            throw new AppException("Không có quyền", HttpStatus.FORBIDDEN);
        }

        petRepo.delete(pet);
        return ResponseEntity.noContent().build();
    }
}
