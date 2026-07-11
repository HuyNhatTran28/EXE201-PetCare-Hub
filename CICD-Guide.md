# 🚀 Tài liệu CI/CD — Docker + GitHub Actions + Azure VM

> Đúc kết từ dự án PetCare Hub, viết để áp dụng lại cho các dự án Spring Boot/React khác. Đọc từ trên xuống, phần nào không cần thì bỏ qua.

---

## 1. KIẾN TRÚC TỔNG QUAN

```
┌─────────────┐     push/merge      ┌──────────────────┐
│  Máy local  │ ──────────────────► │  GitHub (develop)  │
└─────────────┘                     └──────────────────┘
                                              │ trigger
                                              ▼
                                    ┌──────────────────┐
                                    │  GitHub Actions   │
                                    │  1. Build image   │
                                    │  2. Push Docker Hub│
                                    │  3. SSH vào VM     │
                                    │  4. Pull & restart │
                                    └──────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │   Azure VM        │
                                    │  nginx → backend  │
                                    │       → db         │
                                    └──────────────────┘
```

**Nguyên tắc cốt lõi:** code chỉ tồn tại ở 2 nơi cần đồng bộ — **GitHub** (nguồn sự thật) và **Docker Hub** (image đã build sẵn). VM chỉ cần biết pull image mới về chạy, không tự build gì cả → VM nhẹ, nhanh, không cần cài Maven/Node.

---

## 2. SETUP LẦN ĐẦU CHO DỰ ÁN MỚI (áp dụng 1 lần)

### 2.1. Chuẩn bị Docker hóa
- Viết `Dockerfile` cho từng service (BE, FE) — multi-stage build (build xong copy sang image nhỏ hơn, không mang theo source code + tool build).
- Viết `docker-compose.yml` (bản BUILD, dùng cho local — build image tại chỗ).
- Viết `docker-compose.prod.yml` (bản PULL, dùng cho VM — chỉ khác `docker-compose.yml` ở chỗ backend/nginx dùng `image: user/tên-image:latest` thay vì `build:`).
- Viết `nginx.conf` nếu có FE + cần reverse proxy `/api`, `/ws` (nhớ header `Upgrade`/`Connection` nếu có WebSocket).

⚠️ **Bẫy hay gặp:**
- FE dùng Vite: biến môi trường `VITE_*` bị **inline lúc build**, không đổi được sau khi build xong. File `.env.production` (không bí mật, gọi API qua đường dẫn tương đối `/api`) **phải commit lên Git**. File chứa API key thật (`.env.production.local`) thì gitignore — nhưng nếu CI cần build với key đó, phải đưa qua GitHub Secret rồi tạo file ngay trong bước build của workflow.
- DB cần extension đặc biệt (PostGIS, pgvector...) thì dùng đúng image (`postgis/postgis:...`), không dùng `postgres` thường.

### 2.2. Chuẩn bị hạ tầng (VM)
1. Tạo VM (Azure/AWS/GCP...), mở port 22 (SSH) + 80/443 (HTTP/HTTPS).
2. Cài Docker + Docker Compose trên VM.
3. Clone repo về VM: `git clone <repo-url> ~/ten-du-an`
4. Tạo file `.env` **thủ công trên VM** (chứa secret thật — **không bao giờ commit file này**).
5. Nếu có OAuth (Google, Facebook...): domain là bắt buộc, **IP thô không dùng được**. Đăng ký domain miễn phí (DuckDNS, No-IP...) trỏ về IP VM, dùng domain đó trong tất cả redirect URI.

### 2.3. Chuẩn bị Docker Hub
1. Tạo tài khoản Docker Hub, tạo Access Token (Read & Write) riêng cho CI (không dùng password thật).
2. Đặt tên image theo chuẩn: `username/ten-du-an-backend`, `username/ten-du-an-nginx`.

### 2.4. Chuẩn bị SSH key riêng cho CI (không dùng chung key cá nhân)
```bash
ssh-keygen -t ed25519 -f ten-du-an-deploy-key -C "ci-deploy"
```
- Copy nội dung **public key** (`.pub`) vào VM:
```bash
cat ten-du-an-deploy-key.pub >> ~/.ssh/authorized_keys
```
- Private key (file không đuôi `.pub`) sẽ đưa vào GitHub Secret (xem mục 2.5).

### 2.5. GitHub Secrets cần tạo
Vào repo → **Settings → Secrets and variables → Actions** → New repository secret:

| Secret | Giá trị |
|---|---|
| `DOCKERHUB_USERNAME` | username Docker Hub |
| `DOCKERHUB_TOKEN` | access token Docker Hub |
| `VM_HOST` | IP public của VM |
| `VM_USER` | user SSH (vd `azureuser`, `ubuntu`) |
| `VM_SSH_KEY` | **private key** deploy (xem mục 5 — cách nhập đúng, đây là chỗ hay lỗi nhất) |

