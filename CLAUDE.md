# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PetCare Hub** — an online pet hotel booking platform for Vietnam. Users chat with an AI assistant to find nearby pet hotels, book rooms, track daily care diaries, and pay via VNPay/MoMo/VietQR. The monorepo has two independent apps:

- `BE/` — Spring Boot 3.3.2 + Java 21 backend
- `FE/petcare-hub-fe/` — React + Vite + TypeScript frontend

## Development Commands

### Backend (BE/)

```bash
# Start PostgreSQL (required before running BE)
docker compose up -d db

# Run the Spring Boot app (from BE/ directory)
./mvnw spring-boot:run

# Build JAR
./mvnw clean package -DskipTests

# Run tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=BookingServiceTest
```

API docs available at `http://localhost:8080/swagger-ui.html` when running.

### Frontend (FE/petcare-hub-fe/)

```bash
npm install
npm run dev        # localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # preview production build
```

### Database

```bash
# Start only the DB (PostGIS-enabled PostgreSQL 16)
docker compose up -d db

# Hibernate auto-creates/updates tables on first run (ddl-auto=update)
# No manual migrations needed in dev
```

## Architecture

### Backend Package Structure (`com.petcare_hub`)

```
base/           ApiResponse<T>, BaseEntity (id, createdAt, updatedAt)
configuration/  SecurityConfig, JwtAuthFilter, OAuth2SuccessHandler, PayOsConfig,
                CloudinaryConfig, SendGridConfig, SwaggerConfiguration, PostGisConfig
controller/     One controller per domain (REST endpoints)
service/        Service interfaces + impl/ (business logic)
repository/     Spring Data JPA repositories
entity/         JPA entities — 21 tables
dto/
  request/      Inbound request DTOs
  response/     Outbound response DTOs
enums/          All enum types (BookingStatus, Role, PaymentGateway, etc.)
utils/          JwtUtils
exception/      Global exception handling
```

**Request flow:** `Controller → Service (interface) → ServiceImpl → Repository → Entity`

Controllers always return `ResponseEntity<ApiResponse<T>>` — never raw entities. MapStruct handles Entity ↔ DTO conversion.

### Frontend Structure (`FE/petcare-hub-fe/src/`)

```
routes/         Router definition (index.tsx) + PrivateRoute.tsx (role-gated)
pages/          Page components, grouped by role: admin/, partner/
components/     Shared UI components (Header, Map)
features/       auth/ (hooks, services, types)
store/          Zustand stores — authStore.ts persists to localStorage as 'petcare-auth'
lib/            axios.ts — Axios instance with JWT interceptor + auto-refresh
types/          api.ts (shared API types), enums.ts (mirrors BE enums)
utils/
```

**State management:** Zustand for auth state (persisted), React Query (`@tanstack/react-query`) for server state. The Axios instance at `lib/axios.ts` auto-attaches JWT and retries once with a refresh token on 401.

### Auth & Roles

Four roles: `OWNER` (pet owners), `PARTNER` (hotel owners), `STAFF` (care workers), `ADMIN` (platform admin). JWT access token (15 min) + refresh token (7 days). Spring Security uses `@PreAuthorize` / `hasRole()` for endpoint-level checks. `PrivateRoute` in FE gates routes by `allowedRoles`.

### Key Domain Rules

