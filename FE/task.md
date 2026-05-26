# 🐾 PetCare Hub
## [cite_start]Frontend Pages Guide — API Mapping cho từng trang [cite: 2]
> [cite_start]**Lưu ý:** Tài liệu này liệt kê từng trang FE, route, component cần làm và API cần gọi[cite: 3]. [cite_start]Mọi câu hỏi vui lòng liên hệ **Huy (Lead)**[cite: 128]. 
> [cite_start]*Cập nhật lần cuối: 05/2026* [cite: 128]

---

## [cite_start]1. Auth Pages — Xác thực người dùng [cite: 4]

### [cite_start]🔐 LoginPage — `/login` [cite: 5]
* [cite_start]**Mô tả:** Trang đăng nhập bằng email/password hoặc Google[cite: 6]. [cite_start]Sau khi thành công $\rightarrow$ lưu token $\rightarrow$ redirect về `/hotels`[cite: 6].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| POST | /api/auth/login | Đăng nhập email + password | ALL |
| GET | /oauth2/authorization/google | Đăng nhập bằng Google OAuth2 | ALL |
| POST | /api/auth/refresh | Refresh access token khi hết hạn | ALL |

[cite_start][cite: 7]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Sau login lưu `accessToken` + `refreshToken` vào Zustand store (persist localStorage)[cite: 8].
    * [cite_start]**Điều hướng (Redirect):** `OWNER` $\rightarrow$ `/hotels`, `PARTNER` $\rightarrow$ `/partner/dashboard`, `STAFF` $\rightarrow$ `/staff/dashboard`, `ADMIN` $\rightarrow$ `/admin/dashboard`[cite: 9].

### [cite_start]📝 RegisterPage — `/register` [cite: 10]
* [cite_start]**Mô tả:** Trang đăng ký tài khoản mới[cite: 11]. [cite_start]Chỉ cho phép `OWNER` và `PARTNER` đăng ký trực tiếp[cite: 11].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| POST | /api/auth/register | Đăng ký tài khoản mới (OWNER hoặc PARTNER) | ALL |
| POST | /api/auth/otp/send | Gửi OTP xác thực về email sau khi đăng ký | ALL |
| POST | /api/auth/otp/verify | Xác thực OTP $\rightarrow$ nhận JWT token | ALL |

[cite_start][cite: 12]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Sau khi đăng ký $\rightarrow$ hiện màn hình nhập OTP 6 ô[cite: 13]. [cite_start]Countdown đếm ngược **5 phút**[cite: 13].
    * [cite_start]Có nút "Gửi lại mã"[cite: 14].

### [cite_start]📱 OtpVerifyPage — `/otp-verify` [cite: 15]
* [cite_start]**Mô tả:** Màn hình nhập mã OTP 6 số sau đăng ký hoặc đăng nhập bằng SĐT[cite: 16].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| POST | /api/auth/otp/send | Gửi lại OTP (nếu hết hạn) | ALL |
| POST | /api/auth/otp/verify | Xác thực OTP $\rightarrow$ nhận JWT | ALL |

[cite_start][cite: 17]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Thiết kế gồm **6 ô input riêng biệt**[cite: 18]. [cite_start]Tự động focus ô tiếp theo khi vừa nhập xong[cite: 18].
    * [cite_start]Countdown timer **5 phút**[cite: 18]. [cite_start]Hiển thị nút "Gửi lại" sau khi hết thời gian[cite: 19].

---

## [cite_start]2. Owner Pages — Chủ nuôi thú cưng [cite: 20]

### [cite_start]🏠 HomePage — `/hotels` [cite: 21]
* [cite_start]**Mô tả:** Trang chủ kiêm trang tìm kiếm khách sạn[cite: 22]. [cite_start]Lấy vị trí GPS $\rightarrow$ gợi ý khách sạn gần nhất[cite: 22]. [cite_start]Có AI chatbox ở góc phải màn hình[cite: 23].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/hotels/nearby?lat=&lng=&radius=5 | Tìm KS gần vị trí GPS hiện tại | ALL |
| GET | /api/hotels?status=ACTIVE | Danh sách tất cả KS đang hoạt động | ALL |
| GET | /api/hotels/{id} | Xem chi tiết 1 khách sạn | ALL |
| POST | /api/ai/chat | Gửi tin nhắn cho AI chatbox (kèm GPS) | OWNER |