### 2.6. Workflow file mẫu `.github/workflows/deploy.yml`
```yaml
name: Deploy
on:
  push:
    branches: [ develop ]      # đổi theo nhánh chính của bạn
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build & push backend
        uses: docker/build-push-action@v5
        with:
          context: ./BE
          file: ./BE/Dockerfile
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/ten-du-an-backend:latest
      - name: Build & push nginx
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./FE/ten-fe/Dockerfile
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/ten-du-an-nginx:latest
      - name: Deploy to VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script_stop: true            # ⚠️ QUAN TRỌNG — xem mục 5.3
          script: |
            cd ~/ten-du-an
            git pull origin develop    # ⚠️ QUAN TRỌNG — xem mục 5.2
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
```

Nhớ thêm `DOCKERHUB_USERNAME=<username>` vào `.env` trên VM để `docker-compose.prod.yml` đọc được biến `${DOCKERHUB_USERNAME}`.

---

## 3. QUY TRÌNH HÀNG NGÀY: SỬA CODE → DEPLOY TỰ ĐỘNG

```
1. Sửa code ở máy local
2. Test thủ công trước (chạy local hoặc docker compose up -d bản build)
3. git checkout -b feature/ten-tinh-nang
4. git add . && git commit -m "..."
5. git push origin feature/ten-tinh-nang
6. Lên GitHub tạo Pull Request → base: develop
7. Review (tự đọc lại hoặc nhờ người khác) → Merge pull request
8. GitHub Actions tự động:
   - Build lại image (chỉ backend/nginx bị đổi, cache layer không đổi cho nhanh)
   - Push image mới lên Docker Hub (đè tag "latest")
   - SSH vào VM → git pull → docker compose pull → up -d
9. Web tự cập nhật, không cần đụng tay vào VM
```

**Nếu KHÔNG bật branch protection rule** (dự án cá nhân, không bắt buộc PR), có thể bỏ bước 3-7, push thẳng:
```bash
git add . && git commit -m "..." && git push origin develop
```
Cách này nhanh hơn nhưng dễ đẩy code lỗi thẳng vào bản chạy thật — nên cân nhắc bật rule bảo vệ nhánh nếu làm nhóm hoặc dự án quan trọng.

### Lưu ý về downtime
Mỗi lần `up -d`, container `backend`/`nginx` cũ bị tắt và thay bằng cái mới → có vài giây gián đoạn. Container `db` không bị động tới (data an toàn nhờ named volume). Không nên deploy đúng lúc đang demo/có người dùng thật.

---

## 4. QUY TRÌNH KHỞI ĐỘNG / QUẢN LÝ SERVER (VM)

### SSH vào VM
```bash
ssh -i duong-dan-toi-key.pem user@IP-VM
```

### Các lệnh quản lý thường dùng
```bash
cd ~/ten-du-an

docker compose -f docker-compose.prod.yml ps                 # xem trạng thái 3 service
docker compose -f docker-compose.prod.yml logs backend --tail 50   # xem log
docker compose -f docker-compose.prod.yml up -d               # khởi động (chạy nền)
docker compose -f docker-compose.prod.yml down                # tắt (giữ nguyên data)
docker compose -f docker-compose.prod.yml restart backend     # restart 1 service
```

### Kiểm tra deploy có thật sự mới không (đừng chỉ tin dấu ✅ xanh trên Actions)
```bash
docker compose -f docker-compose.prod.yml ps
```
Cột `CREATED` phải là "vài giây/phút trước" sau khi Actions chạy xong. Nếu vẫn ghi "X giờ trước" nghĩa là deploy **fail thầm lặng** — xem mục 5.3.

### Khi VM khởi động lại (restart Azure VM, mất điện...)
- Nếu IP là **Dynamic**: IP sẽ đổi → phải cập nhật lại: domain (DuckDNS/No-IP), Google OAuth redirect URI, file `.env` (`FRONTEND_BASE_URL`, `APP_BACKEND_BASE_URL`...).
- Nên đổi sang **Static IP** ngay từ đầu (Azure Portal → VM → Networking → Public IP → Static) để khỏi lo việc này.
- Container có `restart: unless-stopped` trong compose file sẽ **tự khởi động lại** khi Docker daemon chạy lại, không cần `docker compose up -d` tay — nhưng nên kiểm tra lại bằng `docker compose ps` để chắc chắn.

### Đổi role admin thủ công qua DB (nếu cần)
```bash
docker exec -it ten-du-an-db-1 psql -U <user> -d <db_name>
# UPDATE users SET role='ADMIN' WHERE email='...';
```

### Tiết kiệm chi phí
Sau khi demo/hết dùng, tắt hẳn VM (không chỉ tắt container) trên Azure Portal để không bị trừ credit khi không dùng đến.

---