- **Money fields must use `BigDecimal`** — never `double`/`float`.
- **Snapshot financial values at booking time** — `commissionRate`, `vatRate`, `priceSnapshot`, `voucherDiscountAmount` are captured when the booking is created and never re-read from live config.
- **Commission = 8% on the full invoice total (`totalAmount` = room + services + VAT − voucher). Partner receives 92%. Rate is snapshotted to `booking.commissionRate` at creation and read from there — never hardcoded.** Formula: `commissionFee = totalAmount × commissionRate` (setScale 0, HALF_UP); `partnerShare = totalAmount − commissionFee`. Invariant: `commissionFee + partnerShare == totalAmount`.
- **Invoice formula (2026-06-17 onwards):** `taxableBase = roomTotal + serviceTotal − voucherDiscount`; `vatAmount = taxableBase × vatRate` (setScale 0, HALF_UP); `totalAmount = taxableBase + vatAmount`. **No convenience fee.** `vatRate` is read from `app.vat-rate` in `application.properties` (currently `0.08`) and snapshotted to `booking.vatRate` at creation time. To change VAT rate (e.g. back to 10% after 31/12/2026): update `application.properties` only — old bookings retain their snapshotted rate. `VAT_RATE` and `DEFAULT_COMMISSION_RATE` are two separate values — coincidentally equal at 8% but logically unrelated.
- **`BookedService` junction entity** (`booking_services` table) stores `priceSnapshot` from `Service.price` at booking time — never re-read after creation. `CascadeType.ALL` + `orphanRemoval = true` from `Booking.services`. Entity: `BE/.../entity/BookedService.java`; Repo: `BookedServiceRepository.java`.
- **Service price must always be fetched from DB** — `BookingServiceImpl.createBooking()` validates each `serviceId` exists AND belongs to the hotel, then snapshots `svc.getPrice()`. Never trust client-supplied prices.
- **Voucher not yet implemented** — `voucherDiscount` slot = 0 in formula; do NOT add voucher logic for services until BA confirms scope.
- **3 commission calculation sites** — `handleWebhook()`, `checkOut()`, `verifyPaymentStatus()` — all must read `booking.getCommissionRate()`, never hardcode values.
- **PayOS `PaymentLink.getStatus()` returns `PaymentLinkStatus` enum** — compare with `PaymentLinkStatus.PAID == info.getStatus()`, not `"PAID".equals(info.getStatus())` (String vs enum always false).
- **PayOS webhook must always return HTTP 200** — any exception (bad signature, unknown orderCode, etc.) must be caught, logged, and acknowledged with `200 + success:false`. Returning 4xx causes PayOS to retry indefinitely.
- **All JPA relations must be `FetchType.LAZY`** — never use the default EAGER on `@ManyToOne`.
- **Enums stored as `@Enumerated(EnumType.STRING)`** — never ORDINAL.
- **Available rooms = `totalRooms` − overlapping bookings** — never rely on a cached `available_rooms` counter. Use `bookingRepo.countOverlappingBookings(roomTypeId, checkIn, checkOut)`.
- **Physical room (`Room`) is assigned at check-in** — not at booking. Online booking only selects a `RoomType`.
- **Transactions are One-to-Many per booking** — retries create new `Payment` rows; the most recent `status=SUCCESS` is the valid one.

### Database

PostgreSQL 16 with PostGIS extension (`postgis/postgis:16-3.4` Docker image). Entity creation order matters for FK constraints:

```
users → pets, hotels → room_types → rooms, services → vouchers
      → bookings → booking_pets, booking_services
      → transactions → refunds → staff → tasks, pet_diary_entries
      → reviews, chat_messages, notifications, audit_logs
      → loyalty_accounts → loyalty_transactions
```

### Configuration

- Backend reads `application.properties` + optional `application-local.properties` (gitignored) for secrets.
- Frontend reads `VITE_API_URL` (defaults to `http://localhost:8080`). Set in `.env` for local overrides; override at deploy time for production.
- AI features (Spring AI + pgvector + OpenAI GPT-4o-mini) are disabled by default via `spring.autoconfigure.exclude` — requires `OPENAI_API_KEY` to enable.

### Payment Integration

PayOS/VNPay/MoMo return to `frontend.base-url` (configured in `application.properties`). The `PaymentResultPage` at `/payment-result` handles the callback.

## Test Coverage (2026-06-17)

Run the payment/withdrawal test suite with:

```bash
# Java 24 requires this flag for Mockito (Byte Buddy compat)
./mvnw test -Dnet.bytebuddy.experimental=true \
  -Dtest="PaymentWebhookTest,BookingCheckoutTest,WithdrawalTest,BookingCreateTest"
```

