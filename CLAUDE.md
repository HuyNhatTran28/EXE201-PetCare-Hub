# CLAUDE.md

File này hướng dẫn Claude Code (claude.ai/code) khi làm việc với repo này. Đây là tài liệu tổng — người mới đọc xong có thể hiểu toàn bộ kiến trúc, luồng nghiệp vụ, phân quyền và các API của dự án.

> Cập nhật lần gần nhất: 2026-07-02 (rà soát toàn bộ BE + FE trước giai đoạn deploy).

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Lệnh chạy dự án](#2-lệnh-chạy-dự-án)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Bảng phân quyền 4 role](#4-bảng-phân-quyền-4-role)
5. [Chi tiết từng tính năng](#5-chi-tiết-từng-tính-năng)
6. [Danh sách toàn bộ endpoint API](#6-danh-sách-toàn-bộ-endpoint-api)
7. [Entity / bảng DB chính và quan hệ](#7-entity--bảng-db-chính-và-quan-hệ)
8. [Quy tắc nghiệp vụ quan trọng](#8-quy-tắc-nghiệp-vụ-quan-trọng)
9. [Cấu hình môi trường](#9-cấu-hình-môi-trường)
10. [Lịch sử kỹ thuật / Bug đã fix trước đây](#10-lịch-sử-kỹ-thuật--bug-đã-fix-trước-đây)
11. [Các vấn đề đã biết, chưa fix (2026-07-02)](#11-các-vấn-đề-đã-biết-chưa-fix-2026-07-02)

---

## 1. Tổng quan dự án

**PetCare Hub** — nền tảng đặt phòng khách sạn thú cưng trực tuyến tại Việt Nam. Người dùng chat với trợ lý AI để tìm khách sạn thú cưng gần đó, đặt phòng, theo dõi nhật ký chăm sóc hằng ngày, và thanh toán qua PayOS (VietQR). Monorepo gồm 2 app độc lập:

- `BE/` — Spring Boot 3.3.2 + Java 21, PostgreSQL 16 (PostGIS)
- `FE/petcare-hub-fe/` — React 18 + Vite + TypeScript, Zustand + React Query

Bốn vai trò: **OWNER** (chủ thú cưng/khách đặt phòng), **PARTNER** (chủ khách sạn), **STAFF** (nhân viên khách sạn), **ADMIN** (quản trị nền tảng).

## 2. Lệnh chạy dự án

### Backend (`BE/`)

```bash
docker compose up -d db          # PostgreSQL 16 + PostGIS (bắt buộc trước khi chạy BE)
./mvnw spring-boot:run            # chạy app (từ thư mục BE/)
./mvnw clean package -DskipTests  # build JAR
./mvnw test                       # chạy toàn bộ test
./mvnw test -Dtest=BookingServiceTest   # chạy 1 test class

# Test thanh toán/rút tiền (Java 24 cần flag Mockito/Byte Buddy)
./mvnw test -Dnet.bytebuddy.experimental=true \
  -Dtest="PaymentWebhookTest,BookingCheckoutTest,WithdrawalTest,BookingCreateTest"
```

Swagger UI: `http://localhost:8080/swagger-ui.html`.

### Frontend (`FE/petcare-hub-fe/`)

```bash
npm install
npm run dev        # localhost:5173
npm run build       # tsc -b && vite build
npm run lint
npm run preview
```

### Database

```bash
docker compose up -d db   # postgis/postgis:16-3.4
# Hibernate tự tạo/cập nhật bảng khi chạy lần đầu (ddl-auto=update) — không cần migration thủ công ở dev
```

## 3. Cấu trúc thư mục

### Backend (`com.petcare_hub`)

```
base/           ApiResponse<T>, BaseEntity (id, createdAt, updatedAt)
configuration/  SecurityConfig, JwtAuthFilter, JwtChannelInterceptor, OAuth2SuccessHandler,
                PayOsConfig, CloudinaryConfig, SendGridConfig, SwaggerConfiguration,
                PostGisConfig, WebSocketConfig, DataSeeder, JacksonConfig, GlobalBindingInitializer
controller/     21 controller (1 controller/domain), trả về ResponseEntity<ApiResponse<T>> hoặc entity/DTO trực tiếp
service/        Service interface + impl/ (business logic)
repository/     Spring Data JPA repository
entity/         28 JPA entity
dto/
  request/      DTO đầu vào
  response/     DTO đầu ra
enums/          31 enum (BookingStatus, Role, PaymentGateway, HotelStatus, ...)
scheduler/      BookingScheduler — tự hủy booking PENDING quá hạn
utils/          JwtUtils
exception/      GlobalExceptionHandler
```

**Luồng request:** `Controller → Service (interface) → ServiceImpl → Repository → Entity`. MapStruct/DTO tự map Entity ↔ DTO (nhiều nơi vẫn trả entity trực tiếp, ví dụ `PetController`, `VoucherController` — xem mục 11).

### Frontend (`FE/petcare-hub-fe/src/`)

```
routes/         index.tsx (khai báo router) + PrivateRoute.tsx (gate theo allowedRoles)
pages/          Trang theo role: admin/, partner/, và trang chung ở gốc pages/
components/     Header, Map, ChatWidget, ChatBoxWindow, MessengerPanel, BookingChatModal, WebGLBackground
features/       auth/ (hooks, services, types)
store/          Zustand: authStore.ts (persist localStorage 'petcare-auth'), hotelStore.ts (context hotel đang chọn + popup chat)
lib/            axios.ts — Axios instance, tự gắn JWT + tự refresh khi 401
hooks/          useChatSocket.ts — wrapper STOMP/SockJS dùng chung cho chat + diary realtime
types/          api.ts, enums.ts (đồng bộ enum với BE)
utils/          maskAccountNumber.ts, navigateByRole.ts, ...
```

## 4. Bảng phân quyền 4 role

| Khu vực | OWNER | PARTNER | STAFF | ADMIN |
|---|---|---|---|---|
| Đăng ký/đăng nhập, hồ sơ cá nhân | ✅ | ✅ | ✅ | ✅ |
| Quản lý thú cưng (`/pets/**`) | ✅ (chỉ pet của mình) | ❌ | ❌ | ❌ |
| Xem/đặt phòng khách sạn | ✅ | ❌ | ❌ | ❌ |
| Nhật ký thú cưng — viết/sửa | (chỉ xem của pet mình) | ✅ (khách sạn mình) | ✅ (khách sạn công tác) | ❌ |
| Nhật ký thú cưng — xoá | ❌ | ✅ (chỉ PARTNER) | ❌ | ❌ |
| Tạo/sửa khách sạn, phòng, dịch vụ | ❌ | ✅ (khách sạn của mình) | ❌ | ❌ |
| Check-in / Check-out booking | ❌ | ✅ | ✅ | ❌ |
| Xác nhận booking (`confirm`) | ❌ | ✅ | ❌ | ✅ |
| Quản lý nhân viên (`/api/staff`, `/api/partner/staff`) | ❌ | ✅ | ❌ | ❌ |
| Ví đối tác + yêu cầu rút tiền | ❌ | ✅ (ví của mình) | ❌ | ❌ |
| Duyệt/từ chối rút tiền | ❌ | ❌ | ❌ | ✅ |
| Duyệt/từ chối cơ sở (Hotel PENDING) | ❌ | ❌ | ❌ | ✅ |
| CRM (xem pet + booking khách của mình) | ❌ | ✅ | ❌ | ❌ |
| KYC merchant (`/api/merchant/kyc/**`) | ⚠️ có thể gọi (thiếu check role, xem mục 11) | ✅ (chủ đích) | ⚠️ có thể gọi | ⚠️ có thể gọi |
| Voucher (tạo/sửa) | ❌ | ❌ | ❌ | ✅ |
| Trang quản trị (users, hotels, analytics, feedback, audit) | ❌ | ❌ | ❌ | ✅ |
| Chat AI (`/api/chat`) | ✅ (public, không cần đăng nhập) | ✅ | ✅ | ✅ |
| Chat real-time người-người | ✅ (theo booking) | ✅ (theo khách sạn) | ✅ (theo khách sạn) | ❌ |

Chi tiết kỹ thuật (route matcher, `@PreAuthorize`) nằm ở mục 6 và mục 11.

**FE route gate** (`routes/index.tsx` + `PrivateRoute.tsx`):
- Public (không cần đăng nhập): `/`, `/login`, `/oauth-callback`, `/register`, `/forgot-password`, `/hotels`, `/hotels/:id`, `/route-search`, `/map`, `/chat`.
- Bất kỳ role nào đã đăng nhập: `/profile`, `/my-bookings`, `/payment-result`, `/force-change-password`.
- `OWNER`: `/pets`, `/pet-diaries`, `/booking/:roomTypeId`.
- `PARTNER`: `/partner/dashboard`, `/partner/hotels/:hotelId/rooms`, `/partner/hotels/:hotelId/services`, `/partner/bookings`, `/partner/hotels/new`, `/partner/staff`.
- `PARTNER` + `STAFF`: `/partner/messages`, `/partner/diaries`.
- `ADMIN`: `/admin/dashboard`, `/admin/hotels`, `/admin/users`, `/admin/marketing`, `/admin/analytics`, `/admin/audit`, `/admin/settings`, `/admin/withdrawals`, `/admin/feedbacks`.

`PrivateRoute` chỉ kiểm `isAuthenticated()` + `allowedRoles.includes(user.role)` — **không** re-check `mustChangePassword` sau lần đăng nhập đầu (xem mục 11).

## 5. Chi tiết từng tính năng

### 5.1 Đăng ký + xác thực OTP qua email

- `POST /api/auth/register` → `AuthServiceImpl.register()`: kiểm tra trùng email/phone (409 nếu trùng), tạo `User` với `isVerified=false`, sinh OTP 6 số (`SecureRandom`, `AuthServiceImpl.generateOtp()`), lưu **tạm trong RAM** (`ConcurrentHashMap<String,OtpEntry>`, hết hạn sau 5 phút — comment code ghi rõ "Production → thay bằng Redis"), gửi email OTP đồng bộ (blocking) qua `JavaMailSender`.
- `POST /api/auth/register/verify` → `AuthServiceImpl.verifyRegisterOtp()`: kiểm tra OTP còn hạn + đúng mã → `isVerified=true` → **đăng nhập luôn** (trả JWT access+refresh).
- `POST /api/auth/register/resend-otp` → gửi lại OTP mới.
- `User.isVerified=false` sẽ bị chặn ở `login()` với lỗi "Tài khoản chưa được xác thực email".
- ⚠️ **`RegisterRequest.role` không giới hạn giá trị** — client có thể tự gửi `role=ADMIN`. Xem mục 11, mức **CRITICAL**.

### 5.2 Đăng nhập email/mật khẩu

- `POST /api/auth/login` → `AuthServiceImpl.login()`: so khớp `email` + `password` (BCrypt strength 12, `SecurityConfig.passwordEncoder()`), chặn nếu `isActive=false` (403) hoặc `isVerified=false` (400).
- JWT: access token 15 phút (`900000` ms), refresh token 7 ngày (`604800000` ms) — cấu hình tại `application.properties` (`jwt.access-token-expiration-ms`, `jwt.refresh-token-expiration-ms`), có fallback mặc định nếu thiếu biến môi trường (xem mục 11 — rủi ro secret mặc định).
- `POST /api/auth/refresh` → cấp access token mới, **tái sử dụng cùng refresh token cũ** (không xoay vòng refresh token).
- FE (`lib/axios.ts`): interceptor tự gắn `Authorization: Bearer <token>`, khi gặp 401 thì gọi `/api/auth/refresh` một lần (`_retry` flag chống lặp vô hạn), thất bại thì `logout()` + redirect `/login`.

### 5.3 Đăng nhập Google OAuth2

- `SecurityConfig` bật `oauth2Login` với `OAuth2SuccessHandler` — redirect callback: `http://localhost:8080/login/oauth2/code/google`.
- `OAuth2ServiceImpl.processGoogleLogin()`:
  1. Tìm theo `googleId`.
  2. Không có → tìm theo `email`, nếu có thì **liên kết**: gán `googleId` vào user cũ (giữ role hiện tại, không đổi `isVerified`).
  3. Không có cả hai → **tạo user mới với `role=OWNER`, `isVerified=true`** (Google đã xác thực email).
  4. Cấp JWT **không kiểm tra `isActive`/`isVerified`** — user bị khoá (`isActive=false`, ví dụ staff bị partner tắt) vẫn login được qua Google (xem mục 11).
- `OAuth2SuccessHandler` redirect FE: `{frontend.base-url}/oauth-callback?token=...&refreshToken=...` (token nằm trên query string, có thể lưu vào lịch sử trình duyệt/log — xem mục 11).
- FE `OAuthCallbackPage.tsx`: đọc token từ query, gọi `GET /api/auth/me`, lưu vào `authStore`, điều hướng theo role qua `utils/navigateByRole.ts`:
  - `ADMIN` → `/admin/dashboard`, `PARTNER` → `/partner/dashboard`, `STAFF` → `/partner/messages`, còn lại (`OWNER`) → `/hotels`.

### 5.4 Phân quyền 4 role

Xem mục 4 (bảng tổng hợp) và mục 6 (chi tiết từng endpoint). Cơ chế: `SecurityConfig.authorizeHttpRequests()` (URL matcher toàn cục) + `@PreAuthorize`/`hasRole` cấp method trên từng controller (`@EnableMethodSecurity`). `JwtAuthFilter` set `SecurityContext` với principal là `UUID userId` và authority `ROLE_<role>`.

### 5.5 Quản lý hồ sơ thú cưng (Pet)

- `PetController.java`, toàn bộ endpoint `hasRole('OWNER')`.
- `POST /api/pets`: `owner` luôn lấy từ JWT (không tin client gửi `ownerId`).
- `PUT/DELETE /api/pets/{id}`: kiểm tra `pet.getOwner().getId().equals(ownerId)` → 403 nếu không khớp. **Không có lỗ hổng ở đây.**
- Entity `Pet`: species/breed/weightKg/ageYears/isVaccinated/vaccineBookUrls (JSON)/specialNotes/avatarUrl/foodType/feedingSchedule/personalityTags (JSON)/isIndoorOnly/hasSpecialDiet/microchipId.

### 5.6 Tìm/xem khách sạn

- **Tìm kiếm**: `GET /api/hotels/search` (keyword/toạ độ), `GET /api/hotels/nearby` (PostGIS, bán kính), `POST /api/hotels/search-along-route` (`RouteSearchController`, tìm dọc tuyến đường — PostGIS native query).
- Tất cả 3 endpoint trên đều **hard-code `WHERE status = 'ACTIVE'`** trong query (`HotelRepository.findNearbyHotels`, `findHotelsWithFilter`, `findHotelsAlongRoute`) — an toàn.
- **Chi tiết khách sạn**: `GET /api/hotels/{id}` — fetch bằng `findById` (không filter ở repo) nhưng **service layer** chặn: nếu `status != ACTIVE` thì chỉ chủ khách sạn hoặc admin mới xem được, còn lại 404. An toàn.
- **Danh sách phòng**: `GET /api/room-types/hotel/{hotelId}` — ⚠️ có lỗ hổng khi truyền `activeOnly=false`, xem mục 11 (CRITICAL).
- **Dịch vụ**: `GET /api/services/hotel/{hotelId}` — check `status==ACTIVE` **không điều kiện** (đúng, an toàn dù truyền `enabledOnly` gì).
- **Review**: `GET /api/reviews/hotel/{hotelId}` — service layer check `status==ACTIVE`. An toàn.
- **Kiểm tra phòng trống**: `GET /api/room-types/{id}/availability` — check `status==ACTIVE` + trả số phòng còn trống (xem mục 5.8/8 về chống overbooking).

### 5.7 Đặt phòng (OVERNIGHT + DAYCARE)

- `POST /api/bookings` (`hasRole('OWNER')`) → `BookingServiceImpl.createBooking()`.
- Hai loại `BookingType`:
  - **OVERNIGHT**: `checkOutDate` phải sau `checkInDate`; tiền phòng = `pricePerNight × số đêm` (`DAYS.between(checkIn, checkOut)`); ngày check-out không tính chặn phòng (`reqEnd = checkOutDate.minusDays(1)`).
  - **DAYCARE**: `checkOutDate >= checkInDate`, bắt buộc `dropOffTime < pickUpTime`; tiền phòng = `dayRate × (số ngày + 1)`; ngày check-out **có** tính chặn phòng (`reqEnd = checkOutDate`). Yêu cầu `roomType.dayRate != null`.
- Có thể đính kèm dịch vụ (`serviceIds`) — mỗi service được validate tồn tại + thuộc đúng hotel, giá **luôn snapshot từ DB** (`svc.getPrice()`) vào `BookedService.priceSnapshot`, không tin giá client gửi.
- Có thể áp `voucherCode` (chỉ giảm giá trên `roomTotal`, không áp dụng cho `serviceTotal`) — xem mục 8.
- **`BookingStatus`**: `PENDING → CONFIRMED → CHECKED_IN → COMPLETED`, hoặc `→ CANCELLED` từ bất kỳ trạng thái nào trừ `CHECKED_IN`/`COMPLETED`.
  - `PENDING → CONFIRMED`: thanh toán thành công (webhook/poll) hoặc admin/partner gọi `PATCH /{id}/confirm`.
  - `CONFIRMED → CHECKED_IN`: staff/partner gọi `PATCH /{id}/checkin` (yêu cầu đúng `CONFIRMED`).
  - `CHECKED_IN → COMPLETED`: staff/partner gọi `PATCH /{id}/checkout` (yêu cầu đúng `CHECKED_IN`) — tại đây tính `commissionFee`/`partnerShare` và cộng ví đối tác.
  - `* → CANCELLED`: chủ động qua `PATCH /{id}/cancel` (**không có `@PreAuthorize`, không check ownership** — xem mục 11), hoặc tự động qua `BookingScheduler` (huỷ `PENDING` quá 15 phút với thanh toán online, quá 24h với `CASH`), hoặc khi PayOS báo `CANCELLED`/`EXPIRED`.
- ⚠️ **`getBooking`, `cancelBooking`, `checkIn`, `checkOut`, `confirmBooking`, `getHotelBookings` đều thiếu kiểm tra chủ sở hữu/khách sạn** — xem mục 11 (CRITICAL/HIGH).

### 5.8 Chống overbooking

- `BookingServiceImpl.createBooking()` — trước khi lưu booking, đếm số booking đang chồng lấn ngày:
  ```java
  long overlapping = bookingRepository.countOverlappingBookings(roomType.getId(), reqStart, reqEnd);
  if (overlapping >= roomType.getTotalRooms()) {
      throw new AppException("Loại phòng này đã hết chỗ trong thời gian bạn chọn", HttpStatus.CONFLICT);
  }
  ```
  **Đã xác nhận: đây là chặn thật sự** (ném `AppException` với `HttpStatus.CONFLICT` → HTTP 409 thật, không phải chỉ đổi message). `BookingRepository.countOverlappingBookings` chỉ đếm booking ở trạng thái `PENDING/CONFIRMED/CHECKED_IN/COMPLETED` (loại trừ `CANCELLED`) có khoảng ngày chồng lấn.
- **Available rooms = `totalRooms` − số booking chồng lấn** — không dùng counter cache.
- ⚠️ Cơ chế "đếm rồi ghi" **không có khoá hàng** (`SELECT ... FOR UPDATE`) và không có ràng buộc DB chống chồng lấn → có race condition thật khi 2 request đặt phòng cuối cùng cùng lúc. Xem mục 11 (HIGH).

### 5.9 Thanh toán PayOS/VietQR

- `POST /api/payment/create-payment-link` → yêu cầu booking đang `PENDING`, tạo `Payment` (status `PENDING`, `qrExpiresAt = now+15p`), gọi PayOS SDK tạo link/QR.
- `GET /api/payment/verify/{bookingId}` — FE poll sau khi redirect về từ PayOS (`PaymentResultPage.tsx`), gọi `payOS.paymentRequests().get(orderCode)`; nếu `PaymentLinkStatus.PAID` (so sánh **enum**, không phải String) và `payment.status==PENDING` thì set `SUCCESS` + booking `CONFIRMED` + cộng ví đối tác (`pendingBalance`); nếu `CANCELLED/EXPIRED` thì set `FAILED` + booking `CANCELLED`.
- `POST /api/payment/payos-webhook` — xác minh chữ ký bằng `payOS.webhooks().verify(webhook)`; mọi exception (chữ ký sai, orderCode không tồn tại...) đều bị bắt và **luôn trả HTTP 200** (`{"success":false,...}`) để PayOS không retry vô hạn. Có idempotency guard: chỉ set `SUCCESS`/cộng ví khi `payment.status==PENDING`.
- ⚠️ **`/api/payment/**` không nằm trong danh sách `permitAll()` của `SecurityConfig`** — webhook PayOS (không mang JWT) nhiều khả năng bị Spring Security chặn 401 trước khi vào tới controller. Xem mục 11 (CRITICAL — cần xác minh thực tế qua log/dashboard PayOS).
- ⚠️ Không có `@PreAuthorize`/ownership check trên `createPaymentLink`/`verifyPaymentStatus` — bất kỳ user nào đã đăng nhập cũng gọi được cho `bookingId` bất kỳ (IDOR).
- ⚠️ `handleWebhook()` và `verifyPaymentStatus()` cùng dùng pattern "đọc `status==PENDING` rồi ghi" không khoá hàng → có thể cộng ví đối tác 2 lần nếu webhook và poll của FE chạy gần như đồng thời (thực tế dễ xảy ra vì `PaymentResultPage` gọi verify ngay khi redirect về, đúng lúc PayOS cũng đang gọi webhook).

### 5.10 Ví đối tác + rút tiền

- `PartnerWallet`: `balance` (khả dụng) + `pendingBalance` (tiền booking online chưa checkout).
- Tại `checkOut()`: nếu `paymentMethod=CASH` → trừ thẳng `commissionFee` khỏi `balance` (partner tự thu 100% tại quầy, nền tảng thu phí hoa hồng) — **không kiểm tra `balance` đủ hay không, có thể âm** (xem mục 11). Nếu online → chuyển `partnerShare` từ `pendingBalance` sang `balance`.
- `POST /api/partner/withdraw` — validate `amount>0` và `balance>=amount`, **trừ ngay `balance`** tại thời điểm yêu cầu (đóng băng tiền), tạo `WithdrawalRequest(status=PENDING)`.
- `POST /api/admin/withdrawals/{id}/approve` — yêu cầu có `receiptImageUrl`, set `APPROVED` (không đụng tới `balance` vì đã trừ từ lúc yêu cầu).
- `POST /api/admin/withdrawals/{id}/reject` — set `REJECTED`, **hoàn tiền lại `balance`**.
- `WithdrawalStatus`: `PENDING/APPROVED/REJECTED` — không có state "đã chuyển khoản thực tế" tách biệt, dựa vào `receiptImageUrl` làm bằng chứng thủ công.
- Mask số tài khoản: **chỉ làm ở FE** (`utils/maskAccountNumber.ts`), BE luôn trả số tài khoản gốc không che trong `WithdrawalController` (partner xem ví của mình, admin cần số đầy đủ để chuyển khoản — không phải lỗi lộ chéo, nhưng không có lớp che ở BE làm an toàn dự phòng).

### 5.11 Admin duyệt cơ sở (Hotel)

- `HotelStatus`: `PENDING` (mặc định khi tạo) → `ACTIVE` (admin duyệt) / `REJECTED` (admin từ chối); partner có thể tự `CLOSED`/mở lại khi đã `ACTIVE`.
- `PATCH /api/admin/hotels/{id}/approve`, `PATCH /api/admin/hotels/{id}/reject` (`AdminController`, `hasRole('ADMIN')`) — set status, `reject` lưu `rejectionReason`.
- Còn một endpoint admin thứ 2 cho phép set **bất kỳ** status tuỳ ý không qua state-machine: `PATCH /api/hotels/{id}/status` (`HotelController`, cũng `hasRole('ADMIN')`) — dùng cho các trường hợp đặc biệt nhưng không ràng buộc logic nghiệp vụ (ví dụ set `ACTIVE` mà không qua KYC).
- **Gửi lại sau khi bị từ chối**: `PATCH /api/hotels/{id}/resubmit` (partner, yêu cầu đang `REJECTED` → về `PENDING`), hoặc **tự động** khi partner sửa hotel bằng `PUT /api/hotels/{id}` trong lúc đang `REJECTED` (tự chuyển về `PENDING`).
- **Ẩn khách sạn chưa `ACTIVE` khỏi khách hàng**: xem mục 5.6 — đa số endpoint đã chặn đúng, ngoại trừ lỗ hổng ở `RoomType` (mục 11).

### 5.12 Chat

**5.12.1 Chatbot AI** — `POST /api/chat`, public (không cần đăng nhập), rate-limit theo IP (10 req/60s). Không dùng Spring AI/OpenAI (dependency chỉ khai báo version property, `spring.autoconfigure.exclude` tắt hẳn `OpenAiAutoConfiguration`/`PgVectorStoreAutoConfiguration`) — chatbot thật sự gọi **Groq** (endpoint tương thích OpenAI, model `llama-3.3-70b-versatile`, cấu hình `groq.api.key`/`groq.model`). Chatbot đọc catalog `RoomType`/`Service` thật từ DB để tư vấn, có thể emit `[[ROOMS: R1,R2]]` (FE render carousel phòng gợi ý) hoặc `[[FEEDBACK: TYPE|nội dung]]` (lưu vào bảng `Feedback`, đổ về trang Admin Feedback). Giới hạn: tin nhắn ≤1000 ký tự, lịch sử giữ 10 tin gần nhất, quota gọi API toàn cục/ngày (`app.chat.daily-limit=1000`), tự retry khi Groq trả 429/503.

**5.12.2 Chat real-time người-người** — entity `Conversation` (1 conversation/booking, `bookingId` unique) + `ConversationMessage`.
- REST: `POST /api/conversations/booking/{bookingId}` (owner, get-or-create), `GET /api/conversations/me` (owner), `GET /api/conversations/hotel[?hotelId]` (staff/partner), `GET /api/conversations/{id}/messages` (lịch sử, đánh dấu đã đọc), `DELETE /api/conversations/{id}` (soft delete).
- WebSocket: endpoint `/ws` (SockJS fallback), broker `/topic` + `/queue`, prefix gửi `/app`. Xác thực **chỉ ở frame STOMP CONNECT** — `JwtChannelInterceptor` đọc header `Authorization: Bearer <token>` trong CONNECT, set `Principal`; các frame sau kế thừa principal đó. HTTP layer để `/ws/**` `permitAll()` (bắt buộc vì handshake chưa có JWT ở header HTTP thường).
- Destination: client gửi `/app/chat/{conversationId}`, server broadcast `/topic/conversation/{conversationId}`; lỗi cá nhân gửi qua `/queue/errors`.
- Role người gửi được **suy ra từ DB** (không tin client): khớp `ownerId`, hoặc `staff.workplace`, hoặc `partner.hotel` với conversation đang thao tác.
- FE: `ChatWidget.tsx` (widget nổi 2 tab: "Trợ lý AI" + "Nhắn khách sạn/khách hàng" — tab nhắn tin bị ẩn hoàn toàn với PARTNER/STAFF, 2 role này dùng `StaffChatPage.tsx` (`/partner/messages`) + `MessengerPanel`/`ChatBoxWindow` kiểu popup Messenger thay thế), `BookingChatModal.tsx` (owner chat theo booking cụ thể từ `MyBookingsPage`), `ChatPage.tsx` (trang AI đơn giản, không có room carousel).
- ⚠️ `WebSocketConfig` hard-code origin cho phép chỉ `localhost:5173`/`3000` — cần bổ sung origin production trước khi deploy.

### 5.13 Quản lý nhân viên

Có **2 luồng song song**, cần phân biệt rõ:

1. **`StaffManagementController` (`/api/staff`)** — tạo tài khoản STAFF **hoàn toàn mới**: partner nhập email/tên/chức vụ, hệ thống tự sinh **mật khẩu tạm 12 ký tự** (`SecureRandom`, bảng ký tự an toàn), tạo `User(role=STAFF, isVerified=true, mustChangePassword=true)` (bỏ qua luồng OTP vì partner đã xác thực hộ), gửi email chào mừng kèm mật khẩu tạm (`AsyncEmailService.sendStaffWelcomeEmailAsync`, lỗi gửi mail không rollback việc tạo tài khoản). `PATCH /{staffId}/toggle-active` để khoá/mở tài khoản staff.
2. **`StaffController` (`/api/partner/staff`)** — **gán role STAFF cho tài khoản đã tồn tại**: yêu cầu user tự đăng ký trước (bất kỳ role nào không phải ADMIN/PARTNER), partner "nhận" họ vào khách sạn bằng email → đổi `role=STAFF`, tạo `Staff` liên kết. **Không sinh mật khẩu tạm, không set `mustChangePassword`, không gửi email** — vì tài khoản vốn đã có mật khẩu do chính người dùng đặt.

Hai luồng phục vụ 2 tình huống khác nhau (tạo mới vs. gán role) nhưng dễ gây nhầm lẫn khi bảo trì — nên ghi rõ trong code/API doc khi làm việc tiếp.

**Ép đổi mật khẩu lần đầu**: `POST /api/auth/force-change-password` — verify mật khẩu tạm đúng rồi set mật khẩu mới + `mustChangePassword=false`. FE chỉ redirect sang `/force-change-password` **một lần duy nhất, ngay sau khi `useLogin` nhận response** — nếu token được khôi phục từ `localStorage` (F5 lại trang) mà chưa đổi mật khẩu, `PrivateRoute` **không** re-check cờ này để bắt đổi lại. BE cũng không chặn bất kỳ endpoint nào khác dựa trên `mustChangePassword` — chỉ là gợi ý UX ở FE (xem mục 11).

### 5.14 Điểm thưởng + hạng thành viên

**Tính năng này tồn tại trong domain model nhưng CHƯA được nối dây (dead code)**: `PointLog` (entity), `PointAction` (enum: EARN/REDEEM/EXPIRE/ADJUST), `MembershipTier` (enum: SILVER/GOLD/PLATINUM, **không có ngưỡng điểm nào được định nghĩa**) — không có repository, không có service/controller nào tham chiếu tới. `Booking.loyaltyPointsUsed` luôn hard-code `= 0` lúc tạo booking và chỉ được đọc lại để hiển thị, không có logic tích/đổi điểm thật sự. `BookingRequest.loyaltyPointsToUse` được FE có thể gửi lên nhưng BE không đọc trường này. Đừng dựa vào các entity này khi làm tính năng liên quan — cần thiết kế lại/triển khai mới từ đầu nếu BA yêu cầu.

### 5.15 Ẩn/che số tài khoản khi hiển thị

Chỉ triển khai ở FE (`utils/maskAccountNumber.ts`), dùng tại `WithdrawalApprovePage.tsx`, `PartnerDashboard.tsx`, `HotelApprovePage.tsx` — mang tính hiển thị (cosmetic), không phải lớp bảo vệ dữ liệu thật. Xem mục 11 về rủi ro dữ liệu ngân hàng/CCCD có thể bị nhúng trong `Hotel.description` và trả nguyên văn ở API public.

### 5.16 Nhật ký chăm sóc thú cưng (Pet Diary)

- `DiaryController` — không có `@PreAuthorize` cấp controller, toàn bộ authorization nằm ở service layer.
- **Ai được viết**: `Staff` đúng khách sạn của booking, hoặc `Partner` chủ khách sạn đó — người khác bị 403. **Chỉ `Partner`** mới được xoá diary (không phải Staff viết ra nó).
- Reaction (`DiaryReaction`, unique theo `(diary_id,user_id)`, chỉ có loại `HEART`) và comment (`DiaryComment`) realtime qua STOMP, broadcast tới **1 topic toàn cục duy nhất `/topic/diaries`** (không tách theo hotel/booking) — mọi client đang kết nối đều nhận mọi sự kiện diary của toàn nền tảng (bao gồm nội dung comment + tên người bình luận), FE tự lọc theo `diaryId` phía client. Đây là điểm cần thu hẹp phạm vi topic khi có nhiều khách sạn hoạt động cùng lúc (xem mục 11).
- Không dùng entity `Notification` (entity này tồn tại nhưng không có repository/service nào ghi vào — dead code) — "notification" thực chất chỉ là STOMP broadcast không lưu lịch sử/trạng thái đã đọc ngoài chính bảng `DiaryComment`/`DiaryReaction`.
- Trùng comment: xử lý phía FE bằng cách kiểm tra `comment.id` đã tồn tại trong state trước khi append.

### 5.17 Đánh giá (Review)

`ReviewServiceImpl.createReview()` kiểm tra đúng thứ tự: booking tồn tại → **`booking.status == COMPLETED`** (bắt buộc) → người review đúng là chủ booking → chưa review booking này trước đó (unique theo `bookingId`). Sau khi tạo, tính lại `averageRating`/`totalReviews` của hotel. **Không có lỗ hổng review giả** — luồng đã đúng.

### 5.18 Voucher

**Đã triển khai và đang hoạt động cho tiền phòng** (không còn là "chưa làm" như tài liệu cũ ghi) — `Admin` tạo/quản lý voucher (`VoucherController`, toàn bộ `hasRole('ADMIN')`), áp dụng lúc tạo booking: validate mã tồn tại + `ACTIVE` + chưa hết hạn + còn lượt dùng → tăng `currentUsageCount` → tính giảm giá theo `discountType` (`PERCENT` hoặc `FIXED_AMOUNT`, đều được chặn không vượt quá `roomTotal`) → trừ vào `roomTotal` trước khi tính VAT. **Giảm giá chỉ áp dụng cho tiền phòng, không áp dụng cho dịch vụ đính kèm** (đúng theo chủ trương ban đầu) — không cần thêm logic voucher cho `serviceTotal` trừ khi BA xác nhận mở rộng phạm vi.

## 6. Danh sách toàn bộ endpoint API

> Role trống = không có `@PreAuthorize`, chỉ chịu rule chung của `SecurityConfig` (`authenticated()` mặc định trừ khi liệt kê trong `permitAll()`).

### AuthController — `/api/auth` (permitAll toàn bộ)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/register` | Đăng ký, gửi OTP email |
| POST | `/register/verify` | Xác thực OTP đăng ký → đăng nhập |
| POST | `/register/resend-otp` | Gửi lại OTP đăng ký |
| POST | `/login` | Đăng nhập email/mật khẩu |
| POST | `/refresh` | Cấp access token mới từ refresh token |
| GET | `/me` | Lấy thông tin user hiện tại (cần JWT hợp lệ dù path permitAll) |
| POST | `/otp/send` | Gửi OTP đăng nhập theo SĐT |
| POST | `/otp/verify` | Xác thực OTP theo SĐT → đăng nhập |
| POST | `/change-password/otp` | Gửi OTP đổi mật khẩu |
| POST | `/change-password` | Đổi mật khẩu (đã đăng nhập) |
| POST | `/forgot-password/otp` | Gửi OTP quên mật khẩu |
| POST | `/forgot-password/reset` | Đặt lại mật khẩu qua OTP |
| POST | `/force-change-password` | Ép đổi mật khẩu tạm (staff mới tạo) |

### BookingController — `/api/bookings`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `` | OWNER | Tạo booking |
| GET | `/{id}` | *(thiếu check quyền)* | Xem chi tiết booking |
| GET | `/my` | OWNER | Booking của tôi |
| GET | `/hotel/{hotelId}` | PARTNER | Booking theo khách sạn *(không lọc theo partnerId thực)* |
| PATCH | `/{id}/cancel` | *(thiếu `@PreAuthorize`)* | Huỷ booking |
| PATCH | `/{id}/checkin` | STAFF, PARTNER | Check-in |
| PATCH | `/{id}/checkout` | STAFF, PARTNER | Check-out, tính hoa hồng |
| PATCH | `/{id}/confirm` | ADMIN, PARTNER | Xác nhận PENDING→CONFIRMED |

### HotelController — `/api/hotels`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `` | PARTNER | Tạo khách sạn (→ PENDING) |
| GET | `/{id}` | public (lọc ACTIVE ở service) | Chi tiết khách sạn |
| GET | `/my` | PARTNER (authenticated) | Khách sạn của tôi |
| GET | `` | ADMIN | Toàn bộ khách sạn |
| PATCH | `/{id}/status` | ADMIN | Set status tuỳ ý (không qua state-machine) |
| PUT | `/{id}` | PARTNER | Sửa khách sạn (tự resubmit nếu đang REJECTED) |
| PATCH | `/{id}/status/toggle` | PARTNER | ACTIVE ↔ CLOSED |
| PATCH | `/{id}/resubmit` | PARTNER | REJECTED → PENDING |
| GET | `/nearby` | public | Tìm khách sạn gần (ACTIVE only) |
| GET | `/search` | public | Tìm kiếm (ACTIVE only) |
| GET | `/resolve-coords` | public | Resolve toạ độ từ URL Google Maps |

### RouteSearchController — `/api/hotels/search-along-route`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/search-along-route` | authenticated (CORS `*`) | Tìm khách sạn dọc tuyến đường (PostGIS, ACTIVE only) |

### RoomTypeController — `/api/room-types`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/{hotelId}` | PARTNER | Tạo loại phòng |
| GET | `/hotel/{hotelId}` | public | Danh sách loại phòng — ⚠️ `activeOnly=false` bypass status ACTIVE (mục 11) |
| GET | `/{id}/availability` | public | Số phòng còn trống (ACTIVE only) |
| PUT | `/{id}` | PARTNER | Sửa loại phòng |
| DELETE | `/{id}` | PARTNER | Xoá loại phòng |
| PATCH | `/{id}/toggle` | PARTNER | Bật/tắt active |
| GET | `/highest-price` | public | Top phòng giá cao nhất (ACTIVE only) |

### ServiceController — `/api/services`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/{hotelId}` | PARTNER | Tạo dịch vụ |
| GET | `/hotel/{hotelId}` | public | Danh sách dịch vụ (ACTIVE only, không bypass được) |
| PUT | `/{id}` | PARTNER | Sửa dịch vụ |
| PATCH | `/{id}/toggle` | PARTNER | Bật/tắt dịch vụ |

### ReviewController — `/api/reviews`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `` | OWNER | Tạo review (chỉ booking COMPLETED) |
| GET | `/hotel/{hotelId}` | public | Review theo khách sạn (ACTIVE only) |

### PaymentController — `/api/payment` *(không có `@PreAuthorize` nào trong cả 3 endpoint)*
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/create-payment-link` | authenticated *(thiếu ownership check)* | Tạo link/QR PayOS |
| GET | `/verify/{bookingId}` | authenticated *(thiếu ownership check)* | Poll trạng thái thanh toán |
| POST | `/payos-webhook` | authenticated ⚠️ *(nên permitAll, xem mục 11)* | Webhook PayOS |

### WithdrawalController — `/api`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/partner/wallet` | PARTNER | Xem ví |
| POST | `/partner/withdraw` | PARTNER | Yêu cầu rút tiền |
| GET | `/partner/withdrawals` | PARTNER | Lịch sử rút tiền của tôi |
| GET | `/admin/withdrawals` | ADMIN | Toàn bộ yêu cầu rút tiền |
| POST | `/admin/withdrawals/{id}/approve` | ADMIN | Duyệt (cần receiptImageUrl) |
| POST | `/admin/withdrawals/{id}/reject` | ADMIN | Từ chối (hoàn tiền) |

### AdminController — `/api/admin` (class-level `hasRole('ADMIN')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/users` | Danh sách user |
| PATCH | `/users/{id}/status` | Khoá/mở user |
| GET | `/hotels/pending` | Khách sạn chờ duyệt |
| GET | `/hotels` | Khách sạn theo status |
| PATCH | `/hotels/{id}/approve` | Duyệt khách sạn |
| PATCH | `/hotels/{id}/reject` | Từ chối khách sạn |
| GET | `/stats` | Thống kê tổng quan |
| GET | `/stats/bookings` | Thống kê booking |

### VoucherController — `/api/vouchers` (toàn bộ `hasRole('ADMIN')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `` | Danh sách voucher |
| POST | `` | Tạo voucher |
| PATCH | `/{id}/status` | Đổi trạng thái voucher |

### FeedbackController — `/api/admin/feedbacks` (class-level `hasRole('ADMIN')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `` | Toàn bộ feedback (từ chatbot) |
| DELETE | `/{id}` | Xoá feedback |

### PetController — `/api/pets` (toàn bộ `hasRole('OWNER')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/my` | Pet của tôi |
| POST | `` | Tạo pet |
| PUT | `/{id}` | Sửa pet (check ownership) |
| DELETE | `/{id}` | Xoá pet (check ownership) |

### DiaryController — `/api/diaries` *(không có `@PreAuthorize`, check ở service)*
| Method | Path | Mô tả |
|---|---|---|
| GET | `/pet/{petId}` | Nhật ký theo pet |
| GET | `/my` | Nhật ký tất cả pet của tôi (owner) |
| POST | `` | Tạo nhật ký (staff/partner đúng khách sạn) |
| POST | `/{diaryId}/like` | Toggle reaction HEART |
| POST | `/{diaryId}/comment` | Thêm bình luận |
| PUT | `/{diaryId}` | Sửa nhật ký |
| DELETE | `/{diaryId}` | Xoá nhật ký (chỉ PARTNER) |

### ConversationController — `/api/conversations`
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/booking/{bookingId}` | OWNER | Get-or-create conversation theo booking |
| GET | `/me` | OWNER | Danh sách conversation của tôi |
| GET | `/hotel[?hotelId]` | STAFF, PARTNER | Danh sách conversation theo khách sạn |
| GET | `/{id}/messages` | authenticated | Lịch sử tin nhắn |
| DELETE | `/{id}` | authenticated | Xoá mềm conversation |

### ChatController — `/api/chat` (permitAll)
| Method | Path | Mô tả |
|---|---|---|
| POST | `` | Chat với AI (Groq), rate-limit theo IP |

### CrmController — `/api/partner/crm` (toàn bộ `hasRole('PARTNER')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/pets` | Danh sách pet của khách (đã mask email/phone) |
| GET | `/pets/{petId}/bookings` | Lịch sử booking của 1 pet, scoped theo partnerId từ JWT |

### EquipmentController — `/api/partner/equipments` (toàn bộ `hasRole('PARTNER')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/hotel/{hotelId}` | Danh sách thiết bị |
| POST | `/hotel/{hotelId}` | Thêm thiết bị |
| PUT | `/{id}` | Sửa thiết bị |
| DELETE | `/{id}` | Xoá thiết bị |

### StaffManagementController — `/api/staff` (toàn bộ `hasRole('PARTNER')`)
| Method | Path | Mô tả |
|---|---|---|
| POST | `` | Tạo tài khoản STAFF mới (mật khẩu tạm, email chào mừng) |
| GET | `` | Danh sách staff theo hotel |
| PATCH | `/{staffId}/toggle-active` | Khoá/mở tài khoản staff |

### StaffController — `/api/partner/staff` (toàn bộ `hasRole('PARTNER')`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/hotel/{hotelId}` | Danh sách staff |
| POST | `/hotel/{hotelId}` | Gán role STAFF cho tài khoản đã tồn tại |
| PUT | `/{staffId}` | Sửa thông tin staff |
| DELETE | `/{staffId}` | Xoá staff (soft delete) |

### KycController — `/api/merchant/kyc` (chỉ `authenticated()`, không giới hạn role)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/verify` | OCR CCCD + face-match qua VNPT eKYC |

### UploadController — `/api/upload` (chỉ `authenticated()`, không giới hạn role)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/image` | Upload ảnh lên Cloudinary |

### StompChatController — WebSocket `@MessageMapping` (không phải REST)
| Destination | Mô tả |
|---|---|
| `/app/chat/{conversationId}` (client gửi) | Gửi tin nhắn |
| `/topic/conversation/{conversationId}` (server broadcast) | Nhận tin nhắn realtime |
| `/queue/errors` (per-user) | Lỗi cá nhân |

## 7. Entity / bảng DB chính và quan hệ

PostgreSQL 16 + PostGIS. Thứ tự tạo bảng theo FK:

```
users → pets, hotels → room_types → rooms, services → vouchers
      → bookings → booking_services (BookedService)
      → payments → staff → tasks, diaries → diary_comments, diary_reactions
      → reviews, conversations → conversation_messages
      → feedbacks, partner_wallets → withdrawal_requests
      → equipments, audits, point_logs (chưa dùng), notifications (chưa dùng)
```

**28 entity chính**: `User`, `Pet`, `Hotel`, `RoomType`, `Room`, `Service`, `Voucher`, `Booking`, `BookedService`, `BookingDetail` *(dead code — không được service nào dùng, song song lỗi thời với `BookedService`)*, `Payment`, `Staff`, `Task`, `Diary`, `DiaryComment`, `DiaryReaction`, `Review`, `Conversation`, `ConversationMessage`, `Message` *(dead code — không có repository/service dùng đến)*, `Feedback`, `PartnerWallet`, `WithdrawalRequest`, `Equipment`, `Audit`, `Rule`, `PointLog` *(dead code)*, `Notification` *(dead code)*.

Ghi chú quan trọng:
- Mọi quan hệ JPA `@ManyToOne` dùng `FetchType.LAZY`.
- Mọi enum lưu `@Enumerated(EnumType.STRING)`.
- `Hotel.status` (enum `HotelStatus`, default `PENDING`), `Hotel.description` là chuỗi tự do — một số hotel cũ có thể còn nhúng JSON `cccd`/`banking`/`legal` trong đó (xem mục 11).
- `Booking` lưu snapshot tài chính tại thời điểm đặt: `commissionRate`, `vatRate`, `priceSnapshot` (qua `BookedService`), `voucherDiscountAmount` — không bao giờ đọc lại config sống sau khi tạo.
- `PartnerWallet` 1-1 với partner (`User`), gồm `balance` + `pendingBalance`.
- `Conversation.bookingId` là `unique` — đúng 1 conversation cho mỗi booking.

## 8. Quy tắc nghiệp vụ quan trọng

- **Tiền luôn dùng `BigDecimal`** — không dùng `double`/`float` cho số tiền (chỉ dùng `double` cho *tỷ lệ* `commissionRate`/`vatRate`, không phải số tiền tuyệt đối — xem mục 11 về việc nên đổi sang `BigDecimal` cho nhất quán).
- **Snapshot tài chính tại thời điểm đặt** — `commissionRate`, `vatRate`, `priceSnapshot`, `voucherDiscountAmount` được chốt lúc tạo booking, không đọc lại từ config khi đã tạo.
- **Hoa hồng = 8% trên `totalAmount`** (không phải trên `roomTotal`). Đối tác nhận 92%. Rate snapshot vào `booking.commissionRate` lúc tạo, đọc lại từ đó ở **3 nơi**: `checkOut()`, `verifyPaymentStatus()`, `handleWebhook()` — cả 3 đã xác nhận đọc đúng snapshot, không hardcode. Công thức: `commissionFee = totalAmount × commissionRate` (setScale 0, HALF_UP); `partnerShare = totalAmount − commissionFee`. Bất biến: `commissionFee + partnerShare == totalAmount`.
- **Công thức hoá đơn** (áp dụng từ 2026-06-17, không còn phí tiện ích):
  ```java
  taxableBase = roomTotal - voucherDiscount + serviceTotal
  vatAmount   = taxableBase × vatRate   (setScale 0, HALF_UP)
  totalAmount = taxableBase + vatAmount
  ```
  `vatRate` đọc từ `app.vat-rate` (`application.properties`, hiện `0.08`) và snapshot vào `booking.vatRate` lúc tạo. Đổi VAT (ví dụ về 10% sau 31/12/2026) chỉ cần sửa `application.properties` — booking cũ giữ nguyên rate đã snapshot.
- **Voucher đã hoạt động cho tiền phòng** (không phải "chưa làm" như tài liệu cũ) — chỉ giảm trên `roomTotal`, không áp dụng cho `serviceTotal` trừ khi BA xác nhận mở rộng.
- **Giá dịch vụ luôn lấy từ DB** — `createBooking()` validate `serviceId` tồn tại + đúng hotel rồi snapshot `svc.getPrice()`, không tin giá client gửi.
- **Chống overbooking**: `available = totalRooms − số booking chồng lấn` (đếm qua `countOverlappingBookings`, loại trừ `CANCELLED`) — có chặn thật (409), nhưng **thiếu khoá hàng** nên vẫn có race condition khi tải cao (mục 11).
- **Phòng vật lý (`Room`) gán lúc check-in**, không gán lúc đặt online — online booking chỉ chọn `RoomType`.
- **PayOS `PaymentLink.getStatus()` trả về enum `PaymentLinkStatus`** — luôn so sánh bằng `PaymentLinkStatus.PAID == status`, không dùng `"PAID".equals(status)` (String vs enum luôn `false`).
- **Webhook PayOS phải luôn trả HTTP 200** — mọi exception (chữ ký sai, orderCode lạ...) phải bắt, log, và ack `200 + success:false`. Trả 4xx khiến PayOS retry vô hạn. *(Lưu ý: bản thân route webhook có thể đang bị Spring Security chặn 401 trước khi vào tới logic này — xem mục 11, cần verify riêng.)*
- **Giao dịch là 1-nhiều với booking** — retry tạo `Payment` row mới; bản ghi `status=SUCCESS` gần nhất mới là hợp lệ.

## 9. Cấu hình môi trường

- BE đọc `application.properties` + `application-local.properties` (gitignored, chứa secret thật: SendGrid, Gmail app password, Cloudinary, VNPT eKYC, PayOS, Gemini/Groq API key, Google OAuth client secret). File này tồn tại trên máy dev, **không** được commit (`**/application-local.properties` trong `.gitignore`).
- FE đọc `VITE_API_URL` (mặc định `http://localhost:8080`), đặt trong `.env` khi cần override, override lại lúc deploy production.
- Tính năng AI qua Spring AI/pgvector/OpenAI **đã tắt hẳn** bằng `spring.autoconfigure.exclude` — chatbot thật chạy qua Groq (`groq.api.key`), không phải OpenAI (không có `OPENAI_API_KEY` trong config).
- `jwt.secret` có fallback mặc định hard-code ngay trong `application.properties` (đã commit git) — nếu biến môi trường `JWT_SECRET` không được set khi deploy, app sẽ dùng secret công khai này, cho phép giả mạo JWT bất kỳ role nào (xem mục 11).

## 10. Lịch sử kỹ thuật / Bug đã fix trước đây

### Test Coverage (2026-06-17)

```bash
./mvnw test -Dnet.bytebuddy.experimental=true \
  -Dtest="PaymentWebhookTest,BookingCheckoutTest,WithdrawalTest,BookingCreateTest"
```

| File | Luồng được kiểm tra |
|---|---|
| `BE/src/test/java/com/petcare_hub/payment/PaymentWebhookTest.java` | Webhook PayOS: chữ ký hợp lệ/sai, idempotency, commissionRate snapshot, orderCode không tồn tại, code ≠ 00, HTTP response code; `verifyPaymentStatus` commission snapshot |
| `BE/src/test/java/com/petcare_hub/payment/BookingCheckoutTest.java` | Check-in/checkout, chuyển pending→balance, double checkout→exception, commissionFee snapshot, @Transactional |
| `BE/src/test/java/com/petcare_hub/payment/WithdrawalTest.java` | Rút tiền: validate, freeze balance, approve/reject + hoàn tiền, idempotency, @PreAuthorize/@Transactional |
| `BE/src/test/java/com/petcare_hub/payment/BookingCreateTest.java` | `createBooking` có dịch vụ, totalAmount, commission 8%, priceSnapshot immutable |

Kết quả: **34/34 PASS** (2026-06-17).

### Bug History (đã fix — 2026-06-17)

| Bug ID | Mô tả gốc | Severity | File fix |
|---|---|---|---|
| BUG-1a/b/c | `handleWebhook`/`checkOut`/`verifyPaymentStatus` hardcode `× 0.92`, bỏ qua `booking.commissionRate` snapshot | 🔴 tiền sai | `PaymentController.java`, `BookingServiceImpl.java` |
| BUG-2/2b | Webhook trả HTTP 400 khi signature/orderCode sai → PayOS retry vô hạn | 🔴 retry vô hạn | `PaymentController.java` |
| BUG-3 | `commissionFee` lưu DB = `roomTotal × 0.15` thay vì `totalAmount × 0.08` | 🔴 báo cáo sai | `BookingServiceImpl.java` |
| BUG-4 | `partnerShare` thiếu `.setScale(0, HALF_UP)` | 🟡 code quality | `PaymentController.java`, `BookingServiceImpl.java` |
| BUG-5 | `verifyPaymentStatus` so sánh `"PAID".equals(getStatus())` (String vs enum, luôn false) | 🔴 tính năng không chạy | `PaymentController.java` |

### Bảo mật & Quyền hạn (đã fix — 2026-07-02)

| Bug ID | Mô tả gốc | Severity | File fix |
|---|---|---|---|
| BUG-SEC-1 | Đăng ký tự chọn role bất kỳ, kể cả ADMIN qua API public `/register` | 🔴 CRITICAL | `AuthServiceImpl.java` |
| BUG-SEC-2 | Lộ thông tin loại phòng của khách sạn PENDING/REJECTED khi truyền `activeOnly=false` | 🔴 CRITICAL | `RoomTypeServiceImpl.java`, `RoomTypeController.java` |
| BUG-SEC-3 | Webhook PayOS (`/payos-webhook`) thiếu permitAll() dẫn đến bị Spring Security chặn 401 | 🔴 CRITICAL | `SecurityConfig.java` |
| BUG-SEC-4 | Xác nhận booking (`confirmBooking`) không check payment SUCCESS cho online booking | 🔴 CRITICAL | `BookingServiceImpl.java` |
| BUG-SEC-5 | Admin/user khác có thể khóa hoặc thay đổi trạng thái của tài khoản ADMIN chính | 🟡 HIGH | `AdminController.java` |

Chi tiết công thức và code fix xem lịch sử git.

## 11. Các vấn đề đã biết, chưa fix (2026-07-02)

> Toàn bộ mục này chỉ mang tính **ghi nhận để triage** — chưa được sửa. Xem báo cáo bug đầy đủ kèm mức độ nghiêm trọng trong output chat của phiên rà soát ngày 2026-07-02.

### Nghiêm trọng (CRITICAL)
*(Không còn lỗi CRITICAL nào chưa được giải quyết)*

### Cao (HIGH)
5. **Phá vỡ cách ly dữ liệu theo booking/hotel** — `BookingController.getBooking`/`cancelBooking` không kiểm tra ownership; `checkIn`/`checkOut`/`confirmBooking` không kiểm tra booking thuộc đúng khách sạn của staff/partner gọi; `getHotelBookings(hotelId, partnerId,...)` nhận `partnerId` nhưng **không dùng** để lọc — bất kỳ PARTNER nào cũng xem được booking của khách sạn khác nếu biết `hotelId`.
6. **`PaymentController` không có `@PreAuthorize`/ownership check nào** trên `createPaymentLink`/`verifyPaymentStatus` — user bất kỳ tạo được link thanh toán hoặc poll trạng thái cho `bookingId` của người khác (IDOR).
7. **Race condition không khoá hàng** ở 2 nơi: (a) chống overbooking (`createBooking`, đếm-rồi-ghi không `SELECT FOR UPDATE`); (b) cộng ví đối tác (`handleWebhook` và `verifyPaymentStatus` cùng đọc `payment.status==PENDING` rồi ghi, có thể cộng ví 2 lần nếu chạy gần như đồng thời — kịch bản thực tế vì FE poll ngay khi PayOS redirect về, đúng lúc webhook cũng có thể đang tới).

### Trung bình (MEDIUM)
8. **OAuth2 Google login bỏ qua `isActive`/`isVerified`** — user bị khoá (`isActive=false`) vẫn đăng nhập được nếu email đã liên kết Google.
9. **`mustChangePassword` không được enforce ở BE** cho bất kỳ endpoint nào ngoài chính endpoint đổi mật khẩu — staff mới tạo có thể dùng JWT (sau 1 lần login) gọi thẳng API mà chưa đổi mật khẩu tạm; F5 lại trang cũng không bị FE bắt đổi lại.
10. **Dữ liệu CCCD/số tài khoản ngân hàng có thể bị nhúng trong `Hotel.description`** (JSON tự do, chỉ FE mới đọc nhưng BE trả nguyên văn `description` ở API public `GET /api/hotels/{id}` cho hotel ACTIVE) — cần audit dữ liệu hotel cũ, không nên tiếp tục lưu bank/CCCD trong trường mô tả tự do.
11. **`WebSocketConfig` chỉ cho phép origin localhost** — cần thêm origin production trước khi deploy, nếu không chat realtime sẽ chết trên môi trường thật.
12. **`CASH` checkout có thể khiến `PartnerWallet.balance` âm** — trừ `commissionFee` không kiểm tra đủ số dư.
13. **Tài liệu voucher cũ sai** — CLAUDE.md bản trước ghi "Voucher not yet implemented", thực tế đã hoạt động cho tiền phòng (đã sửa ở mục 5.18/8 của bản này).
14. **`/topic/diaries` là 1 topic STOMP toàn cục** — mọi client nhận mọi sự kiện diary/comment của mọi khách sạn, không tách theo hotel/booking.

### Thấp (LOW) / Ghi chú
15. `jwt.secret` có fallback hard-code trong `application.properties` đã commit — rủi ro nếu quên set `JWT_SECRET` khi deploy.
16. Refresh token không xoay vòng (reuse token cũ mỗi lần refresh), không có cơ chế thu hồi/danh sách đen.
17. OTP/refresh-store dùng `ConcurrentHashMap` trong RAM — mất khi restart hoặc chạy nhiều instance (không dùng Redis).
18. Token (access + refresh) truyền qua query string khi redirect OAuth2 callback — có thể lộ qua lịch sử trình duyệt/Referer/log.
19. `KycController` chỉ yêu cầu `authenticated()`, không giới hạn role — bất kỳ role nào cũng gọi được API tốn phí VNPT eKYC.
20. `RouteSearchController` và `WithdrawalController` khai `@CrossOrigin(origins="*")`, ghi đè CORS policy chặt hơn của toàn app.
21. `BookingDetail` (entity) và `Message` (entity), `PointLog`/`PointAction`/`MembershipTier`, `Notification` (entity) — dead code, không có repository/service nào dùng tới; cân nhắc dọn dẹp hoặc hoàn thiện tuỳ hướng sản phẩm.
22. `StaffController` (`/api/partner/staff`) và `StaffManagementController` (`/api/staff`) là 2 luồng tạo/gán staff song song, dễ nhầm khi bảo trì (xem mục 5.13).
23. `WithdrawalController.requestWithdrawal()` parse `amount` từ `Map<String,Object>` thô, không qua DTO validate — chuỗi số dị dạng có thể ném `NumberFormatException` (500 thay vì 400 sạch).
24. `roomType.getTotalRooms()` là `Integer` nullable — nếu `null`, so sánh unboxing tại check overbooking sẽ NullPointerException (500) thay vì lỗi nghiệp vụ sạch.
25. `AuthController.getMe()`/`sendChangePasswordOtp()`/`changePassword()`/`forceChangePassword()` cast principal sang `UUID` không qua kiểm tra — gọi không kèm JWT hợp lệ (dù path `permitAll()`) sẽ ném `ClassCastException`, lộ ra dưới dạng HTTP 500 kèm tên exception trong message thay vì 401 sạch.
26. Không tìm thấy conflict marker Git (`<<<<<<<`/`=======`/`>>>>>>>`) nào còn sót trong repo.

**Build check (2026-07-02)**: `mvn clean compile` → BUILD SUCCESS (191 source file, chỉ có warning deprecation ở `Room.java`, không liên quan business logic). `npx tsc --noEmit` (FE) → không có lỗi type.