[cite_start][cite: 24]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Lấy GPS tự động bằng `navigator.geolocation.getCurrentPosition()`[cite: 25].
    * [cite_start]**Bộ lọc (Filter):** Theo giá, rating, loại thú cưng, khoảng cách[cite: 25].
    * [cite_start]**Card khách sạn hiển thị:** Ảnh, tên, rating, giá/đêm, khoảng cách[cite: 26].

### [cite_start]🏨 HotelDetailPage — `/hotels/:id` [cite: 27]
* [cite_start]**Mô tả:** Trang chi tiết khách sạn: bao gồm gallery ảnh, danh sách loại phòng, các dịch vụ đi kèm và đánh giá từ người dùng[cite: 28].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/hotels/{id} | Thông tin chi tiết khách sạn | ALL |
| GET | /api/room-types/hotel/{hotelId} | Danh sách loại phòng của KS | ALL |
| GET | /api/room-types/{id}/availability?checkIn=&checkOut= | Kiểm tra phòng còn trống | ALL |
| GET | /api/services/hotel/{hotelId} | Danh sách dịch vụ của KS | ALL |
| GET | /api/reviews/hotel/{hotelId} | Đánh giá của KS | ALL |

[cite_start][cite: 29]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Sử dụng Datepicker để chọn ngày $\rightarrow$ tự động gọi API check `availability`[cite: 30]. [cite_start]Hiển thị badge trực quan: **"Còn N phòng"**[cite: 30].
    * [cite_start]Nút "Đặt ngay" sẽ chuyển hướng người dùng sang trang `/booking/:roomTypeId`[cite: 31].

### [cite_start]📅 BookingPage — `/booking/:roomTypeId` [cite: 32]
* [cite_start]**Mô tả:** Quy trình đặt phòng gồm **3 bước (3-step booking flow)**: Chọn phòng + ngày $\rightarrow$ Chọn thú cưng + dịch vụ đi kèm $\rightarrow$ Xác nhận thông tin + tiến hành thanh toán[cite: 33].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/room-types/{id}/availability?checkIn=&checkOut= | Kiểm tra phòng trống theo ngày | OWNER |
| GET | /api/pets/my | Danh sách thú cưng của owner | OWNER |
| GET | /api/services/hotel/{hotelId} | Dịch vụ đi kèm của KS | OWNER |
| POST | /api/bookings/apply-voucher | Preview giảm giá khi nhập voucher | OWNER |
| POST | /api/bookings | Tạo booking mới $\rightarrow$ nhận invoiceNumber | OWNER |
| POST | /api/payments/vnpay/create | Tạo QR thanh toán VNPay | OWNER |
| POST | /api/payments/momo/create | Tạo QR thanh toán MoMo | OWNER |

[cite_start][cite: 34]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Step 1:** Chọn ngày $\rightarrow$ tính toán và hiển thị tổng giá tiền realtime[cite: 35].
    * [cite_start]**Step 2:** Cho phép Multi-select (chọn nhiều) thú cưng và dịch vụ[cite: 35].
    * [cite_start]**Step 3:** Bảng tóm tắt đơn hàng + ô nhập mã voucher + chọn cổng thanh toán $\rightarrow$ hiển thị mã QR kèm countdown **15 phút**[cite: 36].

### [cite_start]💳 PaymentPage — `/payment/:bookingId` [cite: 37]
* [cite_start]**Mô tả:** Màn hình hiển thị QR thanh toán, countdown **15 phút** và hệ thống tự động polling trạng thái giao dịch[cite: 38].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| POST | /api/payments/vnpay/create | Tạo QR VNPay | OWNER |
| POST | /api/payments/momo/create | Tạo QR MoMo | OWNER |
| GET | /api/payments/status/{bookingId} | Polling trạng thái thanh toán mỗi 3 giây | OWNER |

