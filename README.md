# 🎓 AI Tutor — Nền tảng Học tập Thông minh

AI Tutor là ứng dụng hỗ trợ học tập dựa trên AI, cho phép sinh viên tải lên tài liệu (PDF, DOCX), chat hỏi đáp với AI có trích dẫn nguồn (RAG), tự động sinh quiz, tạo sơ đồ tư duy, và ghi chú — tất cả xoay quanh tài liệu của người dùng.

**🌐 Live:** [https://aitutor.click](https://aitutor.click)

---

## 📁 Cấu trúc Dự án

```
AI-Tutor/
├── ai-tutor-frontend/       # React 19 + Vite + TailwindCSS 4
├── ai-tutor-backend/        # Node.js + Express + MongoDB + ChromaDB
├── nginx/                   # Reverse proxy (SSL + WebSocket + SSE)
├── docker-compose.yml       # Docker Compose (development)
├── docker-compose.prod.yml  # Docker Compose (production)
└── .github/workflows/       # CI/CD — GitHub Actions
```

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|---|---|
| **Frontend** | React 19, Vite 6, TailwindCSS 4, React Router 7, MUI X Charts, Mermaid, PDF.js |
| **Backend** | Node.js 18+, Express 4, MongoDB (Mongoose), ChromaDB, Google Gemini API |
| **Auth** | JWT, bcrypt, Google OAuth 2.0 |
| **Realtime** | WebSocket (`ws`), SSE streaming |
| **Storage** | AWS S3, Multer |
| **Payment** | PayOS (QR code) |
| **Infra** | Docker, Nginx, AWS EC2, Let's Encrypt, GitHub Actions CI/CD |

---

## 📋 Tính năng chính

### Người dùng

- Đăng ký / Đăng nhập (email + Google OAuth), quên mật khẩu qua OTP
- Upload tài liệu PDF, DOCX — tự động trích xuất nội dung
- **Chat AI (RAG)** — hỏi đáp dựa trên tài liệu, trích dẫn nguồn, SSE streaming
- **Quiz tự động** — trắc nghiệm từ nội dung tài liệu
- **Mindmap** — sơ đồ tư duy tương tác
- **Tóm tắt** — AI summary tài liệu
- **Ghi chú** — lưu theo tài liệu
- Thư viện tài liệu, hệ thống gói Free / Pro, thanh toán QR
- Thông báo realtime, Light / Dark theme

### Admin

- Dashboard thống kê tổng quan
- Quản lý người dùng, tài liệu, gói subscription
- Báo cáo doanh thu, hoạt động người dùng, audit log

---

## ⚙️ Cài đặt & Chạy Local

### Yêu cầu

- Node.js ≥ 18, npm ≥ 9
- Docker (cho ChromaDB)
- MongoDB Atlas hoặc MongoDB local

### Frontend

```bash
cd ai-tutor-frontend
npm install
npm run dev          # → http://localhost:5173
```

Tạo file `.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8081/api/v1
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_WS_URL=ws://127.0.0.1:8081
```

### Backend

```bash
cd ai-tutor-backend
npm install
npm run dev          # → http://localhost:8081
```

Tạo file `.env` (xem `.env.example` để biết các biến cần thiết).

### ChromaDB

```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma:latest
```

Hoặc chạy toàn bộ stack:

```bash
docker compose up -d
```

---

## 👥 Tác giả

- **Trần Trung Hiếu** — [@trhieu27](https://github.com/trhieu27)

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.
