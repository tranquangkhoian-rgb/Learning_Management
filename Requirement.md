# YÊU CẦU THIẾT KẾ WEB QUẢN LÝ NỘP BÀI VÀ ĐIỂM HỌC SINH

Cô Linh muốn thiết kế một trang web có giao diện nhẹ nhàng, thân thiện, dễ thao tác trên điện thoại để theo dõi việc nộp bài, chấm bài, sửa bài và điểm của học sinh.

## 1. Danh sách học sinh và mã cá nhân
* Giáo viên có thể nhập hoặc tải lên danh sách học sinh của lớp.
* Mỗi học sinh có một mã QR riêng.
* Trên mã QR hiển thị rõ họ tên học sinh để tránh quét nhầm.
* Mã QR có thể tải xuống và in ra để dán vào thẻ tên, sổ hoặc góc nộp bài.

## 2. Danh sách bài tập
Giáo viên có thể tạo bài tập mới với các thông tin:
* Tên bài tập.
* Môn học.
* Ngày giao bài.
* Hạn nộp.
* Thang điểm.
* Ghi chú nếu có.

## 3. Ghi nhận học sinh nộp bài
Khi học sinh nộp bài:
1. Giáo viên hoặc học sinh chọn đúng bài tập.
2. Quét mã QR của học sinh.
3. Hệ thống tự động lưu:
   * Họ tên học sinh.
   * Tên bài tập.
   * Ngày và giờ nộp.
   * Lần nộp thứ mấy.
   * Trạng thái "Đã nộp".

Hệ thống tự xác định:
* **Nộp đúng hạn:** nộp trước hoặc đúng hạn.
* **Nộp trễ:** nộp sau thời hạn.
* **Chưa nộp:** chưa có lượt quét nộp bài.
* **Nộp lại:** học sinh đã nộp trước đó và tiếp tục nộp sau khi sửa bài.

Sau khi quét thành công, màn hình cần hiện rõ tên học sinh, ảnh đại diện nếu có, trạng thái và thời gian nộp để người quét biết hệ thống đã ghi nhận.

## 4. Chấm bài và lưu điểm
Khi chấm xong, giáo viên:
1. Chọn bài tập đang chấm.
2. Quét mã QR của học sinh.
3. Nhập điểm.
4. Chọn một trong các kết quả:
   * Đã đạt.
   * Cần sửa.
   * Cần nộp lại.
   * Chưa hoàn thành.
5. Có ô ghi nhận xét ngắn nếu cần.

Hệ thống lưu đầy đủ:
* Điểm của từng lần chấm.
* Ngày và giờ chấm.
* Nhận xét của giáo viên.
* Trạng thái bài làm.
* Người thực hiện thao tác.

Không ghi đè điểm cũ. Nếu học sinh sửa và nộp lại, hệ thống phải lưu thêm một lượt mới để giáo viên xem được toàn bộ quá trình:
**Nộp lần 1 -> chấm lần 1 -> yêu cầu sửa -> nộp lần 2 -> chấm lại -> hoàn thành.**

## 5. Quy trình sửa bài và nộp lại
Khi bài cần sửa:
* Giáo viên chọn trạng thái "Cần sửa/Nộp lại".
* Khi học sinh sửa xong, giáo viên hoặc học sinh chỉ cần quét lại mã QR.
* Hệ thống tự ghi nhận đây là lần nộp tiếp theo.
* Giáo viên có thể nhập điểm mới sau khi chấm lại.
* Hệ thống vẫn giữ điểm, nhận xét và thời gian của các lần trước.

## 6. Bảng theo dõi nhanh của từng bài
Mỗi bài tập cần có một bảng gồm:
* STT.
* Họ tên học sinh.
* Trạng thái hiện tại.
* Thời gian nộp gần nhất.
* Đúng hạn hay trễ hạn.
* Số lần đã nộp.
* Số lần phải làm lại.
* Điểm lần đầu.
* Điểm gần nhất.
* Nhận xét.
* Nút xem lịch sử.

