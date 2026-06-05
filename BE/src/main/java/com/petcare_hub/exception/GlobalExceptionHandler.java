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

    // Bắt các lỗi không mong muốn khác
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.builder()
                        .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                        .message("Lỗi hệ thống. Vui lòng thử lại sau.")
                        .timestamp(LocalDateTime.now())
                        .build());
    }
}