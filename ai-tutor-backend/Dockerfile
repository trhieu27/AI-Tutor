# ============================================================
# Stage 1: Builder — cài dependencies
# ============================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài build tools cần thiết (chromadb, pymupdf cần gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Cài Python dependencies vào thư mục riêng
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ============================================================
# Stage 2: Runtime — image nhỏ gọn hơn
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Runtime libs cho pymupdf và chromadb
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages từ builder
COPY --from=builder /install /usr/local

# Copy source code
COPY . .

# Tạo thư mục storage (mount volume vào đây khi chạy)
RUN mkdir -p ./storage/chroma_db ./storage/uploads

# Non-root user để tăng bảo mật
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8081

# Healthcheck tự động
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081", "--workers", "2"]
