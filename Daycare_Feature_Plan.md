# 🐾 Daycare (Gửi Ngày) — Plan Triển Khai (bản hoàn chỉnh)

Cho phép khách **gửi thú cưng ban ngày, đón trong ngày** (không qua đêm), tính tiền **theo ngày** (`dayRate`), song song với lưu trú qua đêm tính theo đêm.

> **Nguyên tắc vàng:** chỉ thêm phần *đặt* + *tính giá*. Payment (payOS/verify), commission 8%, VAT 8%, ví pending/balance, rút tiền, dịch vụ kèm → **DÙNG LẠI 100%** (vì chúng tính trên `totalAmount`, không quan tâm loại booking).

---

## 0. Quyết định đã chốt

| Vấn đề | Chốt |
|---|---|
| Số ngày daycare | **Hỗ trợ nhiều ngày** (gửi ban ngày T2–T6). `days = checkOut − checkIn + 1`. Gửi 1 ngày = trường hợp `checkIn = checkOut` (days = 1). |
| Giờ gửi/đón khi nhiều ngày | `dropOffTime`/`pickUpTime` là **khung giờ MỖI ngày** (vd 8:00 gửi – 17:00 đón, lặp lại từng ngày). KHÔNG phải gửi ngày đầu đón ngày cuối. |
| Phòng không có `dayRate` | Không nhận gửi ngày. |

> 💡 Muốn demo gọn chỉ 1 ngày: ép `checkIn = checkOut` cho DAYCARE và ẩn range-picker bên FE — phần còn lại giữ nguyên.

---

## 1. Enum mới

**[NEW] `BookingType.java`** (`BE/.../enums/BookingType.java`)
```java
package com.petcare_hub.enums;

public enum BookingType {
    OVERNIGHT,
    DAYCARE
}
```

---

## 2. Entity

**[MODIFY] `Booking.java`**
- `@Enumerated(EnumType.STRING) bookingType` — **default `OVERNIGHT`** (booking cũ tự đúng, khỏi backfill)
- `dropOffTime` (`LocalTime`, nullable)
- `pickUpTime` (`LocalTime`, nullable)

**[MODIFY] `RoomType.java`**
- `dayRate` (`BigDecimal`, nullable) — `null` = phòng không hỗ trợ gửi ngày

> ddl-auto=update tự thêm cột, không cần migration tay.

---

## 3. Logic tính tiền

```
OVERNIGHT:
  validate checkOut > checkIn          (≥ 1 đêm)
  nights    = ChronoUnit.DAYS.between(checkIn, checkOut)
  roomTotal = pricePerNight × nights

DAYCARE:
  validate checkOut >= checkIn         (cùng ngày OK)
  validate dayRate != null
  validate dropOff != null && pickUp != null && dropOff < pickUp
  days      = ChronoUnit.DAYS.between(checkIn, checkOut) + 1
  roomTotal = dayRate × days
```

**Từ `roomTotal` trở đi GIỐNG HỆT (KHÔNG đụng):**
```
totalAmount   = (roomTotal + serviceTotal − voucher) × 1.08
commissionFee = totalAmount × 0.08
partnerShare  = totalAmount × 0.92
```

---

## 4. Validation — ⚠️ TYPE-AWARE (điểm dễ sai)

| Loại | Backend | Frontend (date picker) |
|---|---|---|
| OVERNIGHT | `checkOut > checkIn`, lỗi 400 nếu sai | disable chọn checkOut ≤ checkIn (bắt ≥1 đêm) |
| DAYCARE | `checkOut >= checkIn`; `dayRate != null`; `dropOff < pickUp` | **CHO PHÉP cùng ngày**; thêm ô giờ gửi/đón |

> 🔴 **CỰC QUAN TRỌNG:** cái "chặn 0 đêm" vừa làm sẽ **chặn nhầm daycare cùng ngày** nếu validation (cả BE lẫn FE date picker) không tách theo `bookingType`. Logic chặn 0-đêm CHỈ áp dụng khi `OVERNIGHT`.

---

## 5. Phòng trống (availability) — ⚠️ rà HẾT caller

**[MODIFY] `BookingRepository.java`** — query xử lý mixed type:
```java
@Query("""
    SELECT COUNT(b) FROM Booking b
    WHERE b.roomType.id = :roomTypeId
      AND b.status IN ('CONFIRMED', 'CHECKED_IN')
      AND b.checkInDate <= :reqEnd
      AND (
        (b.bookingType = 'OVERNIGHT' AND b.checkOutDate > :reqStart)
        OR
        (b.bookingType = 'DAYCARE'   AND b.checkOutDate >= :reqStart)
      )
""")
long countOverlappingBookings(
    @Param("roomTypeId") UUID roomTypeId,
    @Param("reqStart")   LocalDate reqStart,
    @Param("reqEnd")     LocalDate reqEnd
);
```

Cách truyền tham số khi đặt (trong `createBooking`):
- OVERNIGHT: `reqStart = checkIn`, `reqEnd = checkOut − 1` (đêm cuối)
- DAYCARE: `reqStart = checkIn`, `reqEnd = checkOut`

