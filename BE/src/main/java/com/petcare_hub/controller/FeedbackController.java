package com.petcare_hub.controller;

import com.petcare_hub.base.ApiResponse;
import com.petcare_hub.entity.Feedback;
import com.petcare_hub.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/feedbacks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Feedback>>> getAllFeedbacks() {
        return ResponseEntity.ok(ApiResponse.success(
            feedbackRepository.findAllByOrderByCreatedAtDesc()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFeedback(@PathVariable UUID id) {
        feedbackRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
