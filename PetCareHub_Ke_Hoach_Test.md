# KẾ HOẠCH TEST — PetCare Hub (trước deploy)

> **Chuẩn bị trước khi test:**
> 1. ✅ Đã chạy migration: `UPDATE hotels SET status='ACTIVE' WHERE status='PENDING';` (đã xong)
> 2. **Restart BE** (vì sửa nhiều file Java + có thể thêm cột DB)
> 3. **Ctrl + Shift + R** ở FE (xóa cache, vì sửa nhiều file TSX)
> 4. Mở sẵn **terminal log BE** + **F12 Console** trên trình duyệt để bắt lỗi
> 5. Chat real-time cần **2 trình duyệt** (1 thường + 1 ẩn danh)
>
> **Cách dùng:** test theo thứ tự ưu tiên. Cái nào ❌ → ghi lại + báo, ĐỪNG sửa vội nhiều cái cùng lúc.

---

## 🔴 PHẦN 1 — OVERBOOKING (nặng nhất, phải chắc)

> Bug gốc: "hết phòng vẫn cho đặt". Cần chắc BE **chặn thật**, không chỉ đổi message.

| # | Bước làm | Kết quả mong đợi | ✅/❌ |
|---|----------|------------------|------|
| 1.1 | Chọn 1 loại phòng có `totalRooms` nhỏ (lý tưởng = 1). Nếu không có, tạo/sửa 1 phòng totalRooms=1 | Biết rõ phòng này chỉ có 1 chỗ | |
| 1.2 | Đặt phòng đó cho 1 khoảng ngày (vd 1–3/7), thanh toán tới khi booking thành công (CONFIRMED) | Đặt thành công lần 1 | |
| 1.3 | Quay lại trang khách sạn, xem thẻ loại phòng đó **cùng ngày 1–3/7** | Thẻ hiện **"Hết phòng"**, nút Đặt **mờ/disable** | |
| 1.4 | **Cố đặt lại** loại phòng đó **cùng ngày 1–3/7** (nếu nút mờ thì thử qua link/đổi rồi đổi lại ngày) | BE trả **409** + popup **"Loại phòng này đã hết chỗ trong thời gian bạn chọn"**, KHÔNG cho qua thanh toán | |
| 1.5 | Đổi sang **ngày khác còn trống** (vd 10–12/7) | Thẻ hiện **"Còn 1 phòng"**, đặt được bình thường | |
| 1.6 | Đổi qua lại nhiều ngày | Số "Còn X phòng" cập nhật đúng theo ngày | |

**⚠️ Then chốt: dòng 1.4.** Nếu **vẫn đặt được** khi đã hết phòng → BE chưa chặn thật (chỉ đổi chữ) → **báo ngay**, cần fix BE thêm `if availableRooms<=0 → throw 409`.

**Cách bắt lỗi:** F12 → Network → request POST booking → xem status. Phải là **409** khi hết phòng. Nếu **200** = lỗ hổng còn nguyên.

---

## 🔴 PHẦN 2 — DUYỆT CƠ SỞ (A3) + bảo mật

> Cần chắc: (a) hotel cũ vẫn hiện, (b) hotel chưa duyệt khách KHÔNG lọt vào được kể cả link trực tiếp.

### 2A — Migration & hotel cũ
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 2.1 | Khách (chưa login) vào trang chủ / search / nearby | **Vẫn thấy hotel cũ** (vì đã ACTIVE) | |
| 2.2 | Nếu web **trống trơn không hotel nào** | ❌ migration chưa ăn / file chưa về main repo → báo ngay | |

### 2B — Khách KHÔNG thấy hotel chưa duyệt (6 lỗ vừa bịt)
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 2.3 | Partner tạo 1 cơ sở mới → để nguyên PENDING (chưa duyệt) | Cơ sở vào trạng thái "Chờ duyệt" | |
| 2.4 | Khách **search/nearby** | **KHÔNG thấy** cơ sở PENDING đó | |
| 2.5 | Khách mở **link trực tiếp** `/hotel/{id}` của cơ sở PENDING (copy id từ DB hoặc từ tài khoản partner) | **404 / "không khả dụng"** (không vào được) | |
| 2.6 | Khách thử xem **review / dịch vụ / phòng** của cơ sở PENDING (nếu mò được URL) | Đều **404** | |
| 2.7 | Khách cố **đặt phòng** cơ sở PENDING | Bị chặn **400 "không nhận đặt phòng"** | |

### 2C — Chủ sở hữu vẫn xem được cơ sở mình (bypass đúng)
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 2.8 | **Chủ** của cơ sở PENDING → vào xem cơ sở **của mình** | **Vẫn xem được** (không bị 404) | |

### 2D — Luồng admin duyệt/từ chối
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 2.9 | Login **ADMIN** → `/admin/hotels` (Duyệt cơ sở) | Thấy danh sách cơ sở **Chờ duyệt** | |
| 2.10 | Bấm **Duyệt** 1 cơ sở | Cơ sở sang ACTIVE → khách thấy ngay | |
| 2.11 | Bấm **Từ chối** 1 cơ sở (nhập lý do) | Cơ sở sang REJECTED + lưu lý do | |

### 2E — Partner xem trạng thái + gửi lại
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 2.12 | Partner xem cơ sở bị từ chối | Badge **đỏ "Bị từ chối"** + hiện **lý do** | |
| 2.13 | Partner sửa cơ sở / bấm "Gửi duyệt lại" | Cơ sở về **PENDING** (chờ duyệt lại) | |

**⚠️ Then chốt: dòng 2.5 + 2.1.** Link trực tiếp hotel chưa duyệt phải bị chặn; hotel cũ phải còn hiện.

---