[cite_start][cite: 39]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Sau khi thanh toán thành công $\rightarrow$ hiển thị animation check (✓), thông báo `invoice number` và redirect về trang `/my-bookings` kèm theo toast thông báo *"Đặt phòng thành công"*[cite: 40, 41].

### [cite_start]📋 MyBookingsPage — `/my-bookings` [cite: 42]
* [cite_start]**Mô tả:** Lịch sử đặt phòng của owner[cite: 43]. [cite_start]Có các bộ lọc theo trạng thái đơn hàng[cite: 43].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/bookings/my | Danh sách booking của owner (có phân trang) | OWNER |
| GET | /api/bookings/{id} | Chi tiết 1 booking | OWNER |
| PATCH | /api/bookings/{id}/cancel | Hủy booking | OWNER |

[cite_start][cite: 44]

* **💡 Ghi chú giao diện & Logic:**
    * **Hệ thống Tab filter:** Tất cả | Chờ TT | Đã xác nhận | Đang ở | Hoàn tất | [cite_start]Đã hủy[cite: 45, 46].
    * [cite_start]**Card booking bao gồm:** Tên khách sạn, ngày đặt, badge trạng thái màu, tổng tiền và các nút hành động tương ứng[cite: 46].

### [cite_start]🐾 PetProfilePage — `/pets` [cite: 47]
* [cite_start]**Mô tả:** Giao diện quản lý hồ sơ thú cưng cá nhân của owner (Thêm, sửa, xem, xóa)[cite: 48].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/pets/my | Danh sách thú cưng của owner | OWNER |
| POST | /api/pets | Thêm thú cưng mới | OWNER |
| PUT | /api/pets/{id} | Cập nhật hồ sơ thú cưng | OWNER |
| DELETE | /api/pets/{id} | Xóa thú cưng | OWNER |

[cite_start][cite: 49]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Card thú cưng:** Hiển thị avatar, tên, giống, tuổi, cân nặng, tag tính cách[cite: 50].
    * [cite_start]Form thêm mới có tích hợp upload ảnh trực tiếp lên **Cloudinary** và badge hiển thị trạng thái tiêm ngừa (vaccination status)[cite: 51].

### [cite_start]📔 PetDiaryPage — `/diary/:bookingId` [cite: 52]
* [cite_start]**Mô tả:** Trang dành cho Owner theo dõi nhật ký chăm sóc thú cưng của mình theo từng ngày lưu trú tại khách sạn[cite: 53].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/diary/booking/{bookingId} | Nhật ký theo booking | OWNER |
| GET | /api/bookings/{id} | Thông tin booking liên quan | OWNER |

[cite_start][cite: 54]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Giao diện thiết kế theo dạng **Timeline theo ngày**[cite: 55].
    * [cite_start]Mỗi entry nhật ký bao gồm: tiêu đề, nội dung chi tiết, hình ảnh/video, badge tâm trạng (mood: 😊, 😐, 😟, 😷) và badge ăn uống (eating: Tốt / Bình thường / Kém)[cite: 55].
    * [cite_start]Áp dụng tính năng cuộn vô hạn (**Scroll infinite load**)[cite: 56].

### [cite_start]👤 ProfilePage — `/profile` [cite: 57]
* [cite_start]**Mô tả:** Trang quản lý thông tin tài khoản cá nhân, đổi mật khẩu và cài đặt cấu hình thông báo[cite: 58].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/auth/me | Thông tin user hiện tại | ALL |
| PUT | /api/users/profile | Cập nhật thông tin cá nhân | ALL |
| GET | /api/loyalty/my | Xem điểm loyalty + hạng thành viên | OWNER |
| GET | /api/loyalty/history | Lịch sử tích/tiêu điểm | OWNER |

[cite_start][cite: 59]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Hỗ trợ upload Avatar lên **Cloudinary**[cite: 60].
    * [cite_start]Hiển thị badge thứ hạng thành viên: 🥈Silver / 🥇Gold / 💎Platinum kèm theo Progress bar hiển thị tiến trình để lên hạng tiếp theo[cite: 60].
    * [cite_start]Có các nút toggle để tùy chỉnh các kênh nhận thông báo (notification channels)[cite: 60].

