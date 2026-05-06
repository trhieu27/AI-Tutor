#!/bin/bash
# ============================================================
# deploy.sh — Chạy mỗi lần muốn deploy/update backend
# Cách dùng (chạy trên EC2):
#   cd ~/DoAn && chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

echo "========================================="
echo "  AI Tutor — Deploy Script"
echo "  $(date)"
echo "========================================="

PROJECT_DIR="$HOME/DoAn"
cd "$PROJECT_DIR"

# ---- Pull code mới nhất ----
echo "⬇️  Pulling latest code from GitHub..."
git pull origin main

# ---- Build và start services ----
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d --force-recreate

# ---- Dọn dẹp images cũ ----
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# ---- Kiểm tra health ----
echo "⏳ Waiting for backend to start (15s)..."
sleep 15

echo "🏥 Running health check..."
if curl -sf http://localhost/health > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Health check failed! Checking logs..."
    docker compose -f docker-compose.prod.yml logs --tail=50 backend
    exit 1
fi

echo ""
echo "====================================="
echo "  🎉 Deployment successful!"
echo "  Backend: http://$(curl -s ifconfig.me):80"
echo "====================================="
docker compose -f docker-compose.prod.yml ps
