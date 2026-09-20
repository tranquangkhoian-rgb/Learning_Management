# HƯỚNG DẪN TRIỂN KHAI LÊN HOSTING RIÊNG (VPS / DOCKER / SERVER)

Tài liệu này hướng dẫn bạn cách đưa ứng dụng **LMS Cô Linh (Next.js + TailwindCSS + SQLite)** lên **Hosting riêng** (máy chủ VPS như DigitalOcean, Linode, AWS, Hetzner, Vietnix, hoặc máy chủ vật lý tại trường).

---

## 📌 Lưu Ý Quan Trọng Về Camera (HTTPS)
Trình duyệt trên điện thoại và iPad (Safari, Chrome) **bắt buộc phải có HTTPS** để được cấp quyền mở Camera quét mã QR (trừ trường hợp chạy trực tiếp trên `localhost`). Do đó, khi đưa lên Hosting riêng, hãy gắn tên miền và bật SSL miễn phí (Let's Encrypt hoặc Cloudflare).

---

## 🐳 CÁCH 1: Triển Khai Bằng Docker (Khuyên Dùng - Nhanh Nhất)

Docker giúp bạn chạy ứng dụng mà không cần cài đặt cấu hình Node.js hay thư viện phức tạp trên máy chủ.

### Bước 1: Đưa mã nguồn lên VPS
Bạn tải toàn bộ thư mục `Learning_Management` lên VPS thông qua Git hoặc SCP/SFTP:
```bash
# Ví dụ sao chép thư mục lên VPS:
scp -r /Users/user/Documents/Learning_Management root@IP_CUA_BAN:/var/www/lms
```

### Bước 2: Khởi chạy ứng dụng
Đăng nhập SSH vào VPS và chạy lệnh:
```bash
cd /var/www/lms
chmod +x deploy.sh
./deploy.sh
```
Hoặc chạy trực tiếp bằng Docker Compose:
```bash
docker compose up -d --build
```
Ứng dụng sẽ tự động build và chạy ngầm tại cổng `3000`. Dữ liệu SQLite được lưu tại `./data/learning.db` trên máy chủ và **không bao giờ bị mất** khi bạn khởi động lại container.

---

## ⚙️ CÁCH 2: Triển Khai Trực Tiếp Bằng Node.js & PM2

Nếu bạn không dùng Docker và muốn chạy trực tiếp bằng Node.js:

### Bước 1: Cài đặt Node.js trên VPS (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Bước 2: Cài đặt dependencies và Build ứng dụng
```bash
cd /var/www/lms
npm install
npm run build
```

### Bước 3: Chạy nền bằng PM2
```bash
sudo npm install -g pm2
pm2 start npm --name "lms-co-linh" -- start
pm2 save
pm2 startup
```

---

## 🔒 CÁCH 3: Cấu Hình Tên Miền & Chứng Chỉ SSL Miễn Phí (HTTPS)

Dưới đây là cấu hình Nginx tiêu chuẩn kèm SSL Let's Encrypt:

### 1. Cài đặt Nginx & Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Cấu hình Nginx Proxy
Tạo file `/etc/nginx/sites-available/lms.conf`:
```nginx
server {
    server_name lms.yourdomain.com; # Thay bằng tên miền của bạn

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt cấu hình:
```bash
sudo ln -s /etc/nginx/sites-available/lms.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Kích hoạt SSL miễn phí tự động
```bash
sudo certbot --nginx -d lms.yourdomain.com
```

Sau khi có SSL, học sinh và giáo viên có thể mở `https://lms.yourdomain.com` trên điện thoại/iPad từ bất cứ đâu, camera quét mã QR sẽ hoạt động với tốc độ mượt mà nhất!

---

## 💾 Sao Lưu (Backup) Dữ Liệu SQLite
Vì toàn bộ dữ liệu nằm gọn trong thư mục `data/learning.db`, việc sao lưu cực kỳ dễ dàng:
- Chỉ cần tải file `data/learning.db` về máy là bạn có toàn bộ lịch sử điểm số, danh sách học sinh và nhật ký nộp bài.
