# 🐾 PetCare Hub — Onboarding cho thành viên mới

> Đọc file này trước khi mở IntelliJ. Mất khoảng 10 phút — đủ để hiểu và bắt đầu code ngay hôm nay.

---

## 1. Dự án là gì?

PetCare Hub là **nền tảng đặt phòng khách sạn thú cưng trực tuyến** tại Việt Nam.

> **Một câu tóm tắt:** "Bạn cần gửi thú cưng mà không biết chỗ nào uy tín gần nhà? PetCare Hub sẽ dùng AI để tìm và đặt phòng cho bạn trong vài giây — kèm camera xem trực tiếp và nhật ký chăm sóc hàng ngày."

Thay vì gọi điện hỏi từng nơi, chủ nuôi chỉ cần vào web → **chat với AI** → nhận gợi ý khách sạn gần vị trí GPS → đặt phòng và thanh toán ngay trên nền tảng.

---

## 2. Tính năng AI — Trái tim của sản phẩm

Đây là điểm khác biệt lớn nhất so với app thông thường.

### Cơ chế hoạt động

```
① Web lấy GPS  →  ② User chat tự nhiên  →  ③ AI phân tích
      ↓                    ↓                        ↓
  lat, lng          "Gửi mèo cuối tuần,       extract: loài thú,
                     gần Q.7, có spa"          ngày, ngân sách,
                                               dịch vụ mong muốn
                                                       ↓
                               ⑤ Trả lời tiếng Việt  ←  ④ Query DB
                               kèm card gợi ý KS         tìm KS gần nhất
                               + nút "Đặt ngay"           còn phòng phù hợp
```

### Ví dụ hội thoại thực tế

```
👤 "Tôi cần gửi mèo Ba Tư 4kg, cuối tuần này, gần Quận 1"

🤖 Mình tìm được 2 khách sạn phù hợp gần bạn:

   1. 🏨 The Pet Sanctuary — cách 1.2km
      ✅ Chuyên nhận mèo, phòng riêng yên tĩnh
      ✅ Còn phòng cuối tuần này
      ⭐ 4.8/5  •  💰 320.000đ/đêm

   2. 🏨 Paws Paradise — cách 2.1km
      ✅ Camera xem trực tiếp 24/7
      ✅ Dịch vụ Spa cho mèo
      ⭐ 4.6/5  •  💰 280.000đ/đêm

   Bạn muốn xem chi tiết hoặc đặt phòng ngay không?
```

---

## 3. Ai dùng hệ thống?

| Role | Là ai | Làm gì |
|------|-------|--------|
| `OWNER` | 🐶 Chủ nuôi thú cưng | Tìm KS, đặt phòng, xem nhật ký, tích điểm loyalty |
| `PARTNER` | 🏨 Chủ khách sạn | Quản lý phòng, dịch vụ, xem booking, xem doanh thu |
| `STAFF` | 👷 Nhân viên chăm sóc | Nhận task hàng ngày, viết nhật ký, check-in/out |
| `ADMIN` | 🛡️ Quản trị nền tảng | Duyệt khách sạn, tạo voucher, báo cáo toàn hệ thống |

---

## 4. Luồng đặt phòng từ đầu đến cuối

```
① Chat với AI       →  Nhận gợi ý KS gần nhất phù hợp với thú cưng
② Chọn phòng        →  Chọn loại phòng + thêm dịch vụ (Spa, Tắm & Sấy...)
③ Voucher / Điểm    →  Nhập mã giảm giá hoặc dùng điểm loyalty
④ Thanh toán        →  VNPay / MoMo / VietQR — quét QR trong 15 phút
⑤ Check-in          →  Nhân viên chụp ảnh thú cưng + lấy chữ ký owner
⑥ Lưu trú           →  Nhân viên viết nhật ký hàng ngày → owner xem realtime
⑦ Check-out         →  Hoàn tất → tự động cộng điểm loyalty
⑧ Đánh giá          →  Owner để lại review → cập nhật rating KS
```