### Test files

| File | Luồng được kiểm tra |
|---|---|
| `BE/src/test/java/com/petcare_hub/payment/PaymentWebhookTest.java` | Webhook PayOS: chữ ký hợp lệ/sai, idempotency, commissionRate snapshot, orderCode không tồn tại, code ≠ 00, HTTP response code; `verifyPaymentStatus` commission snapshot (test J) |
| `BE/src/test/java/com/petcare_hub/payment/BookingCheckoutTest.java` | Check-in (CONFIRMED→CHECKED_IN, PENDING→exception), checkout (CHECKED_IN→COMPLETED + chuyển pending→balance, double checkout→exception), commissionFee snapshot, @Transactional |
| `BE/src/test/java/com/petcare_hub/payment/WithdrawalTest.java` | Rút tiền: validate server-side, freeze balance, approve (có/không biên lai), idempotency, từ chối + hoàn tiền, @PreAuthorize/@Transactional |
| `BE/src/test/java/com/petcare_hub/payment/BookingCreateTest.java` | `createBooking` có dịch vụ: totalAmount=(room+svc)×1.08 (không +10000), commission 8%, priceSnapshot immutable; serviceId không tồn tại/thuộc hotel khác → AppException |

### Kết quả: 34/34 PASS ✅

Tất cả test đều xanh sau khi fix BUG-1 → BUG-5. Xem bảng **Bug History** bên dưới để biết chi tiết từng fix.

## Bug History (tất cả đã fix — 2026-06-17)

| Bug ID | Mô tả gốc | Severity | File fix | Status |
|---|---|---|---|---|
| BUG-1a | `handleWebhook` hardcode `× 0.92`, bỏ qua `booking.commissionRate` snapshot | 🔴 tiền sai | `PaymentController.java:270` | ✅ FIXED |
| BUG-1b | `checkOut` hardcode `× 0.92`, bỏ qua `booking.commissionRate` snapshot | 🔴 tiền sai | `BookingServiceImpl.java:302` | ✅ FIXED |
| BUG-1c | `verifyPaymentStatus` hardcode `× 0.92`, bỏ qua snapshot | 🔴 tiền sai | `PaymentController.java:153` | ✅ FIXED |
| BUG-2 | Webhook catch block trả `HTTP 400` khi signature sai → PayOS retry vô hạn | 🔴 retry vô hạn | `PaymentController.java:291` | ✅ FIXED |
| BUG-2b | Webhook catch block trả `HTTP 400` khi `orderCode` không tồn tại → PayOS retry vô hạn | 🔴 retry vô hạn | `PaymentController.java:291` | ✅ FIXED |
| BUG-3 | `commissionFee` lưu DB = `roomTotal × 0.15` thay vì `totalAmount × 0.08` — báo cáo sai 15,100 VNĐ/booking | 🔴 báo cáo sai | `BookingServiceImpl.java:146` | ✅ FIXED |
| BUG-4 | `partnerShare` thiếu `.setScale(0, HALF_UP)` → scale=2 cho VNĐ | 🟡 code quality | `PaymentController.java:270`, `BookingServiceImpl.java:302` | ✅ FIXED |
| BUG-5 | `verifyPaymentStatus` so sánh `"PAID".equals(getStatus())` là String vs `PaymentLinkStatus` enum → luôn false → nhánh PAID không bao giờ chạy | 🔴 tính năng không hoạt động | `PaymentController.java:143` | ✅ FIXED |

### Chi tiết từng fix

**BUG-1 + BUG-3 + BUG-4 — Mô hình hoa hồng sai (fix cùng lúc):**

Trước đây code dùng `DEFAULT_COMMISSION_RATE = 0.15` nhân trên `roomTotal` để lưu `commissionFee`, nhưng lại hardcode `× 0.92` (= 1 − 0.08) khi tính tiền thực trả cho đối tác — hai con số không nhất quán với nhau và đều sai mô hình nghiệp vụ.