---

## [cite_start]3. Partner Pages — Chủ khách sạn [cite: 61]

### [cite_start]📊 PartnerDashboard — `/partner/dashboard` [cite: 62]
* [cite_start]**Mô tả:** Trang thống kê tổng quan về doanh thu, các lượt booking trong ngày hôm nay và danh sách các khách sạn đang hoạt động[cite: 63].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/hotels/my | Danh sách KS của partner | PARTNER |
| GET | /api/bookings/hotel/{hotelId} | Booking mới nhất của KS | PARTNER |
| GET | /api/partner/revenue?hotelId= | Doanh thu theo tháng | PARTNER |

[cite_start][cite: 64]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Stats cards (Thẻ số liệu):** Tổng booking hôm nay, doanh thu tháng này, số lượng phòng đang có thú cưng ở, điểm rating trung bình[cite: 65].
    * [cite_start]Tích hợp biểu đồ (**Chart**) doanh thu trong 30 ngày gần nhất[cite: 66].

### [cite_start]🏨 HotelManagePage — `/partner/hotels` [cite: 67]
* [cite_start]**Mô tả:** Trang quản lý danh sách khách sạn (CRUD): hỗ trợ tạo mới, cập nhật thông tin và xem trạng thái phê duyệt từ hệ thống[cite: 68].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/hotels/my | Danh sách KS của partner | PARTNER |
| POST | /api/hotels | Tạo KS mới (status=PENDING) | PARTNER |
| PUT | /api/hotels/{id} | Cập nhật thông tin KS | PARTNER |
| GET | /api/hotels/{id} | Xem chi tiết KS | PARTNER |

[cite_start][cite: 69]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Hiển thị **Badge status** rõ ràng: 🟡Chờ duyệt / 🟢Hoạt động / 🔴Đóng cửa[cite: 70].
    * [cite_start]Cho phép upload nhiều ảnh cùng lúc, cài đặt cấu hình thời gian check-in/check-out cụ thể[cite: 70].
    * [cite_start]Tích hợp công cụ **Map picker** để lựa chọn tọa độ vị trí GPS[cite: 71].

### [cite_start]🚪 RoomManagePage — `/partner/hotels/:hotelId/rooms` [cite: 72]
* [cite_start]**Mô tả:** Giao diện quản lý cấu hình các loại phòng và số lượng phòng vật lý thực tế của từng khách sạn[cite: 73].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/room-types/hotel/{hotelId} | Danh sách loại phòng | PARTNER |
| POST | /api/room-types/{hotelId} | Thêm loại phòng mới | PARTNER |
| PUT | /api/room-types/{id} | Cập nhật loại phòng | PARTNER |
| GET | /api/room-types/{id}/availability?checkIn=&checkOut= | Xem phòng trống | PARTNER |

[cite_start][cite: 74]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Mỗi loại phòng cần hiển thị rõ: tổng số phòng, số phòng hiện đang có thú cưng ở, và mức giá tiền/đêm[cite: 75].
    * [cite_start]Có nút toggle cấu hình nhanh các loại thú cưng được phép ở (`allowed_pet_types`), hỗ trợ upload ảnh phòng, và hiển thị badge phòng có webcam hay không (`has_webcam`)[cite: 75, 76].

### [cite_start]💆 ServiceManagePage — `/partner/hotels/:hotelId/services` [cite: 77]
* [cite_start]**Mô tả:** Trang quản lý danh mục dịch vụ đi kèm tại khách sạn như: Spa, Làm đẹp (Grooming), Vận chuyển (Transport)... [cite: 78]
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/services/hotel/{hotelId} | Danh sách dịch vụ | PARTNER |
| POST | /api/services/{hotelId} | Thêm dịch vụ mới | PARTNER |
| PUT | /api/services/{id} | Cập nhật dịch vụ | PARTNER |
| PATCH | /api/services/{id}/toggle | Bật/tắt dịch vụ | PARTNER |

