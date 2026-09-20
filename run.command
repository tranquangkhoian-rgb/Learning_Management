#!/bin/bash
cd "$(dirname "$0")"
echo "============================================================"
echo "  KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ NỘP BÀI & ĐIỂM SỐ - CÔ LINH"
echo "============================================================"
echo "Đang mở trình duyệt..."
sleep 1 && open "http://localhost:8080" &
python3 server.py