### Trạng thái Booking

```
PENDING  →  CONFIRMED  →  CHECKED_IN  →  COMPLETED
                 ↓
            CANCELLED  →  (Refund nếu đã thanh toán)
```

---

## 5. Tiền chạy như thế nào?

```
Khách đặt phòng 500.000đ / đêm
   ├── Nền tảng thu: Phí tiện ích từ chủ nuôi (convenience_fee)
   ├── Nền tảng thu: Hoa hồng từ khách sạn (commission_fee = total × commission_rate)
   └── Khách sạn nhận: Phần còn lại
```

> ⚠️ **Quan trọng:** `commission_rate` phải được **snapshot tại thời điểm đặt** — không được đọc lại từ config sau này. Tương tự với `price_snapshot` của dịch vụ và `voucher_discount_amount`.

---

## 6. Tech Stack

### Backend
| | |
|---|---|
| Framework | Spring Boot 3.3.2 + Java 21 |
| Database | PostgreSQL 16 (Docker: `pgvector/pgvector:pg16`) |
| ORM | Spring Data JPA + Hibernate (`ddl-auto=update` ở dev) |
| Security | Spring Security + OAuth2 + JWT |
| API Docs | Swagger UI — `localhost:8080/swagger-ui.html` |
| Mapping | MapStruct (Entity ↔ DTO) |
| File | Cloudinary (ảnh thú cưng, phòng, review) |
| Payment | VNPay · MoMo · VietQR |
| Notify | SendGrid (Email) · Zalo OA (ZNS) · Twilio (SMS) |
| **Package** | **`com.petcarehub`** |

### Frontend
| | |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | TailwindCSS |
| State | Zustand (global) + React Query (server) |
| HTTP | Axios + interceptor tự động đính JWT token |
| Deploy | Vercel — `VITE_API_URL=domain Railway` |

### AI *(bật sau khi có OpenAI API key)*
| | |
|---|---|
| LLM | OpenAI GPT-4o-mini qua Spring AI |
| Embedding | `text-embedding-3-small` |
| Vector DB | pgvector (extension của PostgreSQL) |
| Tool Calling | `HotelSearchTool` — AI tự gọi API tìm KS khi cần |

---

## 7. Database — 21 Bảng

| Nhóm | Bảng |
|------|------|
| **Core** | `users` · `pets` · `hotels` · `room_types` · `rooms` · `services` |
| **Booking & Finance** | `bookings` · `booking_pets` · `booking_services` · `transactions` · `refunds` |
| **Operations** | `staff` · `tasks` · `pet_diary_entries` |
| **CRM & Marketing** | `chat_messages` · `reviews` · `notifications` · `audit_logs` |
| **Loyalty & Pricing** | `loyalty_accounts` · `loyalty_transactions` · `vouchers` · `pricing_rules` |

> 📋 **Thứ tự tạo Entity** (Hibernate cần FK đúng thứ tự):
> ```
> users → pets · hotels → room_types → rooms · services → vouchers
>       → bookings → booking_pets · booking_services
>       → transactions → refunds → staff → tasks · pet_diary_entries
>       → reviews · chat_messages · notifications · audit_logs
>       → loyalty_accounts → loyalty_transactions
> ```

---

## 8. Checklist ngày đầu vào dự án