[cite_start][cite: 79]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Card dịch vụ:** Hiện tên, giá cả, thời gian thực hiện và loại dịch vụ (phân biệt bằng badge màu), cùng nút gạt Bật/tắt[cite: 80].
    * Hệ thống icon tương ứng theo kiểu dữ liệu `ServiceType`: 💆SPA | 🛁GROOMING | 🚗TRANSPORT | 🍖FOOD | [cite_start]💊MEDICATION[cite: 81].

### [cite_start]📋 BookingManagePage — `/partner/bookings` [cite: 82]
* **Mô tả:** Xem và quản lý toàn bộ danh sách booking của tất cả các khách sạn. [cite_start]Cho phép xác nhận booking sau khi khách đã hoàn tất thanh toán[cite: 83].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/bookings/hotel/{hotelId} | Booking của KS (phân trang) | PARTNER |
| GET | /api/bookings/{id} | Chi tiết booking | PARTNER |
| PATCH | /api/bookings/{id}/confirm | Xác nhận booking (PENDING→CONFIRMED) | PARTNER |
| PATCH | /api/bookings/{id}/checkin | Check-in thú cưng | PARTNER |
| PATCH | /api/bookings/{id}/checkout | Check-out thú cưng | PARTNER |

[cite_start][cite: 84]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Table booking gồm:** Mã invoice, tên chủ nuôi (owner), loại phòng, ngày đặt, trạng thái badge, tổng tiền[cite: 85].
    * [cite_start]Hỗ trợ bộ lọc nhanh theo trạng thái và ngày[cite: 85]. [cite_start]Nút action hiển thị linh hoạt thay đổi dựa theo từng trạng thái cụ thể của booking[cite: 86].

---

## [cite_start]4. Staff Pages — Nhân viên chăm sóc [cite: 87]

### [cite_start]📋 StaffDashboard — `/staff/dashboard` [cite: 88]
* [cite_start]**Mô tả:** Dashboard làm việc của nhân viên: hiển thị danh sách các task công việc hôm nay và danh sách các thú cưng đang có trạng thái `CHECKED_IN` tại khách sạn[cite: 89].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/tasks/my?date=today | Task được giao hôm nay | STAFF |
| GET | /api/bookings/hotel/{hotelId}?status=CHECKED_IN | Thú cưng đang lưu trú | STAFF |
| PATCH | /api/tasks/{id}/complete | Đánh dấu hoàn thành task | STAFF |

[cite_start][cite: 90]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Giao diện nhóm công việc (Group task) theo các khung giờ cố định trong ngày: `8:00 AM`, `12:00 PM`, `6:00 PM`[cite: 91].
    * Phân loại công việc bằng badge màu sắc cụ thể: 🍖FEEDING | 💊MEDICATION | 🛁GROOMING | [cite_start]🏃EXERCISE[cite: 91].
    * [cite_start]Hiển thị **Badge màu đỏ** nổi bật dành riêng cho những task khẩn cấp (`is_urgent`)[cite: 92].

### [cite_start]📔 DiaryWritePage — `/staff/diary/:bookingId` [cite: 93]
* [cite_start]**Mô tả:** Giao diện biểu mẫu dành cho nhân viên viết nhật ký chăm sóc định kỳ cho thú cưng[cite: 94].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| POST | /api/diary | Tạo diary entry mới | STAFF |
| GET | /api/diary/booking/{bookingId} | Xem nhật ký đã viết | STAFF |

[cite_start][cite: 95]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Form nhập liệu gồm:** Tiêu đề nhật ký, nội dung văn bản chi tiết, khu vực upload hình ảnh/video thực tế (qua Cloudinary)[cite: 96].
    * [cite_start]**Thành phần Select đặc biệt:** * Chọn Emoji tâm trạng (Mood): 😊Vui / 😐Bình thường / 😟Lo lắng / 😷Bệnh[cite: 97].
        * [cite_start]Chọn mức độ ăn uống (Eating): Tốt / BT / Kém[cite: 97].
        * [cite_start]Chọn mức độ hoạt động (Activity): Năng động / BT / Ít[cite: 97].

