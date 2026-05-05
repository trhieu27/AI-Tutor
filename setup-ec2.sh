#!/bin/bash
# ============================================================
# setup-ec2.sh — Chạy 1 lần duy nhất khi mới tạo EC2
# Cách dùng:
#   chmod +x setup-ec2.sh && ./setup-ec2.sh
# ============================================================

set -e  # Dừng nếu có lỗi

echo "========================================="
echo "  AI Tutor — EC2 Initial Setup Script"
echo "========================================="

# ---- Cập nhật hệ thống ----
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ---- Cài Docker ----
echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cho phép user hiện tại dùng docker không cần sudo
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# ---- Cài Git ----
echo "📂 Installing Git..."
sudo apt-get install -y git curl

# ---- Cài Nginx (fallback nếu không dùng Docker nginx) ----
# sudo apt-get install -y nginx certbot python3-certbot-nginx

# ---- Clone repo ----
echo ""
echo "📥 Cloning repository..."
echo "Nhập GitHub repo URL (vd: https://github.com/username/DoAn.git):"
read REPO_URL

git clone "$REPO_URL" ~/DoAn
cd ~/DoAn/ai-tutor-backend

# ---- Tạo file .env ----
echo ""
echo "⚙️  Setting up .env file..."
cp .env.production.example .env

echo ""
echo "==============================================="
echo "  ✅ Setup hoàn tất!"
echo "==============================================="
echo ""
echo "Bước tiếp theo:"
echo "  1. Chỉnh sửa file .env:"
echo "       nano ~/DoAn/ai-tutor-backend/.env"
echo ""
echo "  2. Chạy deploy script:"
echo "       cd ~/DoAn && ./deploy.sh"
echo ""

# Nhắc logout để áp dụng docker group
echo "⚠️  Vui lòng chạy lệnh sau để áp dụng quyền Docker:"
echo "     newgrp docker"
echo "   hoặc logout và login lại SSH."