> 🟠 **Query này đổi signature/logic → phải sửa MỌI nơi gọi nó**, không chỉ `createBooking`:
> - Chỗ tính/hiển thị **số phòng trống** cho khách
> - **Lịch phòng** của partner (cái từng bị trống — kiểm lại sau khi sửa)
> - Bất kỳ chỗ check availability nào khác
> Sót 1 caller = lỗi compile hoặc đếm sai → overbooking.

---

## 6. Backend — file cần sửa

| File | Việc |
|---|---|
| `dto/request/BookingRequest.java` | thêm `bookingType` (default OVERNIGHT), `dropOffTime`, `pickUpTime` |
| `dto/response/BookingResponse.java` | thêm `bookingType`, `dropOffTime`, `pickUpTime`, **giữ cả `totalNights` VÀ `totalDays`** (populate theo type, FE biết hiện cái nào) |
| `dto/response/RoomTypeResponse.java` | thêm `dayRate` |
| `repository/BookingRepository.java` | cập nhật query (mục 5) |
| `service/impl/BookingServiceImpl.java` | `createBooking`: nhánh OVERNIGHT/DAYCARE (mục 3+4), truyền reqStart/reqEnd đúng, mapper `toResponse` copy field mới |
| `service/impl/RoomTypeServiceImpl.java` | partner nhập/sửa `dayRate` |

---

## 7. Frontend — file cần sửa

**[MODIFY] `HotelDetailPage.tsx`**
1. Thêm **toggle "Lưu trú qua đêm" / "Gửi ngày"**.
2. 🔴 **Date picker tách theo type:**
   - OVERNIGHT: giữ nguyên, bắt ≥1 đêm (disable checkOut ≤ checkIn)
   - DAYCARE: **cho phép cùng ngày** + thêm ô **giờ gửi / giờ đón** (vd 08:00 → 17:00)
3. Chỉ cho bật "Gửi ngày" nếu phòng đang chọn **có `dayRate`** (không thì disable toggle + tooltip "Phòng này không nhận gửi ngày").
4. **Tổng kết chi phí** đổi nhãn theo type:
   - Overnight: `{nights} đêm × {pricePerNight}đ`
   - Daycare: `{days} ngày × {dayRate}đ`
5. Payload gửi `/api/bookings`: kèm `bookingType`, `dropOffTime`, `pickUpTime`.

**[MODIFY] form quản lý phòng của Partner** (`PartnerDashboard.tsx` hoặc form RoomType)
- Thêm ô nhập `dayRate` (để trống = không nhận gửi ngày).

---

## 8. ❌ KHÔNG đụng (tái dùng 100%)

Payment payOS/VietQR + verify polling · Commission 8% · VAT 8% · snapshot rate · ví `pendingBalance`/`balance` · rút tiền + duyệt biên lai · status flow (`CONFIRMED → CHECKED_IN → COMPLETED`) · dịch vụ kèm `booking_services`.

---

## 9. Test plan

### Giá & validation
- [ ] Daycare **cùng ngày** → `roomTotal = dayRate × 1`
- [ ] Daycare **3 ngày** → `roomTotal = dayRate × 3`
- [ ] Overnight cùng ngày → **bị từ chối** (≥1 đêm)
- [ ] Phòng **không có dayRate** + đặt daycare → từ chối ("Loại phòng này không hỗ trợ gửi ngày")
- [ ] `dropOff >= pickUp` → từ chối
- [ ] `dropOff`/`pickUp` null khi daycare → từ chối

### 🔴 Overlap MIXED-type (bắt buộc — phần dễ sai nhất)
- [ ] Daycare ngày 22, phòng đã có **overnight 22→23** → **báo hết phòng**
- [ ] Daycare ngày 22, phòng có **overnight 21→22** (trả sáng 22) → **vẫn cho đặt**
- [ ] 2 daycare cùng ngày, phòng còn 1 → cái thứ 2 **bị chặn**
- [ ] Overnight 22→24, phòng có **daycare ngày 23** → **báo hết phòng**

### Tiền & tái dùng
- [ ] `totalAmount`, `commissionFee`, ví `+92%` đúng cho daycare
- [ ] `commissionFee + partnerShare == totalAmount`
- [ ] 🟡 Daycare **+ dịch vụ kèm** (`serviceIds`) → cộng đúng vào tiền

---

## 10. Thứ tự thực hiện (làm bước nào test bước đó)

1. **[Đã làm] Chặn 0 đêm cho OVERNIGHT** — nhớ để validation đó **chỉ áp dụng khi OVERNIGHT** (đừng chặn cứng).
2. **Data model:** `BookingType` + `dayRate` + `dropOffTime`/`pickUpTime`.
3. **Repository:** sửa query + **rà hết caller** (mục 5).
4. **Service BE:** nhánh giá + validation type-aware + DTO/response.
5. **Partner FE:** ô nhập `dayRate`.
6. **Khách FE:** toggle + date picker type-aware + giờ gửi/đón + cost summary.
7. **Test** theo mục 9 (đặc biệt cụm 🔴 overlap).
8. **Kiểm lại lịch phòng partner** vẫn chạy đúng sau khi đổi query.

---

## 11. 🟡 Để sau (không chặn demo)

- Validate giờ gửi/đón nằm trong **giờ mở cửa** khách sạn (giờ chỉ check `dropOff < pickUp`).
- Tối ưu overlap nếu muốn cho overnight-checkout-sáng và daycare-cùng-ngày dùng chung phòng mượt hơn.