### [cite_start]✅ CheckInPage — `/staff/checkin/:bookingId` [cite: 98]
* [cite_start]**Mô tả:** Màn hình tiếp nhận thủ tục check-in cho thú cưng: hỗ trợ chụp ảnh thực tế và lấy chữ ký điện tử xác nhận từ chủ nuôi[cite: 99].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/bookings/{id} | Thông tin booking cần check-in | STAFF |
| PATCH | /api/bookings/{id}/checkin | Thực hiện check-in | STAFF |

[cite_start][cite: 100]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]Hỗ trợ tải ảnh thú cưng lên trực tiếp hệ thống (từ camera hoặc file có sẵn)[cite: 101]. [cite_start]Tích hợp phần khung **Canvas chữ ký điện tử** (hoạt động tốt trên cả cảm ứng touch lẫn chuột máy tính)[cite: 101].
    * [cite_start]Sau khi tiến hành submit $\rightarrow$ trạng thái booking chuyển tự động sang `CHECKED_IN` và hệ thống cho phép in biên nhận đi kèm[cite: 102].

---

## [cite_start]5. Admin Pages — Quản trị nền tảng [cite: 103]

### [cite_start]📊 AdminDashboard — `/admin/dashboard` [cite: 104]
* [cite_start]**Mô tả:** Trang tổng quan quản lý toàn bộ hệ thống nền tảng: giám sát doanh thu, lượng người dùng, tổng số booking và tình trạng khách sạn[cite: 105].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/admin/stats | Thống kê tổng quan hệ thống | ADMIN |
| GET | /api/hotels?status=PENDING | KS chờ duyệt | ADMIN |
| GET | /api/bookings | Tất cả booking gần nhất | ADMIN |

[cite_start][cite: 106]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Khối số liệu (Stats):** Tổng số lượng user, tổng số khách sạn đang active, lượng booking phát sinh hôm nay, tổng doanh thu theo tháng[cite: 107].
    * [cite_start]**Hệ thống biểu đồ (Chart):** Thể hiện lượng booking theo từng ngày và biến động doanh thu theo tháng[cite: 108]. [cite_start]Hiển thị danh sách các khách sạn chờ duyệt cần xử lý[cite: 108].

### [cite_start]🏨 HotelApprovePage — `/admin/hotels` [cite: 109]
* [cite_start]**Mô tả:** Trang dành cho Admin thực hiện kiểm tra, phê duyệt hoặc từ chối đơn đăng ký khách sạn mới[cite: 110].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/hotels | Tất cả KS (filter theo status) | ADMIN |
| PATCH | /api/hotels/{id}/status?status=ACTIVE | Duyệt KS | ADMIN |
| PATCH | /api/hotels/{id}/status?status=CLOSED | Từ chối / đóng KS | ADMIN |

[cite_start][cite: 111]

* **💡 Ghi chú giao diện & Logic:**
    * **Phân chia tab quản lý rõ ràng:** Tất cả | Chờ duyệt | Đang hoạt động | [cite_start]Đã đóng[cite: 112].
    * [cite_start]Yêu cầu giao diện cho phép xem đầy đủ toàn bộ thông tin chi tiết của khách sạn trước khi đưa ra quyết định bấm nút Duyệt (màu xanh) hoặc Từ chối (màu đỏ)[cite: 113].

### [cite_start]🎟️ VoucherManagePage — `/admin/vouchers` [cite: 114]
* [cite_start]**Mô tả:** Trang quản trị và khởi tạo mã giảm giá, voucher khuyến mãi áp dụng trên toàn bộ hệ thống nền tảng[cite: 115].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/vouchers | Danh sách voucher | ADMIN |
| POST | /api/vouchers | Tạo voucher mới | ADMIN |
| PATCH | /api/vouchers/{id}/status | Vô hiệu hóa voucher | ADMIN |

[cite_start][cite: 116]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Form tạo voucher bao gồm các trường:** Mã định danh voucher, loại giảm giá (theo tỷ lệ phần trăm $\%$ hoặc số tiền cố định), giá trị giảm cụ thể, hạn sử dụng, giới hạn số lượt dùng tối đa, đối tượng áp dụng[cite: 117].
    * Sử dụng các badge status để phân biệt nhanh: 🟢 ACTIVE | ⚫ EXPIRED | [cite_start]🔴 ARCHIVED[cite: 118].