## 🟠 PHẦN 3 — CHAT REAL-TIME (owner ↔ chủ khách sạn)

> Cần **2 trình duyệt khác nhau** (1 thường + 1 ẩn danh). Lưu ý: nếu lỗi JWT cũ → **logout/login lại** cả 2 trước khi test.

| # | Cửa sổ | Bước | Mong đợi | ✅/❌ |
|---|--------|------|----------|------|
| 3.1 | A: Chủ nuôi | `/my-bookings` → booking CONFIRMED/CHECKED_IN → "Nhắn khách sạn" | Modal mở, header **"Đã kết nối"** (không kẹt "Đang kết nối") | |
| 3.2 | A | Gõ 1 tin → gửi | Tin hiện bên phải (màu owner) | |
| 3.3 | B: Chủ khách sạn | Login → trang Tin Nhắn → chọn cơ sở → mở hội thoại | Thấy tin chủ nuôi vừa gửi | |
| 3.4 | A gõ tin mới | | B **hiện ngay, KHÔNG F5** | |
| 3.5 | B trả lời | | A **hiện ngay** | |
| 3.6 | Cả 2 | Đóng modal → mở lại | Lịch sử tin **còn** (đã lưu DB) | |
| 3.7 | Terminal BE | Nhìn log lúc chat | **KHÔNG** còn spam đỏ `[WS] JWT không hợp lệ` / `code=1002` | |
| 3.8 | Bảo mật | Login chủ KS **khác** (hotel khác) | **KHÔNG** thấy hội thoại của hotel chủ A | |

**⚠️ Then chốt: dòng 3.4–3.5 (tin nhảy không F5) + 3.7 (log sạch).**

**Cách bắt lỗi nếu kẹt "Đang kết nối":** F12 → Console + Network (WS). Xem `/ws` có lên **101** không, Console có lỗi 401/CORS không → chụp gửi.

---

## 🟠 PHẦN 4 — FORM ĐĂNG KÝ CƠ SỞ (rút gọn)

| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 4.1 | Partner → "Thêm cơ sở" | Form **chỉ 1 bước** (thông tin cửa hàng), KHÔNG còn "Pháp lý" / "Tài chính" | |
| 4.2 | Để trống checkbox điều khoản | Nút submit **mờ** | |
| 4.3 | Tick điều khoản → điền thông tin → submit | Tạo thành công → vào **"Chờ duyệt"** (PENDING) | |
| 4.4 | Không báo lỗi thiếu giấy phép / số TK | Đăng ký trơn tru | |
| 4.5 | Sửa 1 cơ sở **có sẵn** | KHÔNG hiện checkbox, nút "Lưu thay đổi" | |
| 4.6 | Vào form **rút tiền** | Vẫn nhập được số tài khoản / ngân hàng | |

---

## 🔵 PHẦN 5 — CÁC CÁI NHẸ

### 5A — Ẩn số tài khoản (A2)
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 5.1 | Lịch sử rút tiền (partner) | STK hiển thị **che** dạng `123••••890` | |
| 5.2 | Admin xem withdrawal | STK **che** | |
| 5.3 | Form **nhập** rút tiền | Vẫn gõ/thấy **đầy đủ** (không che) | |
| 5.4 | Rút tiền thử | Vẫn chạy (số thật tới BE) | |
| 5.5 | QR thanh toán | Vẫn **quét được** (VietQR không bị mask) | |

### 5B — 2 nút chat hết đè
| # | Bước | Mong đợi | ✅/❌ |
|---|------|----------|------|
| 5.6 | Vào trang có 2 nút chat tròn (góc phải dưới) | 2 nút **tách rời**, không đè, bấm được cả 2 | |
| 5.7 | Lướt các trang khác (trang chủ, khách sạn, hồ sơ thú cưng) | Kiểm còn trang nào 2 nút **vẫn đè** không | |

---

## 📋 TÓM TẮT — ĐÁNH DẤU NHANH

| Tính năng | Trạng thái | Ghi chú lỗi (nếu có) |
|-----------|-----------|----------------------|
| 1. Overbooking chặn thật |  ⬜ |  |
| 2. Duyệt cơ sở + bảo mật |  ⬜ |  |
| 3. Chat real-time |  ⬜ |  |
| 4. Form đăng ký rút gọn |  ⬜ |  |
| 5A. Ẩn số TK |  ⬜ |  |
| 5B. Nút chat hết đè |  ⬜ |  |

---

## ⚠️ 3 CÁI DỄ LÀM "TƯỞNG HỎNG" (đọc trước khi hoảng)

1. **Web trống không hotel** → không phải lỗi code, mà file A3 **chưa về main repo** từ worktree (hoặc migration chưa ăn — nhưng đã chạy rồi). Kiểm file `HotelStatus.java` ở `BE/src/...` có chữ REJECTED không.
2. **Chat kẹt "Đang kết nối"** → thường do **token hết hạn**. Logout/login lại cả 2 cửa sổ TRƯỚC khi kết luận lỗi code.
3. **Thay đổi FE không hiện** → chưa **Ctrl+Shift+R** (cache cũ). Hard refresh lại.

---

## THỨ TỰ ƯU TIÊN NẾU KHÔNG ĐỦ THỜI GIAN

Test theo thứ tự này, dừng ở đâu cũng được:
1. **Phần 1 (overbooking)** + **Phần 2B/2C (link trực tiếp hotel chưa duyệt)** ← nguy hiểm nhất, đụng tiền + bảo mật
2. **Phần 3 (chat real-time)** ← phức tạp nhất
3. **Phần 4, 5** ← nhẹ, ít rủi ro

Cái nào ❌ → báo **từng cái một** kèm: bước nào fail + F12 Console/Network + log BE. Đừng gom nhiều lỗi 1 lần.
