# 🎓 AI Tutor — Nền tảng Học tập Thông minh

AI Tutor là ứng dụng hỗ trợ học tập dựa trên AI, cho phép học sinh/sinh viên tải lên tài liệu học thuật (PDF, DOCX), tự động trích xuất kiến thức bằng RAG, chat hỏi đáp với AI, sinh đề kiểm tra tự động và tạo sơ đồ tư duy trực quan.

---

## 📁 Cấu trúc Dự án

```
DoAn/
├── ai-tutor-frontend/      # React + Vite + TailwindCSS
├── ai-tutor-backend/       # Node.js + Express + MongoDB
├── nginx/                  # Nginx reverse proxy config
├── docker-compose.prod.yml # Docker Compose cho production
├── deploy.sh               # Script deploy lên EC2
└── setup-ec2.sh            # Script cài đặt môi trường EC2
```

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, Vite, TailwindCSS 4, React Router |
| Backend | Node.js 18+, Express, Mongoose (MongoDB) |
| AI / RAG | Python FastAPI (service riêng) + Gemini API |
| Realtime | WebSocket (`ws`) |
| Auth | JWT + Google OAuth 2.0 |
| Deploy | Docker, Nginx, AWS EC2, AWS Amplify |

---

## ⚙️ Cài đặt & Chạy Local

### Yêu cầu

- Node.js >= 18
- npm >= 9
- Kết nối internet (MongoDB Atlas)

### 1. Frontend

```bash
cd ai-tutor-frontend

# Cài thư viện
npm install

# Chạy dev server → http://localhost:5173
npm run dev
```

**File môi trường** — tạo `ai-tutor-frontend/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8081/api/v1
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_WS_URL=ws://127.0.0.1:8081
```

---

### 2. Backend

```bash
cd ai-tutor-backend

# Cài thư viện
npm install

# Chạy với auto-reload (khuyến nghị khi dev)
npm run dev

# Hoặc chạy thường
npm start
```

Server khởi động tại: `http://localhost:8081`
WebSocket tại: `ws://localhost:8081/api/v1/ws/notifications`

**File môi trường** — tạo `ai-tutor-backend/.env`:

```env
PORT=8081
NODE_ENV=development

# MongoDB Atlas
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DATABASE_NAME=ai_tutor

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# RAG Service (Python FastAPI)
RAG_SERVICE_URL=http://localhost:8082

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_NAME=AI Tutor Support

# Upload
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE_MB=50

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🐳 Chạy với Docker (Production)

> File `docker-compose.prod.yml` dùng để deploy lên EC2 với Nginx + SSL.

### Build & khởi chạy

```bash
# Từ thư mục gốc
docker compose -f docker-compose.prod.yml up --build -d
```

### Các lệnh hữu ích

```bash
# Xem logs realtime
docker compose -f docker-compose.prod.yml logs -f

# Xem logs riêng từng service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx

# Dừng tất cả container
docker compose -f docker-compose.prod.yml down

# Kiểm tra trạng thái container
docker ps
```

### Kiến trúc Docker

```
Internet
   │
   ▼
Nginx (:80 / :443)
   ├──► Frontend (Next.js :3000)
   └──► Backend  (Express  :8081)
```

---

## 🌐 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | Đăng nhập |
| `POST` | `/api/v1/auth/google` | Đăng nhập Google OAuth |
| `GET` | `/api/v1/users/me` | Thông tin người dùng |
| `GET` | `/api/v1/documents` | Danh sách tài liệu |
| `POST` | `/api/v1/documents` | Upload tài liệu |
| `POST` | `/api/v1/chat` | Chat với AI |
| `GET` | `/api/v1/quota` | Kiểm tra quota sử dụng |
| `GET` | `/health` | Health check |
| `WS` | `/api/v1/ws/notifications?token=...` | Thông báo realtime |

---

## 📋 Tính năng

- ✅ Đăng ký / Đăng nhập (email + Google OAuth)
- ✅ Upload tài liệu PDF, DOCX
- ✅ Chat hỏi đáp với AI (RAG-based)
- ✅ Sinh đề kiểm tra tự động
- ✅ Tạo sơ đồ tư duy (Mindmap)
- ✅ Quản lý quota sử dụng
- ✅ Thông báo realtime qua WebSocket
- ✅ Responsive UI (mobile-friendly)

---

## 🚀 Deploy lên AWS EC2

```bash
# Cấp quyền thực thi
chmod +x setup-ec2.sh deploy.sh

# Cài đặt môi trường EC2 (chạy 1 lần)
./setup-ec2.sh

# Deploy / cập nhật
./deploy.sh
```