### [cite_start]👥 UserManagePage — `/admin/users` [cite: 120]
* [cite_start]**Mô tả:** Giao diện quản lý thông tin toàn bộ tài khoản người dùng tham gia vào hệ thống[cite: 120].
* **API Mapping:**

| Method | Endpoint | Mô tả | Ai dùng |
| :--- | :--- | :--- | :--- |
| GET | /api/admin/users | Danh sách user (filter theo role) | ADMIN |
| PATCH | /api/admin/users/{id}/status | Khóa / mở khóa tài khoản | ADMIN |

[cite_start][cite: 121]

* **💡 Ghi chú giao diện & Logic:**
    * [cite_start]**Bảng dữ liệu hiển thị (Table):** Ảnh đại diện (avatar), email, tên người dùng, vai trò (role badge), ngày tạo tài khoản, trạng thái hoạt động[cite: 122].
    * [cite_start]Hỗ trợ bộ lọc nhanh theo vai trò và trạng thái[cite: 122]. [cite_start]Có chức năng chứa nút Khóa tài khoản nhanh[cite: 123].

---

## [cite_start]6. Shared Components — Dùng chung toàn app [cite: 124]

| Component | Mô tả | API liên quan |
| :--- | :--- | :--- |
| Header / Navbar | Logo + menu theo role + bell thông báo + avatar | GET /api/auth/me <br> GET /api/notifications/unread-count |
| AIChatBox (floating) | Nút chat góc phải dưới, mở panel chat AI với GPS | POST /api/ai/chat |
| NotificationDropdown | Bell icon + dropdown list thông báo chưa đọc | GET /api/notifications <br> PATCH /api/notifications/read-all |
| PrivateRoute | Guard route theo role, redirect nếu sai role | — |
| BookingStatusBadge | Badge màu theo BookingStatus | — |
| PetCard | Card thú cưng: avatar, tên, giống, age | — |
| HotelCard | Card KS: ảnh, tên, rating, giá, khoảng cách | — |
| QrCodeDisplay | Hiển thị QR + countdown timer 15 phút + polling | GET /api/payments/status/{bookingId} |
| ReviewCard | Card đánh giá: avatar, rating stars, comment, ảnh | — |
| ImageUploader | Upload ảnh lên Cloudinary, trả về URL | POST /api/upload/image |
| SignaturePad | Canvas chữ ký điện tử (touch + mouse) | — |
| MapPicker | Chọn tọa độ GPS trên bản đồ (Leaflet) | — |

[cite_start][cite: 125]

---

## [cite_start]7. Route Map — Tổng hợp tất cả các Route [cite: 126]

| Route | Trang | Quyền truy cập |
| :--- | :--- | :--- |
| /login | LoginPage | Public |
| /register | RegisterPage | Public |
| /otp-verify | OtpVerifyPage | Public |
| /hotels | HomePage | Public |
| /hotels/:id | HotelDetailPage | Public |
| /booking/:roomTypeId | BookingPage | OWNER |
| /payment/:bookingId | PaymentPage | OWNER |
| /my-bookings | MyBookingsPage | OWNER |
| /pets | PetProfilePage | OWNER |
| /diary/:bookingId | PetDiaryPage | OWNER |
| /profile | ProfilePage | Tất cả (đã đăng nhập) |
| /partner/dashboard | PartnerDashboard | PARTNER |
| /partner/hotels | HotelManagePage | PARTNER |
| /partner/hotels/:id/rooms | RoomManagePage | PARTNER |
| /partner/hotels/:id/services | ServiceManagePage | PARTNER |
| /partner/bookings | BookingManagePage | PARTNER |
| /staff/dashboard | StaffDashboard | STAFF |
| /staff/diary/:bookingId | DiaryWritePage | STAFF |
| /staff/checkin/:bookingId | CheckInPage | STAFF |
| /admin/dashboard | AdminDashboard | ADMIN |
| /admin/hotels | HotelApprovePage | ADMIN |
| /admin/vouchers | VoucherManagePage | ADMIN |
| /admin/users | UserManagePage | ADMIN |

[cite_start][cite: 127]