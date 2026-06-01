# 🎓 AI Tutor — Nền tảng Học tập Thông minh

AI Tutor là ứng dụng hỗ trợ học tập dựa trên AI, cho phép sinh viên tải lên tài liệu học thuật (PDF, DOCX), chat hỏi đáp với AI có nguồn trích dẫn (RAG), tự động sinh quiz, tạo sơ đồ tư duy, và ghi chú — tất cả xoay quanh tài liệu của người dùng.

**🌐 Live:** [https://aitutor.click](https://aitutor.click)

---

## 📁 Cấu trúc Dự án

```
AI-Tutor/
├── ai-tutor-frontend/          # React 19 + Vite + TailwindCSS 4
├── ai-tutor-backend/           # Node.js + Express + MongoDB + ChromaDB
├── nginx/                      # Nginx reverse proxy (SSL + WebSocket + SSE)
├── .github/workflows/          # CI/CD — GitHub Actions auto-deploy
├── docker-compose.yml          # Docker Compose cho development
├── docker-compose.prod.yml     # Docker Compose cho production
├── deploy.sh                   # Script deploy lên EC2
├── setup-ec2.sh                # Script cài đặt môi trường EC2 (1 lần)
├── DESIGN.md                   # Design system & component spec
└── PRODUCT.md                  # Product context & UX principles
```

---

## 🛠️ Tech Stack

### Frontend

| Công nghệ | Vai trò |
|---|---|
| React 19 | UI framework |
| Vite 6 | Build tool & dev server |
| TailwindCSS 4 | Utility-first CSS |
| React Router 7 | Client-side routing |
| MUI X Charts | Biểu đồ admin dashboard |
| Mermaid | Render mindmap dạng diagram |
| Lottie React | Micro-animation |
| Material Symbols | Icon system |
| React Markdown + remark-gfm | Render markdown AI response |
| PDF.js | Render preview PDF trong browser |
| QRCode.react | Mã QR thanh toán |

### Backend

| Công nghệ | Vai trò |
|---|---|
| Node.js 18+ / Express 4 | REST API server |
| MongoDB (Mongoose) | Database chính |
| ChromaDB | Vector database cho RAG |
| Google Gemini API | LLM — chat, summary, quiz, mindmap |
| WebSocket (`ws`) | Realtime notifications & presence |
| JWT + bcrypt | Authentication & password hashing |
| Google OAuth 2.0 | Social login |
| Multer + AWS S3 | File upload & storage |
| Nodemailer | Email OTP / thông báo |
| PayOS | Cổng thanh toán (PayOS QR) |
| Puppeteer Core | Server-side rendering (export) |
| k6 | Load testing |

### Infrastructure

| Công nghệ | Vai trò |
|---|---|
| Docker + Docker Compose | Container orchestration |
| Nginx | Reverse proxy, SSL termination, gzip |
| AWS EC2 | Backend hosting |
| Let's Encrypt | SSL certificate (auto-renew) |
| GitHub Actions | CI/CD pipeline (auto-deploy on push) |

---

## 📋 Tính năng

### Người dùng (Student)

- ✅ Đăng ký / Đăng nhập (email + Google OAuth)
- ✅ Quên mật khẩu qua OTP email
- ✅ Dashboard — tiến độ học, tài liệu gần đây, hành động nhanh
- ✅ Upload tài liệu PDF, DOCX — tự động trích xuất nội dung
- ✅ **Chat hỏi đáp AI** — RAG-based, trích dẫn nguồn từ tài liệu
  - SSE streaming token-by-token
  - Quản lý nhiều phiên chat / tài liệu
  - Chia sẻ chat qua link
- ✅ **Sinh quiz tự động** — trắc nghiệm từ nội dung tài liệu
- ✅ **Tạo mindmap** — sơ đồ tư duy tương tác (Mermaid)
- ✅ **Tóm tắt tài liệu** — AI summary
- ✅ **Ghi chú** — lưu ghi chú theo tài liệu
- ✅ Thư viện tài liệu — tìm kiếm, quản lý, xem trạng thái xử lý
- ✅ Hệ thống gói (Free / Pro) — quota chat, AI generation, số tài liệu
- ✅ Thanh toán — PayOS QR code
- ✅ Thông báo realtime qua WebSocket
- ✅ Cài đặt tài khoản & tùy chọn AI response
- ✅ Light / Dark theme

### Admin

- ✅ Dashboard tổng quan — thống kê người dùng, tài liệu, doanh thu
- ✅ Quản lý người dùng — danh sách, trạng thái, block/unblock
- ✅ Quản lý tài liệu — xem tất cả tài liệu trong hệ thống
- ✅ Quản lý gói subscription — CRUD gói, giá, quota
- ✅ Báo cáo doanh thu — biểu đồ giao dịch
- ✅ Hoạt động người dùng — theo dõi online/offline realtime
- ✅ Audit log — lịch sử hành động admin

---

## ⚙️ Cài đặt & Chạy Local

### Yêu cầu

- Node.js ≥ 18
- npm ≥ 9
- Docker (nếu muốn chạy ChromaDB local)
- MongoDB Atlas hoặc MongoDB local

### 1. Frontend

```bash
cd ai-tutor-frontend
npm install
npm run dev
# → http://localhost:5173
```

Tạo file `ai-tutor-frontend/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8081/api/v1
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_WS_URL=ws://127.0.0.1:8081
```

### 2. Backend

```bash
cd ai-tutor-backend
npm install
npm run dev      # nodemon auto-reload
# → http://localhost:8081
```

Tạo file `ai-tutor-backend/.env`:

```env
PORT=8081
NODE_ENV=development

# MongoDB Atlas
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DATABASE_NAME=ai_tutor

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# ChromaDB (vector database cho RAG)
CHROMA_URL=http://localhost:8000

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_NAME=AI Tutor Support

# Upload
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE_MB=50

# AWS S3 (production file storage)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket

# PayOS (payment gateway)
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. ChromaDB (Vector Database)

```bash
# Chạy ChromaDB bằng Docker
docker run -d --name chromadb -p 8000:8000 chromadb/chroma:latest
```

Hoặc dùng Docker Compose để chạy toàn bộ stack:

```bash
docker compose up -d
```

---

## 🐳 Docker

### Development

```bash
# Chạy toàn bộ stack (ChromaDB + Backend + Frontend)
docker compose up -d

# Xem logs
docker compose logs -f
```

### Production

```bash
# Build & deploy (4 services: ChromaDB, Backend, Frontend, Nginx)
docker compose -f docker-compose.prod.yml up --build -d
```

#### Kiến trúc Production

```
Internet
   │
   ▼
Nginx (:443 SSL)
   ├──► /api/*           → Backend  (Express :8081)
   ├──► /api/v1/ws/*     → Backend  (WebSocket upgrade)
   ├──► /api/v1/chat/*/ask-stream → Backend (SSE, no gzip)
   └──► /*               → Frontend (Vite static :3000)
                                │
                          ChromaDB (:8000)
```

#### Các lệnh hữu ích

```bash
# Xem trạng thái
docker compose -f docker-compose.prod.yml ps

# Xem logs từng service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx

# Dừng tất cả
docker compose -f docker-compose.prod.yml down

# Health check
curl http://localhost/health
```

---

## 🔄 CI/CD

Dự án sử dụng **GitHub Actions** với 2 workflow tự động deploy khi push lên branch `develop`:

| Workflow | Trigger paths | Mô tả |
|---|---|---|
| `deploy-backend.yml` | `ai-tutor-backend/**`, `nginx/**`, `docker-compose.prod.yml` | SSH vào EC2 → pull code → rebuild backend container |
| `deploy-frontend.yml` | `ai-tutor-frontend/**`, `nginx/**`, `docker-compose.prod.yml` | SSH vào EC2 → pull code → rebuild frontend container |

**Secrets cần cấu hình trên GitHub:**

- `EC2_SSH_KEY` — Private key SSH vào EC2
- `EC2_HOST` — IP/hostname EC2
- `EC2_USER` — User SSH (vd: `ubuntu`)

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | Đăng nhập email/password |
| `POST` | `/api/v1/auth/google` | Đăng nhập Google OAuth |
| `POST` | `/api/v1/auth/forgot-password` | Gửi OTP quên mật khẩu |
| `POST` | `/api/v1/auth/reset-password` | Reset mật khẩu |

### User

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/users/me` | Thông tin người dùng hiện tại |
| `PUT` | `/api/v1/users/me` | Cập nhật profile |

### Documents

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/documents` | Danh sách tài liệu |
| `POST` | `/api/v1/documents` | Upload tài liệu (multipart) |
| `DELETE` | `/api/v1/documents/:id` | Xóa tài liệu |

### Chat (RAG)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/chat` | Tạo / lấy chat session |
| `POST` | `/api/v1/chat/:sessionId/ask-stream` | Gửi câu hỏi (SSE streaming) |
| `GET` | `/api/v1/chat/:sessionId/messages` | Lịch sử tin nhắn |

### Quiz, Mindmap, Summary

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/documents/:id/quiz` | Sinh quiz từ tài liệu |
| `POST` | `/api/v1/documents/:id/mindmap` | Tạo mindmap |
| `POST` | `/api/v1/documents/:id/summary` | Tóm tắt tài liệu |

### Other

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/quota` | Kiểm tra quota sử dụng |
| `GET` | `/api/v1/notifications` | Danh sách thông báo |
| `GET` | `/api/v1/plans` | Danh sách gói subscription |
| `POST` | `/api/v1/share` | Tạo link chia sẻ |
| `GET` | `/api/v1/notes` | Danh sách ghi chú |
| `WS` | `/api/v1/ws/notifications?token=...` | WebSocket realtime |
| `GET` | `/health` | Health check |

### Admin

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/admin/dashboard` | Thống kê tổng quan |
| `GET` | `/api/v1/admin/users` | Quản lý người dùng |
| `GET` | `/api/v1/admin/documents` | Quản lý tài liệu |
| `CRUD` | `/api/v1/admin/plans` | Quản lý gói subscription |
| `GET` | `/api/v1/admin/revenue` | Báo cáo doanh thu |
| `GET` | `/api/v1/admin/activity` | Hoạt động người dùng |
| `GET` | `/api/v1/admin/audit` | Audit log |

---

## 🧠 RAG Pipeline

Hệ thống RAG (Retrieval-Augmented Generation) xử lý tài liệu qua các bước:

```
Upload PDF/DOCX
      │
      ▼
Text Extraction (pdf.js / mammoth)
      │
      ▼
Chunking (split text → chunks)
      │
      ▼
Embedding → ChromaDB (vector store)
      │
      ▼
User hỏi câu hỏi
      │
      ▼
Query Rewriting → Hybrid Search (vector + keyword)
      │
      ▼
Re-ranking → Context Selection
      │
      ▼
Gemini API (grounded answer with sources)
```

**Modules chính:**
- `extractor.js` — Trích xuất text từ PDF/DOCX
- `chunker.js` — Chia text thành chunks
- `vectorstore.js` — Quản lý ChromaDB collections
- `hybrid-search.js` — Kết hợp vector search + keyword search
- `query-rewriter.js` — Viết lại câu hỏi để tìm kiếm tốt hơn
- `reranker.js` — Xếp hạng lại kết quả tìm kiếm
- `context-selector.js` — Chọn context phù hợp cho LLM
- `gemini.js` — Gọi Google Gemini API
- `pipeline.js` — Orchestrate toàn bộ RAG flow
- `knowledge-cache.js` — Cache kết quả để giảm API calls
- `hierarchy-builder.js` — Xây dựng cấu trúc phân cấp tài liệu

---

## 🚀 Deploy lên AWS EC2

### Lần đầu (cài đặt môi trường)

```bash
chmod +x setup-ec2.sh
./setup-ec2.sh
# → Cài Docker, Git, clone repo, tạo .env
```

### Deploy / cập nhật

```bash
chmod +x deploy.sh
./deploy.sh
# → Pull code → Build Docker → Start services → Health check
```

---

## 📊 Database Schema

| Collection | Mô tả |
|---|---|
| `users` | Thông tin người dùng (email, role, preferences) |
| `user_sessions` | Phiên đăng nhập, trạng thái online/offline |
| `documents` | Tài liệu upload (status, mindmap, summary, quiz) |
| `chat_sessions` | Phiên chat + embedded messages |
| `otps` | OTP quên mật khẩu (TTL) |
| `subscription_plans` | Gói đăng ký (free/pro, quota, giá) |
| `user_subscriptions` | Đăng ký hiện tại của user |
| `payment_transactions` | Lịch sử giao dịch thanh toán |
| `pending_payments` | Giao dịch chờ thanh toán (TTL 30 phút) |
| `usage_logs` | Log sử dụng tính năng (quota tracking) |
| `notifications` | Thông báo cho người dùng |
| `admin_audit_logs` | Log hành động admin |
| `share_links` | Link chia sẻ chat |
| `notes` | Ghi chú của người dùng theo tài liệu |

---

## 📂 Frontend Architecture

```
src/
├── App.jsx                     # Router chính
├── main.jsx                    # Entry point
├── styles/                     # Global CSS, design tokens
├── shared/                     # Shared modules
│   ├── components/             # UI components dùng chung
│   ├── ui/                     # ThemeProvider, primitives
│   ├── hooks/                  # Custom hooks
│   ├── services/               # API service layer
│   ├── models/                 # Data models
│   ├── constants/              # App constants
│   └── utils/                  # Helper functions
└── features/
    ├── auth/                   # Login, Register, Forgot Password
    │   ├── components/
    │   ├── context/            # AuthContext (JWT + Google OAuth)
    │   └── pages/
    ├── user/                   # Student-facing features
    │   ├── components/         # AppShell, Sidebar, Header, DocumentTable,
    │   │   │                   # InteractiveMindmap, UploadArea
    │   │   ├── chat/           # Chat UI components
    │   │   ├── documents/      # Document management components
    │   │   ├── quiz/           # Quiz components
    │   │   └── settings/       # Settings components
    │   ├── context/            # User-level contexts
    │   ├── pages/              # Dashboard, Learning, Chat, Quiz,
    │   │                       # Mindmap, Practice, Settings, Pricing, Help
    │   └── assets/             # Static assets
    └── admin/                  # Admin panel
        ├── components/         # AdminCharts, AdminPrimitives
        ├── hooks/              # Admin-specific hooks
        ├── services/           # Admin API services
        └── pages/              # Dashboard, Users, Documents,
                                # Plans, Revenue, Activity, Audit
```

---

## 📂 Backend Architecture

```
src/
├── server.js                   # Entry point (Express + WebSocket)
├── config/                     # Environment config
├── db/
│   ├── mongoose.js             # MongoDB connection
│   ├── models.js               # Mongoose schemas (14 models)
│   └── authDb.js               # Auth cache layer
├── middleware/
│   ├── auth.js                 # JWT verification middleware
│   └── admin.js                # Admin role guard
├── routes/
│   ├── auth.js                 # Register, Login, OAuth, OTP
│   ├── users.js                # Profile CRUD
│   ├── documents.js            # Upload, list, delete documents
│   ├── chat.js                 # Chat sessions, SSE streaming
│   ├── quota.js                # Usage quota check
│   ├── notifications.js        # Notification CRUD
│   ├── plans.js                # Subscription plans + PayOS payment
│   ├── admin.js                # Admin dashboard, CRUD, audit
│   ├── share.js                # Share links
│   └── notes.js                # Notes CRUD
├── rag/                        # RAG pipeline (12 modules)
│   ├── pipeline.js             # Main orchestrator
│   ├── extractor.js            # PDF/DOCX text extraction
│   ├── chunker.js              # Text chunking
│   ├── vectorstore.js          # ChromaDB operations
│   ├── hybrid-search.js        # Vector + keyword search
│   ├── query-rewriter.js       # Query optimization
│   ├── reranker.js             # Result re-ranking
│   ├── context-selector.js     # Context window selection
│   ├── gemini.js               # Gemini API integration
│   ├── knowledge-cache.js      # Response caching
│   ├── hierarchy-builder.js    # Document structure analysis
│   └── retrieval-router.js     # Search strategy routing
└── utils/
    ├── quota.js                # Quota enforcement
    ├── notifications.js        # WebSocket notification manager
    ├── presence.js             # Online/offline tracking
    ├── email.js                # SMTP email service
    ├── s3.js                   # AWS S3 file operations
    ├── pagination.js           # Pagination helpers
    ├── rateLimiter.js          # Rate limiting
    ├── browser.service.js      # Puppeteer service
    └── documentOps.js          # Document processing operations
```

---

## 🔒 Commit Convention

```
type: short description
```

| Type | Mô tả |
|---|---|
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Tái cấu trúc code |
| `style` | Thay đổi UI/CSS |
| `chore` | Cập nhật config, dependencies |
| `ci` | Thay đổi CI/CD pipeline |

---

## 👥 Tác giả

- **Trần Trung Hiếu** — [@trhieu27](https://github.com/trhieu27)

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.
