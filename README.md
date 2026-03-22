# AI Tutor - Nền tảng Giáo dục Thông minh

**AI Tutor** là một ứng dụng hỗ trợ học tập thông minh (Intelligent Mentoring System). Dự án cho phép học sinh và sinh viên tải lên các tài liệu học thuật (PDF, DOC) để tự động trích xuất kiến thức bằng công nghệ RAG, sinh đề kiểm tra tự động và tạo sơ đồ tư duy động trực quan.

## Cấu trúc Dự án (Project Structure)

Thư mục chính bao gồm:

* **`ai-tutor-frontend/`**: Ứng dụng Frontend xây dựng bằng Next.js, TypeScript và Tailwind CSS.
* **`ai-tutor-backend/`**: Ứng dụng Backend xử lý logic AI, trích xuất dữ liệu và quản lý API (Python FastAPI).

---

## Các thành phần chính

### 1. Frontend (ai-tutor-frontend)
- **Hệ thống Xác thực**: Đăng nhập, đăng ký, quên mật khẩu và xác minh mã code.
- **Không gian Dashboard**: Quản lý tài liệu học tập, kéo-thả tải lên.
- **Giao diện Modern UI**: Thiết kế responsive, tương thích với mọi thiết bị.

### 2. Backend (ai-tutor-backend)
- **FastAPI**: Xử lý API RESTful nhanh chóng.
- **RAG Engine**: Trích xuất kiến thức từ tài liệu (PDF, Word).
- **AI Logic**: Sinh đề thi và sơ đồ tư duy dựa trên nội dung bài học.

---

## Hướng dẫn khởi chạy

### Frontend
1. Di chuyển vào thư mục: `cd ai-tutor-frontend`
2. Cài đặt thư viện: `npm install`
3. Chạy server phát triển: `npm run dev`

### Backend
1. Di chuyển vào thư mục: `cd ai-tutor-backend`
2. (Tùy chọn) Cài đặt môi trường ảo: `python -m venv venv`
3. Cài đặt thư viện: `pip install -r requirements.txt`
4. Chạy server: `python main.py`

---

## Thông tin bổ sung
Dự án được thực hiện với cấu trúc module hóa cao, dễ dàng mở rộng và tích hợp thêm các công nghệ AI mới.
