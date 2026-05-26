package com.petcare_hub.enums;

public enum BookingStatus {
    PENDING,    // Chờ thanh toán
    CONFIRMED,  // Đã thanh toán, chờ check-in
    CHECKED_IN, // Đang lưu trú
    COMPLETED,  // Đã check-out
    CANCELLED   // Đã hủy
}