### Cài môi trường
- [ ] **Java 21** — tải từ [adoptium.net](https://adoptium.net) hoặc dùng SDKMAN
- [ ] **Docker Desktop** — cần để chạy PostgreSQL local
- [ ] **IntelliJ IDEA** — mở project, Maven reload, chạy `PetCareHubApplication`
- [ ] **Node.js 20+** — cho frontend React + Vite
- [ ] **VS Code** — cho frontend, cài extension Tailwind IntelliSense + ESLint

### Sau khi clone repo
```bash
# 1. Copy file env
cp .env.example .env
# Điền các key còn thiếu vào .env

# 2. Khởi động database
docker compose up -d db
# Chờ container petcare_db status = healthy

# 3. Chạy Spring Boot
# → Hibernate tự tạo bảng (ddl-auto=update)
# → Mở localhost:8080/swagger-ui.html để xem API

# 4. Chạy Frontend
cd frontend
npm install
npm run dev
# → FE chạy tại localhost:5173
```

### File cần đọc
| File | Nội dung |
|------|----------|
| `DATABASE_README.md` | Schema chi tiết 21 bảng + quy tắc nghiệp vụ |
| `PetCareHub_Sprint_Plan_Full.docx` | Task 10 ngày BE + FE |
| `docker-compose.yml` | Setup Docker PostgreSQL |
| `src/main/resources/application.yml` | Config Spring Boot: datasource, JPA, AI |
| `petcare_erd.md` | Mermaid ERD — paste vào [mermaid.live](https://mermaid.live) |

---

## 9. Quy tắc code bắt buộc

### ❌ Không được làm

```java
// ❌ Đọc lại giá trị commission sau khi booking đã tạo
booking.setCommissionFee(currentConfig.getRate() * total);

// ❌ Dùng double/float cho tiền
private double totalAmount;

// ❌ Trả Entity thẳng từ Controller
public ResponseEntity<Booking> getBooking() { ... }

// ❌ FetchType.EAGER với ManyToOne
@ManyToOne // default là EAGER — gây N+1 query
private Hotel hotel;

// ❌ Lưu enum dạng số
@Enumerated(EnumType.ORDINAL) // thêm/xóa enum là lỗi ngay
private BookingStatus status;
```

### ✅ Phải làm như này

```java
// ✅ Snapshot tại thời điểm đặt, không đổi sau
booking.setCommissionRate(0.15);        // lưu lại rate lúc đặt
booking.setCommissionFee(total.multiply(BigDecimal.valueOf(0.15)));

// ✅ BigDecimal cho mọi trường tiền
private BigDecimal totalAmount;

// ✅ Luôn dùng DTO Response
public ResponseEntity<BookingResponse> getBooking() { ... }

// ✅ LAZY cho tất cả quan hệ
@ManyToOne(fetch = FetchType.LAZY)
private Hotel hotel;

// ✅ Lưu enum dạng String
@Enumerated(EnumType.STRING)
private BookingStatus status;

// ✅ Kiểm tra phòng trống — query động, không dùng available_rooms
long booked = bookingRepo.countOverlappingBookings(roomTypeId, checkIn, checkOut);
int available = roomType.getTotalRooms() - (int) booked;
```

### Các rule cần nhớ khác

- **Transaction là One-to-Many** — một booking có thể retry thanh toán nhiều lần, transaction mới nhất `status=SUCCESS` là hợp lệ
- **Gán phòng vật lý lúc check-in** — không phải lúc đặt online (chỉ chọn `RoomType`, `Room` vật lý do nhân viên gán)
- **FE luôn dùng `.env`** — `VITE_API_URL=http://localhost:8080` (dev) → override khi deploy production
- **AI feature cần OpenAI API key** — nếu chưa có, bỏ qua và làm phần khác trước

---

## 10. Tính năng để V2 — chưa làm ở V1

| Tính năng | Ghi chú |
|-----------|---------|
| 📷 Camera xem trực tiếp (webcam) | Field `has_webcam` trong bảng `room_types` đã có sẵn trong DB, nhưng chức năng streaming thực tế chưa build. Để `false` mặc định, không hiển thị trên UI. V2 bật lên là xong, không cần thay đổi schema. |

---

## 11. Liên hệ khi cần

> ❓ Có gì không hiểu → hỏi **Huy (Lead)** hoặc đọc `DATABASE_README.md` trước.
>
> 🐾 Chúc bạn code vui!