Fix: một nguồn sự thật duy nhất.
```java
// BookingServiceImpl — DEFAULT_COMMISSION_RATE
private static final double DEFAULT_COMMISSION_RATE = 0.08; // nền tảng thu 8% trên totalAmount

// createBooking — commissionFee snapshot
BigDecimal commissionFee = totalAmount
        .multiply(BigDecimal.valueOf(DEFAULT_COMMISSION_RATE))
        .setScale(0, RoundingMode.HALF_UP);  // base = totalAmount, không phải roomTotal

// checkOut & handleWebhook — partnerShare đọc từ snapshot
BigDecimal commissionFee = totalAmount
        .multiply(BigDecimal.valueOf(booking.getCommissionRate()))
        .setScale(0, RoundingMode.HALF_UP);
BigDecimal partnerShare = totalAmount.subtract(commissionFee).setScale(0, RoundingMode.HALF_UP);
```

Với `totalAmount = 280,000 VNĐ` và `commissionRate = 0.08`: `commissionFee = 22,400`, `partnerShare = 257,600`, tổng = `280,000` ✓

**BUG-2 + BUG-2b — Webhook trả HTTP 400 gây PayOS retry vô hạn:**

Fix: catch block trả `ResponseEntity.ok(...)` thay vì `ResponseEntity.status(BAD_REQUEST)`. Mọi exception đều được log và ack với HTTP 200 + `success: false`.

```java
} catch (Exception e) {
    log.error("Lỗi xử lý webhook payOS (vẫn ack 200 để PayOS không retry): ", e);
    return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
}
```

### Chi tiết BUG-5

`verifyPaymentStatus()` gọi `payOS.paymentRequests().get(orderCode)` trả về `PaymentLink`. `PaymentLink.getStatus()` trả `PaymentLinkStatus` (enum từ `vn.payos.model.v2.paymentRequests`), nhưng code kiểm tra `"PAID".equals(info.getStatus())` — `String.equals(Object)` luôn `false` khi argument không phải String. Kết quả: nhánh PAID không bao giờ chạy, pendingBalance không được cộng qua polling.

Fix:
```java
// Trước (sai — String vs enum)
if ("PAID".equals(info.getStatus())) { ... }
if ("CANCELLED".equals(info.getStatus()) || "EXPIRED".equals(info.getStatus())) { ... }

// Sau (đúng — enum so sánh trực tiếp)
if (PaymentLinkStatus.PAID == info.getStatus()) { ... }
if (PaymentLinkStatus.CANCELLED == info.getStatus() || PaymentLinkStatus.EXPIRED == info.getStatus()) { ... }
```

### Chi tiết services feature (được thêm cùng lúc với BUG-1c/BUG-5)

`createBooking()` nay xử lý `request.getServiceIds()`:
1. Validate từng serviceId tồn tại trong DB và thuộc đúng hotel
2. Snapshot `svc.getPrice()` vào `BookedService.priceSnapshot`
3. Tính `serviceTotal`, đưa vào `taxableBase`

### Công thức hóa đơn hiện hành (2026-06-17, bỏ phí tiện ích)

```java
BigDecimal taxableBase = roomTotal.subtract(voucherDiscount).add(serviceTotal);
BigDecimal vatAmount   = taxableBase.multiply(BigDecimal.valueOf(vatRate)).setScale(0, HALF_UP);
BigDecimal totalAmount = taxableBase.add(vatAmount);   // không còn + CONVENIENCE_FEE
```

`vatRate` được đọc từ `app.vat-rate=0.08` (application.properties) và snapshot vào `booking.vatRate`. VAT 8% áp dụng đến hết 31/12/2026; sau đó đổi `app.vat-rate=0.10` — chỉ sửa config, không cần sửa code.

Ví dụ với room=400,000 + services=150,000: taxableBase=550,000; VAT(8%)=44,000; **total=594,000**; commissionFee=47,520; partnerShare=546,480.