## 5. TROUBLESHOOTING — CÁC LỖI HAY GẶP NHẤT

### 5.1. FE build fail trên CI nhưng chạy local bình thường
- Kiểm `.env.production` (không chứa secret) đã commit lên Git chưa.
- Chạy `npm run build` local xem có lỗi TypeScript ẩn không (CI build ở chế độ production thường strict hơn dev).
- Biến môi trường cần secret thật (map key, API key...) → phải đưa vào GitHub Secret và inject vào bước build trong workflow, không thể dựa vào file gitignore.

### 5.2. Deploy "Success" trên Actions nhưng web không cập nhật code mới
**Đây là lỗi âm thầm nguy hiểm nhất** — action SSH mặc định không làm job fail dù lệnh bên trong `script` bị lỗi, trừ khi bật `script_stop: true`.

Nguyên nhân phổ biến: script trong `deploy.yml` chỉ chạy `docker compose pull` (tải **image Docker mới**) chứ không chạy `git pull` (tải **file cấu hình mới** như `docker-compose.prod.yml`, `nginx.conf`...). Nếu bạn từng đổi các file này, VM sẽ dùng bản cũ hoặc báo lỗi "file not found" mà Actions vẫn xanh.

→ **Luôn thêm `git pull origin <nhánh>` làm bước đầu tiên trong script deploy**, và luôn bật `script_stop: true` để job fail rõ ràng nếu có lệnh nào lỗi, thay vì báo Success giả.

### 5.3. `ssh: no key found` / `handshake failed` khi deploy
Lỗi này gần như luôn do **copy-paste private key qua clipboard/trình duyệt bị hỏng định dạng** (mất dòng cuối, xuống dòng bị đổi ký tự), **không phải do sai key**. Cách test: SSH thử bằng key đó từ máy local trước — nếu chạy được nghĩa là key đúng, vấn đề chỉ nằm ở lúc dán vào GitHub Secret.

**Cách fix chắc ăn nhất — dùng GitHub CLI, không copy-paste tay:**
```powershell
winget install --id GitHub.cli    # cài 1 lần
gh auth login                      # đăng nhập 1 lần

$key = Get-Content duong-dan-key -Raw
gh secret set VM_SSH_KEY --repo user/ten-repo --body $key
```
Set trực tiếp từ file qua biến, không qua clipboard/textarea trình duyệt → tránh được lỗi hỏng định dạng gần như 100%.

### 5.4. Push bị từ chối: "Repository rule violations"
Nhánh chính đã bật branch protection (chỉ nhận thay đổi qua Pull Request). Làm theo mục 3 (tạo nhánh mới → PR → merge), không push thẳng được nữa.

### 5.5. `git push` báo "rejected — fetch first"
Remote có commit mới hơn local. Chạy `git pull origin <nhánh>` trước (xử lý merge commit nếu có — Vim hiện ra thì `Esc` → gõ `:wq` → Enter để lưu & thoát), rồi `git push` lại.

---

## 6. CHECKLIST ÁP DỤNG CHO DỰ ÁN MỚI

- [ ] Viết Dockerfile cho từng service, test build local trước
- [ ] Viết `docker-compose.yml` (build) và `docker-compose.prod.yml` (pull image)
- [ ] Push code + Dockerfile lên GitHub
- [ ] Tạo VM, cài Docker, clone repo, tạo `.env` thủ công (không commit)
- [ ] Đăng ký domain miễn phí nếu có OAuth
- [ ] Tạo Docker Hub token
- [ ] Tạo SSH deploy key riêng, add public key vào VM
- [ ] Set 5 GitHub Secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VM_HOST`, `VM_USER`, `VM_SSH_KEY`) — set `VM_SSH_KEY` bằng `gh secret set --body`, không copy-paste tay
- [ ] Viết `.github/workflows/deploy.yml` — nhớ `git pull` trước `docker compose pull` và bật `script_stop: true`
- [ ] Test bằng cách push 1 commit nhỏ, theo dõi Actions từ đầu đến cuối
- [ ] Verify thật trên VM bằng `docker compose ps` (không chỉ tin dấu xanh trên Actions)

---

## TÓM TẮT 1 ĐOẠN

CI/CD chuẩn cho dự án Docker hóa gồm 3 mảnh: **Dockerfile + docker-compose (build/prod)** ở code, **Docker Hub** làm kho image trung gian, **GitHub Actions** làm cầu nối tự động (build → push → SSH deploy). Điểm dễ sai nhất khi setup lần đầu là dán SSH private key qua trình duyệt (dùng `gh secret set --body` để tránh) và quên `git pull` trong script deploy khiến Actions báo xanh giả trong khi VM chưa cập nhật gì. Quy trình hàng ngày chỉ còn: sửa code → nhánh mới → PR → merge → mọi thứ tự động, không cần đụng tay vào VM.