Có thể lọc nhanh theo các nhóm:
* Chưa nộp.
* Đã nộp đúng hạn.
* Nộp trễ.
* Đang cần sửa.
* Đã nộp lại.
* Đã hoàn thành.
* Chưa đạt yêu cầu.

## 7. Bảng thống kê tổng hợp
### Thống kê theo từng học sinh
* Tổng số bài được giao.
* Số bài đã nộp.
* Số bài chưa nộp.
* Số lần nộp đúng hạn.
* Số lần nộp trễ.
* Số bài phải làm lại.
* Tổng số lần nộp lại.
* Số bài đã hoàn thành.
* Số bài chưa hoàn thành.
* Điểm trung bình.
* Quá trình thay đổi điểm sau khi sửa bài.
* Danh sách các bài còn thiếu hoặc đang cần sửa.

### Thống kê theo từng bài tập
* Tổng số học sinh.
* Số học sinh đã nộp.
* Số học sinh chưa nộp.
* Số học sinh nộp đúng hạn.
* Số học sinh nộp trễ.
* Số học sinh cần sửa.
* Số học sinh đã nộp lại.
* Số học sinh đã hoàn thành.
* Điểm trung bình của lớp.

### Thống kê toàn lớp
* Học sinh thường xuyên nộp đủ và đúng hạn.
* Học sinh còn thiếu nhiều bài.
* Học sinh thường xuyên nộp trễ.
* Học sinh phải làm lại nhiều lần.
* Học sinh có tiến bộ sau khi sửa bài.
* Tỷ lệ hoàn thành bài của cả lớp.

## 8. Hồ sơ của từng học sinh
Khi chọn tên một học sinh, giáo viên có thể xem:
* Danh sách tất cả bài đã được giao.
* Bài đã nộp, chưa nộp hoặc nộp trễ.
* Điểm của từng bài.
* Số lần nộp của từng bài.
* Số lần phải sửa hoặc làm lại.
* Nhận xét của giáo viên.
* Lịch sử từng lần nộp và từng lần chấm.
* Biểu đồ hoặc phần tổng kết tiến bộ theo thời gian.

## 9. Xuất và lưu dữ liệu
* Có thể xuất bảng thống kê ra Excel hoặc Google Sheets.
* Có thể xuất báo cáo của cả lớp hoặc riêng một học sinh.
* Có bộ lọc theo môn học, bài tập, học sinh và khoảng thời gian.
* Dữ liệu được tự động lưu sau mỗi lần quét hoặc nhập điểm.
* Có chức năng chỉnh sửa khi giáo viên quét nhầm hoặc nhập sai.
* Chỉ tài khoản giáo viên mới được sửa điểm, xóa lượt quét hoặc thay đổi dữ liệu đã lưu.

## 10. Yêu cầu về giao diện
* Giao diện nhẹ nhàng, sáng, thân thiện và dễ nhìn.
* Phù hợp với học sinh tiểu học nhưng không quá nhiều chi tiết gây rối.
* Sử dụng tốt trên điện thoại, máy tính bảng và máy tính.
* Nút quét mã lớn, dễ bấm.
* Sau mỗi lần quét phải có thông báo rõ ràng:
  * Quét thành công.
  * Đã ghi nhận nộp bài.
  * Đây là lần nộp thứ mấy.
  * Nộp đúng hạn hay trễ hạn.
* Có thể sử dụng màu để nhận biết nhanh:
  * Xanh lá: đã hoàn thành.
  * Vàng: cần sửa.
  * Cam: nộp trễ.
  * Đỏ: chưa nộp.
  * Xanh dương: đã nộp lại.

## 11. Điều quan trọng nhất
Web cần giúp giáo viên thao tác thật nhanh. Với mỗi lần học sinh nộp bài, nộp lại hoặc được chấm điểm, giáo viên chỉ cần:
**Chọn bài -> quét mã học sinh -> chọn trạng thái hoặc nhập điểm -> lưu.**
Hệ thống phải giữ được toàn bộ lịch sử, không ghi đè dữ liệu cũ, để giáo viên theo dõi chính xác quá trình hoàn thành và tiến bộ của từng học sinh.
