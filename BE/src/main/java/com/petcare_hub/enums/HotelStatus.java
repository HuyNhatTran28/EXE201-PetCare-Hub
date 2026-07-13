package com.petcare_hub.enums;

public enum HotelStatus {
    PENDING,   // Chờ Admin duyệt
    ACTIVE,    // Đã duyệt, đang hoạt động
    CLOSED,    // Tạm đóng cửa (partner tự đóng)
    REJECTED,  // Bị Admin từ chối
    SUSPENDED  // Bị đình chỉ do vi phạm báo cáo
}
