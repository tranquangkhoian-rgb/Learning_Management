# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ NỘP BÀI & ĐIỂM SỐ - CÔ LINH

Hệ thống web chuyên biệt dành riêng cho Cô Linh để theo dõi quá trình nộp bài, chấm bài, sửa bài và quản lý điểm số cho lớp học 30 học sinh bằng mã QR cá nhân.

---

## 🚀 1. Cách Khởi Động Ứng Dụng (Cực Kỳ Đơn Giản)

### Trên máy Mac của Cô Linh:
* Chỉ cần **nhấp đúp chuột vào file `run.command`**.
* Máy chủ sẽ tự động chạy và trình duyệt (Safari hoặc Chrome) sẽ mở ngay trang chủ tại địa chỉ: `http://localhost:8080`.

### Mở trên iPad hoặc Điện thoại đặt tại "Góc Nộp Bài":
* Đảm bảo iPad/Điện thoại kết nối **cùng mạng WiFi** với máy tính của cô.
* Xem địa chỉ IP của máy tính (ví dụ: `http://192.168.1.15:8080`) rồi mở bằng Safari/Chrome trên iPad.
* Bấm nút **"🎯 Góc Nộp Bài (Học Sinh)"** để khóa chế độ Kiosk cho học sinh tự quét.

---

## 🏷️ 2. In Thẻ Mã QR Cho 30 Học Sinh (Khổ A4)
1. Vào tab **"🏷️ In Thẻ QR Mini (A4)"**.
2. Hệ thống đã tạo sẵn 30 thẻ mini vừa vặn khổ A4 (mỗi thẻ có: Tên lớp, Họ tên học sinh, Mã học sinh và Mã QR sắc nét).
3. Bấm nút **"🖨️ In Ngay (Khổ A4)"** hoặc phím tắt `Ctrl + P` / `Cmd + P`.
4. Cắt theo đường viền và dán vào góc bìa vở hoặc thẻ đeo của từng học sinh.

---

## 🎯 3. Quy Trình Nộp Bài Tại Lớp (Học Sinh Tự Quét)
1. Học sinh mang vở đến máy tính bảng tại góc lớp.
2. Chọn đúng bài tập cần nộp.
3. Đưa mã QR dán trên vở vào trước camera.
4. Màn hình phát âm thanh vui tai và hiện thông báo chúc mừng lớn:
   - Tên học sinh.
   - Trạng thái: **Đúng hạn** (Xanh lá) hoặc **Nộp trễ** (Cam).
   - Số lần nộp: **Lần 1** hoặc **Nộp lại** (Xanh dương).
5. Thông báo tự tắt sau 2 giây để học sinh tiếp theo tiếp tục quét.
*Học sinh không thể xem điểm hoặc sửa dữ liệu của nhau.*

---

## ✍️ 4. Quy Trình Chấm Bài & Sửa Bài Của Cô Linh
1. Vào tab **"✍️ Chấm Bài Nhanh"**.
2. Chọn bài tập cần chấm.
3. Đưa camera quét mã trên vở học sinh (hoặc bấm chọn tên học sinh trong danh sách).
4. Hệ thống hiện bảng chấm:
   - Xem lại lịch sử các lần nộp và điểm lần trước.
   - Bấm điểm nhanh (10, 9.5, 9, 8.5, 8, 7, 6, 5...) hoặc gõ điểm.
   - Chọn kết quả: **🟢 Đã đạt**, **🟡 Cần sửa**, **🔵 Cần nộp lại**, **🔴 Chưa hoàn thành**.
   - Bấm nhận xét nhanh (Ví dụ: "Rất sạch đẹp", "Cần tính toán cẩn thận hơn", "Có tiến bộ").
   - Bấm **"💾 Lưu Điểm & Chấm Tiếp"**.

### Quy trình Sửa bài - Nộp lại:
* Khi bài nhận kết quả **Cần sửa**, học sinh về chỗ sửa bài.
* Khi sửa xong, học sinh lại đem vở đến quét QR. Hệ thống tự động ghi nhận là **Lần nộp thứ 2** (không ghi đè lịch sử).
* Cô Linh chấm lại, nhập điểm mới $\rightarrow$ Hệ thống lưu toàn bộ tiến trình tiến bộ của học sinh!

---

## 📋 5. Bảng Theo Dõi & Thống Kê 3 Chiều
* **Bảng Theo Dõi Nhanh (Mục 6):** Lọc theo các nhóm màu: Chưa nộp, Đúng hạn, Nộp trễ, Cần sửa, Đã nộp lại, Đã hoàn thành. Có nút "Xem Lịch Sử" từng lần nộp/chấm và nút Xuất Excel.
* **Thống Kê 3 Chiều (Mục 7):**
  - Tỷ lệ hoàn thành của cả lớp.
  - Danh sách học sinh nộp đủ và đúng hạn.
  - Danh sách học sinh còn thiếu bài.
  - Danh sách học sinh thường xuyên nộp trễ.
  - Danh sách học sinh có tiến bộ vượt bậc sau khi sửa bài.
* **Hồ Sơ Từng Học Sinh (Mục 8):** Xem bảng điểm đầy đủ và tiến bộ của bất kỳ em nào trong lớp.

---

## 🟢 6. Tự Động Đồng Bộ Google Sheets (Phương Án B)
1. Mở file Google Sheet mới trên Google Drive của cô.
2. Chọn menu **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.
3. Mở file `google_sheet_script.js` trong thư mục này, sao chép toàn bộ mã dán vào Apps Script.
4. Bấm **Triển khai (Deploy)** $\rightarrow$ **Tùy chọn triển khai mới (New deployment)**:
   - Chọn loại: **Ứng dụng web (Web app)**.
   - Thực thi dưới dạng: **Tôi (Me)**.
   - Ai có quyền truy cập: **Bất kỳ ai (Anyone)**.
5. Bấm **Triển khai** $\rightarrow$ Cấp quyền $\rightarrow$ Sao chép đường dẫn Web App URL.
6. Mở web của cô $\rightarrow$ Vào tab **"⚙️ Cài Đặt & Google Sheets"** $\rightarrow$ Dán link vào ô rồi bấm **"🔗 Kiểm Tra Kết Nối"** và **"💾 Lưu Cài Đặt"**.

Từ thời điểm này, mỗi khi học sinh nộp bài hoặc cô chấm điểm, Google Sheet của cô sẽ **tự động nhảy dòng mới theo thời gian thực**!
