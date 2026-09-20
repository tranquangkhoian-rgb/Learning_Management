/**
 * =========================================================================
 * MÃ NGUỒN GOOGLE APPS SCRIPT ĐỒNG BỘ TỰ ĐỘNG CHO CÔ LINH
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT 3 BƯỚC (CHỈ MẤT 1 PHÚT):
 * 
 * 1. Mở một trang Google Sheet mới (hoặc trang tính có sẵn của Cô Linh).
 * 2. Trên thanh menu trên cùng, chọn: "Tiện ích mở rộng" (Extensions) -> "Apps Script".
 * 3. Xóa hết mã cũ trong ô soạn thảo, sao chép toàn bộ nội dung file này dán vào.
 * 4. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> "Tùy chọn triển khai mới" (New deployment).
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "LMS Cô Linh Sync".
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 5. Bấm "Triển khai" (Deploy) -> Cấp quyền truy cập nếu Google yêu cầu -> Sao chép "URL ứng dụng web" (Web app URL).
 * 6. Dán đường link vừa sao chép vào mục "Cài đặt & Đồng bộ" trên trang web quản lý lớp học.
 * 
 * Hoàn thành! Mỗi khi học sinh nộp bài hoặc Cô Linh chấm điểm, Google Sheet sẽ tự động nhảy dòng mới!
 * =========================================================================
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Sheet 1: Nhật ký chi tiết mọi sự kiện (Nộp bài, Chấm điểm, Sửa bài)
    var logSheet = ss.getSheetByName("Nhật Ký Nộp & Chấm");
    if (!logSheet) {
      logSheet = ss.insertSheet("Nhật Ký Nộp & Chấm");
      // Tạo tiêu đề đẹp mắt
      var headers = [
        "Thời Gian", 
        "Hành Động", 
        "Mã HS", 
        "Họ và Tên", 
        "Lớp", 
        "Tên Bài Tập", 
        "Môn Học", 
        "Lần Nộp", 
        "Đúng/Trễ Hạn", 
        "Điểm Số", 
        "Trạng Thái", 
        "Nhận Xét Của Cô", 
        "Người Thao Tác"
      ];
      logSheet.appendRow(headers);
      var headerRange = logSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#4F46E5");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      logSheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    // Ghi nhận dòng mới vào Sheet Nhật Ký
    var actionName = data.event_type === "grade" ? "Chấm Điểm" : (data.attempt_number > 1 ? "Nộp Lại" : "Nộp Bài");
    var scoreDisplay = (data.score !== undefined && data.score !== null && data.score !== "") ? data.score : "";
    
    logSheet.appendRow([
      data.timestamp || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss"),
      actionName,
      data.student_code || "",
      data.student_name || "",
      data.class_name || "Lớp 3A7",
      data.assignment_title || "",
      data.subject || "",
      data.attempt_number ? "Lần " + data.attempt_number : "Lần 1",
      data.is_late || "",
      scoreDisplay,
      data.status || "",
      data.teacher_note || "",
      data.operator || "Hệ thống"
    ]);
    
    // Tự động căn chỉnh độ rộng cột khi cần
    logSheet.autoResizeColumns(1, 13);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã cập nhật Google Sheet thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Google Apps Script Web App for LMS Co Linh is Active!").setMimeType(ContentService.MimeType.TEXT);
}
