package com.petcare_hub.exception;

import lombok.Builder;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@lombok.extern.slf4j.Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Data
    @Builder
    static class ErrorResponse {
        private int status;
        private String message;
        private LocalDateTime timestamp;
        private Map<String, String> errors;
    }

    // Bắt lỗi nghiệp vụ — AppException
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex) {
        return ResponseEntity
                .status(ex.getStatus())
                .body(ErrorResponse.builder()
                        .status(ex.getStatus().value())
                        .message(ex.getMessage())
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    // Bắt lỗi validate @Valid trong Controller
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.builder()
                        .status(HttpStatus.BAD_REQUEST.value())
                        .message("Dữ liệu không hợp lệ")
                        .timestamp(LocalDateTime.now())
                        .errors(errors)
                        .build());
    }

    // Bắt lỗi phân quyền — Access Denied / Forbidden
    @ExceptionHandler({
        org.springframework.security.access.AccessDeniedException.class,
        org.springframework.security.authorization.AuthorizationDeniedException.class
    })
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.builder()
                        .status(HttpStatus.FORBIDDEN.value())
                        .message("Bạn không có quyền thực hiện hành động này.")
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    // Bắt lỗi ràng buộc dữ liệu cơ sở dữ liệu (ví dụ: khoá ngoại, trùng lặp...)
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityException(
            org.springframework.dao.DataIntegrityViolationException ex) {
        
        String message = "Không thể thực hiện hành động do ràng buộc dữ liệu.";
        String rootMsg = ex.getRootCause() != null ? ex.getRootCause().getMessage() : "";
        String exMsg = ex.getMessage() != null ? ex.getMessage() : "";
        String combined = (rootMsg + " " + exMsg).toLowerCase();
        
        if (combined.contains("violates foreign key constraint") || combined.contains("fk")) {
            if (combined.contains("booking_pets") || combined.contains("booking")) {
                message = "Không thể xóa thú cưng này vì bé đang có lịch sử đặt phòng liên kết.";
            } else if (combined.contains("pet_diary_entries") || combined.contains("diary")) {
                message = "Không thể xóa thú cưng này vì bé đang có nhật ký lưu trú liên kết.";
            } else {
                message = "Không thể xóa dữ liệu này do đang có các dữ liệu khác liên kết.";
            }
        } else if (combined.contains("duplicate key value violates unique constraint") || combined.contains("unique")) {
            message = "Dữ liệu đã tồn tại trong hệ thống (trùng lặp giá trị duy nhất).";
        }
        
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.builder()
                        .status(HttpStatus.CONFLICT.value())
                        .message(message)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    // Bắt các lỗi không mong muốn khác
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        String detailedMessage = "Lỗi hệ thống: [" + ex.getClass().getSimpleName() + "] " + ex.getMessage();
        if (ex.getCause() != null) {
            detailedMessage += " | Nguyên nhân: " + ex.getCause().getMessage();
        }
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.builder()
                        .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                        .message(detailedMessage)
                        .timestamp(LocalDateTime.now())
                        .build());
    }
}