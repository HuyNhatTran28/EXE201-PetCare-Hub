# ─────────────────────────────────────────────────────────────────
# LƯU Ý: Dockerfile này PHẢI được build với context = gốc repo
# (không phải thư mục FE/petcare-hub-fe/), vì stage 2 cần copy
# nginx/nginx.conf nằm ở gốc repo vào image cuối.
# Xem docker-compose.yml — service "nginx":
#   build.context: .
#   build.dockerfile: FE/petcare-hub-fe/Dockerfile
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: build FE bằng Node ─────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Copy package*.json trước để cache layer — chỉ chạy lại "npm ci" khi dependency đổi
COPY FE/petcare-hub-fe/package.json FE/petcare-hub-fe/package-lock.json ./
RUN npm ci

# Copy toàn bộ source FE, bao gồm .env.production (bắt buộc có mặt —
# quyết định VITE_API_URL rỗng lúc build, xem comment trong file đó)
COPY FE/petcare-hub-fe/ ./

# mode=production vốn là mặc định của "vite build", ghi rõ ra cho minh bạch:
# Vite sẽ nạp .env.production (VITE_API_URL=) đúng lúc build này.
RUN npm run build -- --mode production

# ── Stage 2: Nginx serve dist/ tĩnh + reverse proxy sang backend ────
# Gộp luôn Nginx vào image này (không tách container build riêng) —
# đây là cách gọn nhất: 1 Dockerfile ra thẳng 1 image nginx đã có sẵn
# dist/ + config, không cần volume hay container trung gian nào khác.
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
