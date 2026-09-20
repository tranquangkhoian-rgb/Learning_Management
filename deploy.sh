#!/bin/bash
set -e

echo "============================================================"
echo "  TRIỂN KHAI HỆ THỐNG LMS CÔ LINH (NEXT.JS + DOCKER)"
echo "============================================================"

# Check if docker is installed
if command -v docker >/dev/null 2>&1; then
    echo "1. Đang dừng và dọn dẹp container cũ nếu có..."
    docker compose down || true

    echo "2. Đang đóng gói và khởi động container Next.js..."
    docker compose up -d --build

    echo "============================================================"
    echo "  ✅ TRIỂN KHAI THÀNH CÔNG!"
    echo "  Ứng dụng đang chạy tại: http://localhost:3000"
    echo "============================================================"
else
    echo "Docker chưa được cài đặt. Kiểm tra cài đặt Node.js..."
    if command -v npm >/dev/null 2>&1; then
        echo "Cài đặt dependencies và khởi chạy bằng npm..."
        npm install
        npm run build
        npm run start
    else
        echo "Lỗi: Máy chủ cần cài đặt Docker hoặc Node.js để chạy!"
        exit 1
    fi
fi
