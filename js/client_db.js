/**
 * ClientDB - Pure Client-Side Database & Business Engine for LMS Cô Linh
 * Enables 100% offline & GitHub Pages static hosting with zero backend server.
 * Uses localStorage for persistent storage and direct Google Sheets webhook sync.
 */

const DEFAULT_STUDENTS_3A7 = [
  { id: 1, code: "HS01", full_name: "Vỹ An", gender: "Nữ", order_num: 1, class_name: "Lớp 3A7", password: "1234" },
  { id: 2, code: "HS02", full_name: "Tuệ An", gender: "Nữ", order_num: 2, class_name: "Lớp 3A7", password: "1234" },
  { id: 3, code: "HS03", full_name: "Lam Anh", gender: "Nữ", order_num: 3, class_name: "Lớp 3A7", password: "1234" },
  { id: 4, code: "HS04", full_name: "Minh Anh", gender: "Nữ", order_num: 4, class_name: "Lớp 3A7", password: "1234" },
  { id: 5, code: "HS05", full_name: "Hoàng Ân", gender: "Nam", order_num: 5, class_name: "Lớp 3A7", password: "1234" },
  { id: 6, code: "HS06", full_name: "Gia Bảo", gender: "Nam", order_num: 6, class_name: "Lớp 3A7", password: "1234" },
  { id: 7, code: "HS07", full_name: "Lan Chi", gender: "Nữ", order_num: 7, class_name: "Lớp 3A7", password: "1234" },
  { id: 8, code: "HS08", full_name: "Thiên Di", gender: "Nữ", order_num: 8, class_name: "Lớp 3A7", password: "1234" },
  { id: 9, code: "HS09", full_name: "Hải Đăng", gender: "Nam", order_num: 9, class_name: "Lớp 3A7", password: "1234" },
  { id: 10, code: "HS10", full_name: "Minh Hoàng", gender: "Nam", order_num: 10, class_name: "Lớp 3A7", password: "1234" },
  { id: 11, code: "HS11", full_name: "Phúc Hưng", gender: "Nam", order_num: 11, class_name: "Lớp 3A7", password: "1234" },
  { id: 12, code: "HS12", full_name: "Gia Hào", gender: "Nam", order_num: 12, class_name: "Lớp 3A7", password: "1234" },
  { id: 13, code: "HS13", full_name: "An Khang", gender: "Nam", order_num: 13, class_name: "Lớp 3A7", password: "1234" },
  { id: 14, code: "HS14", full_name: "Đăng Khang", gender: "Nam", order_num: 14, class_name: "Lớp 3A7", password: "1234" },
  { id: 15, code: "HS15", full_name: "Chí Khôi", gender: "Nam", order_num: 15, class_name: "Lớp 3A7", password: "1234" },
  { id: 16, code: "HS16", full_name: "Phương Lâm", gender: "Nữ", order_num: 16, class_name: "Lớp 3A7", password: "1234" },
  { id: 17, code: "HS17", full_name: "Phúc Lâm", gender: "Nam", order_num: 17, class_name: "Lớp 3A7", password: "1234" },
  { id: 18, code: "HS18", full_name: "Tuệ Linh", gender: "Nữ", order_num: 18, class_name: "Lớp 3A7", password: "1234" },
  { id: 19, code: "HS19", full_name: "Hà Linh", gender: "Nữ", order_num: 19, class_name: "Lớp 3A7", password: "1234" },
  { id: 20, code: "HS20", full_name: "Hà My", gender: "Nữ", order_num: 20, class_name: "Lớp 3A7", password: "1234" },
  { id: 21, code: "HS21", full_name: "Thiện Nhân", gender: "Nam", order_num: 21, class_name: "Lớp 3A7", password: "1234" },
  { id: 22, code: "HS22", full_name: "Mộc Nhi", gender: "Nữ", order_num: 22, class_name: "Lớp 3A7", password: "1234" },
  { id: 23, code: "HS23", full_name: "Hạ Nhiên", gender: "Nữ", order_num: 23, class_name: "Lớp 3A7", password: "1234" },
  { id: 24, code: "HS24", full_name: "Thanh Phương", gender: "Nữ", order_num: 24, class_name: "Lớp 3A7", password: "1234" },
  { id: 25, code: "HS25", full_name: "Minh Phương", gender: "Nữ", order_num: 25, class_name: "Lớp 3A7", password: "1234" },
  { id: 26, code: "HS26", full_name: "Gia Phát", gender: "Nam", order_num: 26, class_name: "Lớp 3A7", password: "1234" },
  { id: 27, code: "HS27", full_name: "Minh Tân", gender: "Nam", order_num: 27, class_name: "Lớp 3A7", password: "1234" },
  { id: 28, code: "HS28", full_name: "Minh Thư", gender: "Nữ", order_num: 28, class_name: "Lớp 3A7", password: "1234" },
  { id: 29, code: "HS29", full_name: "Tấn Tài", gender: "Nam", order_num: 29, class_name: "Lớp 3A7", password: "1234" }
];

const DEFAULT_BOOKS_3A7 = [
  {
    "id": 1,
    "stt": 1,
    "code": "SACH001",
    "title": "Quiz! Khoa học kì thú - Toán học đố mẹo",
    "author": "Do, Ki-sung",
    "category": "Tư duy",
    "shelf_code": "K1",
    "contributed_by": "Thiện Nhân",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 2,
    "stt": 2,
    "code": "SACH002",
    "title": "Chàng học trò và con chó đá",
    "author": "Hồng Hà (biên soạn); Kim Seung Hyun (tranh)",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Minh Thư",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 3,
    "stt": 3,
    "code": "SACH003",
    "title": "100.000 câu hỏi vì sao? - Tập 5: Máy bay & Tàu thuyền",
    "author": "XACT Studio International",
    "category": "Tư duy",
    "shelf_code": "K1",
    "contributed_by": "Hải Đăng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 4,
    "stt": 4,
    "code": "SACH004",
    "title": "Quiz! Khoa học kì thú - Khoa học lạ đời",
    "author": "Do, Ki-sung",
    "category": "Tư duy",
    "shelf_code": "K1",
    "contributed_by": "Tuệ An",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 5,
    "stt": 5,
    "code": "SACH005",
    "title": "Người bà tài giỏi vùng Saga - Tập 11",
    "author": "Yoshichi Shimada; Saburo Ishikawa",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 6,
    "stt": 6,
    "code": "SACH006",
    "title": "Việc học không hề đáng sợ",
    "author": "Giả Văn Bằng",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Minh Tân",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 7,
    "stt": 7,
    "code": "SACH007",
    "title": "Giáo dục giới tính và nhân cách dành cho bé gái - Tớ dũng cảm nói không với kẻ xấu",
    "author": "Trung tâm Sáng tạo Thiếu nhi Mộc Đầu Nhân",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Tuệ Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 8,
    "stt": 8,
    "code": "SACH008",
    "title": "Chú bé mang pyjama sọc",
    "author": "John Boyne",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 9,
    "stt": 9,
    "code": "SACH009",
    "title": "Cristiano Ronaldo là ai?",
    "author": "James Buckley Jr.; Gregory Copeland",
    "category": "Danh nhân",
    "shelf_code": "K1",
    "contributed_by": "Hải Đăng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 10,
    "stt": 10,
    "code": "SACH010",
    "title": "Plants vs. Zombies - Thế giới khủng long - Tập 3: Kỵ binh quyết chiến",
    "author": "Tiếu Giang Nam (truyện và tranh)",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Hải Đăng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 11,
    "stt": 11,
    "code": "SACH011",
    "title": "Những con mèo sau bức tường hoa",
    "author": "Hà Mi",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 12,
    "stt": 12,
    "code": "SACH012",
    "title": "Hạt giống tâm hồn - Tập 1: Cho lòng dũng cảm và tình yêu cuộc sống",
    "author": "Nhiều tác giả",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 13,
    "stt": 13,
    "code": "SACH013",
    "title": "Doraemon - Tập 20: Nobita và truyền thuyết vua Mặt Trời",
    "author": "Fujiko F Fujio Pro",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Vỹ An",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 14,
    "stt": 14,
    "code": "SACH014",
    "title": "Quiz! Khoa học kì thú - Vũ trụ",
    "author": "Do, Ki-sung",
    "category": "Tư duy",
    "shelf_code": "K1",
    "contributed_by": "Mộc Nhi",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 15,
    "stt": 15,
    "code": "SACH015",
    "title": "Cẩm nang sinh hoạt bằng tranh cho bé - Tập 2: Kĩ năng khi ăn uống",
    "author": "Hội Nghiên cứu Khoa học Đời sống Trẻ em Nhật Bản (biên soạn)",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Tuệ Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 16,
    "stt": 16,
    "code": "SACH016",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe buýt đáng yêu",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 17,
    "stt": 17,
    "code": "SACH017",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe tưới nước vui tính",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 18,
    "stt": 18,
    "code": "SACH018",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe vệ sinh môi trường thân thiện",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 19,
    "stt": 19,
    "code": "SACH019",
    "title": "Truyện cổ tích Việt Nam cho bé tập đọc",
    "author": "Mai Hương (biên soạn); T-Books (minh họa)",
    "category": "Truyện hay",
    "shelf_code": "K1",
    "contributed_by": "Minh Hoàng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 20,
    "stt": 20,
    "code": "SACH020",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe chở hàng nhiệt tình",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 21,
    "stt": 21,
    "code": "SACH021",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe buýt nhỏ nhanh trí",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 22,
    "stt": 22,
    "code": "SACH022",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe cứu thương nhanh nhẹn",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 23,
    "stt": 23,
    "code": "SACH023",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe taxi tốt bụng",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 24,
    "stt": 24,
    "code": "SACH024",
    "title": "Làm một người trung thực",
    "author": "Giả Văn Bằng",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Minh Tân",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 25,
    "stt": 25,
    "code": "SACH025",
    "title": "Câu chuyện nhỏ, bài học lớn - Xe cảnh sát nghiêm khắc",
    "author": "TONGYUE",
    "category": "Kỹ năng sống",
    "shelf_code": "K1",
    "contributed_by": "Thiên Di",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 26,
    "stt": 26,
    "code": "SACH026",
    "title": "100.000 câu hỏi vì sao? - Tập 1 (song ngữ Anh - Việt)",
    "author": "OM Books International",
    "category": "Tư duy",
    "shelf_code": "K2",
    "contributed_by": "Hải Đăng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 27,
    "stt": 27,
    "code": "SACH027",
    "title": "Chuyện con mèo dạy hải âu bay",
    "author": "Luis Sepúlveda",
    "category": "Truyện hay",
    "shelf_code": "K2",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 28,
    "stt": 28,
    "code": "SACH028",
    "title": "Thắc mắc nhỏ, ngỏ cùng em - Tốt và xấu",
    "author": "Sophie Dussaussois; Elsa Fouquier",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 29,
    "stt": 29,
    "code": "SACH029",
    "title": "Tinh thần trách nhiệm - Responsibility",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 30,
    "stt": 30,
    "code": "SACH030",
    "title": "Vì sao phải tập trung?",
    "author": "TS. Giáo dục học Nguyễn Thụy Anh",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 31,
    "stt": 31,
    "code": "SACH031",
    "title": "Đệ tử quy - Học làm người",
    "author": "Lý Dục Tú (biên soạn)",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 32,
    "stt": 32,
    "code": "SACH032",
    "title": "Bách khoa thư kỳ diệu cho trẻ em - Giải phẫu cơ thể người",
    "author": "Rahul Singhal và XACT Team",
    "category": "Tư duy",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 33,
    "stt": 33,
    "code": "SACH033",
    "title": "Kiên trì - Perseverance",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 34,
    "stt": 34,
    "code": "SACH034",
    "title": "Hoàng tử bé",
    "author": "Saint-Exupéry",
    "category": "Truyện hay",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 35,
    "stt": 35,
    "code": "SACH035",
    "title": "Lịch sự và tôn trọng - Courtesy and Respect",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 36,
    "stt": 36,
    "code": "SACH036",
    "title": "Lionel Messi là ai?",
    "author": "James Buckley Jr.; Manuel Gutierrez",
    "category": "Danh nhân",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 37,
    "stt": 37,
    "code": "SACH037",
    "title": "Biệt đội cảm xúc - Điệp viên sợ sệt",
    "author": "Kirsty Holmes",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 38,
    "stt": 38,
    "code": "SACH038",
    "title": "5 phút mỗi ngày - Con “cai nghiện” thiết bị điện tử",
    "author": "Phan Hồ Điệp (chủ biên)",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 39,
    "stt": 39,
    "code": "SACH039",
    "title": "Tớ tư duy như một ảo thuật gia - Tất tần tật về thí nghiệm thần kỳ",
    "author": "Tom Robinson",
    "category": "Tư duy",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 40,
    "stt": 40,
    "code": "SACH040",
    "title": "Lối sống khỏe mạnh dành cho trẻ em - Giữ gìn đôi mắt",
    "author": "Mạch Hiểu Phàm; Lam Hiểu",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 41,
    "stt": 41,
    "code": "SACH041",
    "title": "Thắc mắc về vi khuẩn - Có vi khuẩn tốt không?",
    "author": "Buke Buke",
    "category": "Tư duy",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 42,
    "stt": 42,
    "code": "SACH042",
    "title": "Vị tha và trắc ẩn - Forgiveness and Compassion",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 43,
    "stt": 43,
    "code": "SACH043",
    "title": "Cùng con học cách làm chủ cảm xúc - Đôi khi tớ không muốn",
    "author": "Timothy Knapman; Joe Berger",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 44,
    "stt": 44,
    "code": "SACH044",
    "title": "Có hai con mèo ngồi bên cửa sổ",
    "author": "Nguyễn Nhật Ánh",
    "category": "Truyện hay",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 45,
    "stt": 45,
    "code": "SACH045",
    "title": "Trung thực - Honesty",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 46,
    "stt": 46,
    "code": "SACH046",
    "title": "Kỹ năng đầu đời - Bài học tự bảo vệ: Con đường tức giận",
    "author": "",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 47,
    "stt": 47,
    "code": "SACH047",
    "title": "Cùng con học cách làm chủ cảm xúc - Đôi khi tớ giận dữ",
    "author": "Timothy Knapman; Joe Berger",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 48,
    "stt": 48,
    "code": "SACH048",
    "title": "The Lion King - The Magical Story",
    "author": "",
    "category": "Truyện hay",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 49,
    "stt": 49,
    "code": "SACH049",
    "title": "Ngầu! - Con đi bắt nạt",
    "author": "Erin Frankel (lời); Paula Heaphy (minh họa)",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 50,
    "stt": 50,
    "code": "SACH050",
    "title": "Tử tế - Kindness",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K2",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 51,
    "stt": 51,
    "code": "SACH051",
    "title": "Có thể bạn chưa biết - Vì sao chúng ta... toát mồ hôi?",
    "author": "Émilie Dufresne",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 52,
    "stt": 52,
    "code": "SACH052",
    "title": "Lối sống khỏe mạnh dành cho trẻ em - Sinh hoạt điều độ",
    "author": "Mạch Hiểu Phàm; Lam Hiểu",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 53,
    "stt": 53,
    "code": "SACH053",
    "title": "Can đảm! - Bạn của con bị bắt nạt",
    "author": "Erin Frankel (lời); Paula Heaphy (minh họa)",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 54,
    "stt": 54,
    "code": "SACH054",
    "title": "Cẩm nang an toàn cho bé - Bình tĩnh lúc lạc đường",
    "author": "Suzuki Mika",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Tuệ Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 55,
    "stt": 55,
    "code": "SACH055",
    "title": "Tâm hồn cao thượng",
    "author": "Edmondo De Amicis",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 56,
    "stt": 56,
    "code": "SACH056",
    "title": "Hiểu nghề nghiệp tương lai",
    "author": "Azuma Sonoko",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 57,
    "stt": 57,
    "code": "SACH057",
    "title": "Factivity - Explore the World",
    "author": "",
    "category": "Tư duy",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 58,
    "stt": 58,
    "code": "SACH058",
    "title": "Biết ơn - Gratitude",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 59,
    "stt": 59,
    "code": "SACH059",
    "title": "Yêu thương - Love",
    "author": "Dolphin Press",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 60,
    "stt": 60,
    "code": "SACH060",
    "title": "Sách bài tập - Con học cách tự vệ",
    "author": "Jayneen Sanders; Anna Hancock",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 61,
    "stt": 61,
    "code": "SACH061",
    "title": "Em biết gì? - Thế giới vi khuẩn",
    "author": "Muriel Zürcher",
    "category": "Tư duy",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 62,
    "stt": 62,
    "code": "SACH062",
    "title": "Vì sao cần có bạn?",
    "author": "TS. Giáo dục học Nguyễn Thụy Anh",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 63,
    "stt": 63,
    "code": "SACH063",
    "title": "Nuôi dưỡng trí tuệ cảm xúc - Chiếc lọ cảm xúc",
    "author": "Không",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 64,
    "stt": 64,
    "code": "SACH064",
    "title": "Bí mật bên trong cơ thể người",
    "author": "Joanna Cole; Bruce Degen",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 65,
    "stt": 65,
    "code": "SACH065",
    "title": "Có thể bạn chưa biết - Vì sao chúng ta... sổ mũi?",
    "author": "Matthew Tyler",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Cô Linh",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 66,
    "stt": 66,
    "code": "SACH066",
    "title": "Lược sử thế giới bằng tranh 8 - Lịch sử Hoa Kỳ",
    "author": "Li Zheng (chủ biên); Trà My (dịch)",
    "category": "Danh nhân",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 67,
    "stt": 67,
    "code": "SACH067",
    "title": "Lược sử thế giới bằng tranh 10 - Cách mạng công nghiệp",
    "author": "Li Zheng (chủ biên); Trà My (dịch)",
    "category": "Danh nhân",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 68,
    "stt": 68,
    "code": "SACH068",
    "title": "Lược sử thế giới bằng tranh 6 - Đế quốc Mông Cổ",
    "author": "Li Zheng (chủ biên); Thanh Uyên (dịch)",
    "category": "Danh nhân",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 69,
    "stt": 69,
    "code": "SACH069",
    "title": "Lược sử thế giới bằng tranh 9 - Chế độ quân chủ chuyên chế ở châu Âu",
    "author": "Li Zheng (chủ biên); Phương Thúy (dịch)",
    "category": "Danh nhân",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 70,
    "stt": 70,
    "code": "SACH070",
    "title": "Lược sử thế giới bằng tranh 7 - Văn hóa Phục hưng và chinh phục các miền đất mới",
    "author": "Li Zheng (chủ biên); Trà My (dịch)",
    "category": "Danh nhân",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 71,
    "stt": 71,
    "code": "SACH071",
    "title": "Quiz! Khoa học kì thú",
    "author": "An Young-joo (lời); Yoon Hyun Woo (tranh); Thanh Thủy (dịch)",
    "category": "Tư duy",
    "shelf_code": "K3",
    "contributed_by": "Hà My",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 72,
    "stt": 72,
    "code": "SACH072",
    "title": "Tôi là Bêtô",
    "author": "Nguyễn Nhật Ánh",
    "category": "Truyện hay",
    "shelf_code": "K3",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 73,
    "stt": 73,
    "code": "SACH073",
    "title": "Đảo Mộng Mơ",
    "author": "Nguyễn Nhật Ánh; Đỗ Hoàng Tường (minh họa)",
    "category": "Truyện hay",
    "shelf_code": "K3",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 74,
    "stt": 74,
    "code": "SACH074",
    "title": "Mơ ước ở nơi đâu? - Bí kíp giúp trẻ biết định hướng tương lai",
    "author": "Lim Jeong Jin; Yang Eun A",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  },
  {
    "id": 75,
    "stt": 75,
    "code": "SACH075",
    "title": "Hóa ra mình cũng tuyệt đấy chứ! - Bí kíp giúp trẻ tự tin",
    "author": "Lee Hye Jin; Minh Minh (dịch)",
    "category": "Kỹ năng sống",
    "shelf_code": "K3",
    "contributed_by": "Phúc Hưng",
    "condition": "Tốt",
    "status": "available"
  }
];

const DEFAULT_READING_RACE = [
  {
    "student_id": 1,
    "code": "HS01",
    "completed": 0,
    "avatar": "🐶",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 2,
    "code": "HS02",
    "completed": 0,
    "avatar": "🐱",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 3,
    "code": "HS03",
    "completed": 0,
    "avatar": "🦊",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 4,
    "code": "HS04",
    "completed": 0,
    "avatar": "🐰",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 5,
    "code": "HS05",
    "completed": 0,
    "avatar": "🐼",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 6,
    "code": "HS06",
    "completed": 0,
    "avatar": "🦁",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 7,
    "code": "HS07",
    "completed": 0,
    "avatar": "🐯",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 8,
    "code": "HS08",
    "completed": 0,
    "avatar": "🐨",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 9,
    "code": "HS09",
    "completed": 0,
    "avatar": "🦄",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 10,
    "code": "HS10",
    "completed": 0,
    "avatar": "🐸",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 11,
    "code": "HS11",
    "completed": 0,
    "avatar": "🐵",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 12,
    "code": "HS12",
    "completed": 0,
    "avatar": "🐻",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 13,
    "code": "HS13",
    "completed": 0,
    "avatar": "🐧",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 14,
    "code": "HS14",
    "completed": 0,
    "avatar": "🐤",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 15,
    "code": "HS15",
    "completed": 0,
    "avatar": "🦉",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 16,
    "code": "HS16",
    "completed": 0,
    "avatar": "🐺",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 17,
    "code": "HS17",
    "completed": 0,
    "avatar": "🐗",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 18,
    "code": "HS18",
    "completed": 0,
    "avatar": "🐴",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 19,
    "code": "HS19",
    "completed": 0,
    "avatar": "🐝",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 20,
    "code": "HS20",
    "completed": 0,
    "avatar": "🐙",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 21,
    "code": "HS21",
    "completed": 0,
    "avatar": "🦋",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 22,
    "code": "HS22",
    "completed": 0,
    "avatar": "🐢",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 23,
    "code": "HS23",
    "completed": 0,
    "avatar": "🐬",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 24,
    "code": "HS24",
    "completed": 0,
    "avatar": "🐳",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 25,
    "code": "HS25",
    "completed": 0,
    "avatar": "🦖",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 26,
    "code": "HS26",
    "completed": 0,
    "avatar": "🦔",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 27,
    "code": "HS27",
    "completed": 0,
    "avatar": "🐿️",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 28,
    "code": "HS28",
    "completed": 0,
    "avatar": "🦩",
    "last_updated": "2026-09-27 00:00:00"
  },
  {
    "student_id": 29,
    "code": "HS29",
    "completed": 0,
    "avatar": "🦚",
    "last_updated": "2026-09-27 00:00:00"
  }
];

const DEFAULT_SETTINGS = {
  class_name: "Lớp 3A7",
  teacher_name: "Cô Linh",
  school_name: "Trường Tiểu Học Ánh Dương",
  teacher_pin: "1234",
  auto_sync_sheets: "true",
  google_sheet_url: ""
};

const DEFAULT_ASSIGNMENTS = [
  {
    id: 1,
    title: "Chính tả & Luyện từ và câu: Mùa thu yêu thương",
    subject: "Tiếng Việt",
    description: "Viết bài chính tả trang 45 và hoàn thành 3 bài tập từ ngữ về mùa thu.",
    assigned_date: "2026-09-18",
    due_date: "2026-09-20 17:00:00",
    max_score: 10.0,
    created_at: "2026-09-18 08:00:00"
  },
  {
    id: 2,
    title: "Toán: Bảng nhân 7 và bài toán giải bằng hai phép tính",
    subject: "Toán",
    description: "Học thuộc bảng nhân 7, làm bài tập 1, 2, 3 trang 52 Vở bài tập Toán.",
    assigned_date: "2026-09-19",
    due_date: "2026-09-22 17:00:00",
    max_score: 10.0,
    created_at: "2026-09-19 08:00:00"
  }
];

class ClientDBEngine {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    const MATCH_DEFAULT_KEY = "lms_passwords_v3_matched";
    // Guarantee that every device opening the app has all student passwords matched to default '1234'
    if (localStorage.getItem(MATCH_DEFAULT_KEY) !== "true") {
      try {
        const raw = localStorage.getItem("lms_students");
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || list.length === 0) list = DEFAULT_STUDENTS_3A7;
        list = list.map((s, idx) => ({
          ...s,
          order_num: s.order_num || (idx + 1),
          password: "1234"
        }));
        localStorage.setItem("lms_students", JSON.stringify(list));

        // Also ensure teacher_pin is default '1234'
        const setRaw = localStorage.getItem("lms_settings");
        let settings = setRaw ? JSON.parse(setRaw) : DEFAULT_SETTINGS;
        settings.teacher_pin = "1234";
        localStorage.setItem("lms_settings", JSON.stringify(settings));
      } catch (e) {
        console.error("Error matching device codes to default:", e);
      }
      localStorage.setItem(MATCH_DEFAULT_KEY, "true");
    }

    if (!localStorage.getItem("lms_students")) {
      localStorage.setItem("lms_students", JSON.stringify(DEFAULT_STUDENTS_3A7));
    }
    if (!localStorage.getItem("lms_settings")) {
      localStorage.setItem("lms_settings", JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem("lms_assignments")) {
      localStorage.setItem("lms_assignments", JSON.stringify(DEFAULT_ASSIGNMENTS));
    }
    if (!localStorage.getItem("lms_events")) {
      localStorage.setItem("lms_events", JSON.stringify([]));
    }
    if (!localStorage.getItem("lms_books")) {
      localStorage.setItem("lms_books", JSON.stringify(DEFAULT_BOOKS_3A7));
    }
    if (!localStorage.getItem("lms_loans")) {
      localStorage.setItem("lms_loans", JSON.stringify([]));
    }
    if (!localStorage.getItem("lms_reading_race")) {
      localStorage.setItem("lms_reading_race", JSON.stringify(DEFAULT_READING_RACE));
    }
  }

  getSettings() {
    try {
      return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem("lms_settings") || "{}"));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = Object.assign({}, current, newSettings);
    localStorage.setItem("lms_settings", JSON.stringify(updated));
    return { success: true, settings: updated };
  }

  // --- Student CRUD ---
  getStudents() {
    try {
      const raw = JSON.parse(localStorage.getItem("lms_students"));
      const list = (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_STUDENTS_3A7;
      return list.map((s, idx) => {
        if (!s.order_num) s.order_num = idx + 1;
        if (!s.password) s.password = "1234";
        if (!s.gender) {
          const match = DEFAULT_STUDENTS_3A7.find(d => d.code === s.code);
          s.gender = match ? match.gender : "Học sinh";
        }
        return s;
      });
    } catch {
      return DEFAULT_STUDENTS_3A7;
    }
  }

  saveStudentsList(list) {
    if (Array.isArray(list)) {
      localStorage.setItem("lms_students", JSON.stringify(list));
      return true;
    }
    return false;
  }

  resetAllPasswordsToDefault(defaultPass = "1234") {
    const clean = String(defaultPass || "1234").trim();
    const list = this.getStudents().map(s => ({
      ...s,
      password: clean
    }));
    localStorage.setItem("lms_students", JSON.stringify(list));
    return list;
  }

  getStudentPasswordsMap() {
    const list = this.getStudents();
    const map = {};
    list.forEach(s => {
      const pwd = s.password || "1234";
      map[s.code] = pwd;
      map[String(s.id)] = pwd;
    });
    return map;
  }

  syncPasswordsFromMap(map) {
    if (!map || typeof map !== "object") return false;
    const list = this.getStudents();
    let changed = false;
    list.forEach(s => {
      const newPwd = map[s.code] || map[String(s.id)];
      if (newPwd && s.password !== newPwd) {
        s.password = newPwd;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem("lms_students", JSON.stringify(list));
    }
    return changed;
  }

  updateStudentPassword(studentIdOrCode, newPassword) {
    const list = this.getStudents();
    const cleanSC = String(studentIdOrCode).trim().toUpperCase();
    const idx = list.findIndex(s => String(s.id) === cleanSC || (s.code && s.code.toUpperCase() === cleanSC));
    if (idx === -1) return false;
    list[idx].password = String(newPassword || "1234").trim();
    localStorage.setItem("lms_students", JSON.stringify(list));
    return true;
  }

  verifyStudentPassword(studentIdOrCode, inputPassword) {
    const list = this.getStudents();
    const cleanSC = String(studentIdOrCode).trim().toUpperCase();
    const st = list.find(s => String(s.id) === cleanSC || (s.code && s.code.toUpperCase() === cleanSC));
    if (!st) return false;
    const expected = (st.password || "1234").trim();
    return String(inputPassword || "").trim() === expected;
  }

  addStudent(code, fullName, gender = "Nam", orderNum = null) {
    const list = this.getStudents();
    const cleanCode = code.trim().toUpperCase();
    if (list.some(s => s.code.toUpperCase() === cleanCode)) {
      throw new Error(`Mã học sinh "${cleanCode}" đã tồn tại!`);
    }
    const newId = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
    const maxOrder = list.length > 0 ? Math.max(...list.map(s => s.order_num || 0)) : 0;
    const st = {
      id: newId,
      code: cleanCode,
      full_name: fullName.trim(),
      gender: gender || "Học sinh",
      order_num: orderNum !== null && orderNum !== undefined ? Number(orderNum) : (maxOrder + 1),
      class_name: this.getSettings().class_name || "Lớp 3A7",
      password: "1234"
    };
    list.push(st);
    list.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    localStorage.setItem("lms_students", JSON.stringify(list));
    return st;
  }

  updateStudent(id, code, fullName, gender, orderNum) {
    const list = this.getStudents();
    const idx = list.findIndex(s => s.id == id);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], {
      code: code ? code.trim().toUpperCase() : list[idx].code,
      full_name: fullName ? fullName.trim() : list[idx].full_name,
      gender: gender || list[idx].gender,
      order_num: orderNum !== undefined && orderNum !== null ? Number(orderNum) : list[idx].order_num
    });
    list.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    localStorage.setItem("lms_students", JSON.stringify(list));
    return list[idx];
  }

  deleteStudent(id) {
    const list = this.getStudents().filter(s => s.id != id);
    localStorage.setItem("lms_students", JSON.stringify(list));
    return true;
  }

  resetStudentsToDefault() {
    localStorage.setItem("lms_students", JSON.stringify(DEFAULT_STUDENTS_3A7));
    return DEFAULT_STUDENTS_3A7;
  }

  // --- Assignment CRUD ---
  getAssignments() {
    try {
      const raw = JSON.parse(localStorage.getItem("lms_assignments"));
      const list = (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_ASSIGNMENTS;
      return list.map(a => {
        if (!a.subject || a.subject === "undefined") {
          a.subject = (a.title && a.title.toLowerCase().includes("toán")) ? "Toán" : "Tiếng Việt";
        }
        return a;
      });
    } catch {
      return DEFAULT_ASSIGNMENTS;
    }
  }

  createAssignment(title, subject, assignedDate, dueDate, maxScore = 10, notes = "") {
    const list = this.getAssignments();
    const newId = list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1;
    const item = {
      id: newId,
      title: title.trim(),
      subject: subject ? subject.trim() : "Bài tập",
      description: notes ? notes.trim() : "",
      notes: notes ? notes.trim() : "",
      assigned_date: assignedDate,
      due_date: dueDate.length <= 10 ? `${dueDate} 23:59:59` : dueDate,
      max_score: parseFloat(maxScore) || 10,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19)
    };
    list.unshift(item);
    localStorage.setItem("lms_assignments", JSON.stringify(list));
    return item;
  }

  updateAssignment(id, title, subject, assignedDate, dueDate, maxScore, notes) {
    const list = this.getAssignments();
    const idx = list.findIndex(a => a.id == id);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], {
      title: title.trim(),
      subject: subject ? subject.trim() : "Bài tập",
      assigned_date: assignedDate,
      due_date: dueDate.length <= 10 ? `${dueDate} 23:59:59` : dueDate,
      max_score: parseFloat(maxScore) || 10,
      description: notes ? notes.trim() : "",
      notes: notes ? notes.trim() : ""
    });
    localStorage.setItem("lms_assignments", JSON.stringify(list));
    return list[idx];
  }

  deleteAssignment(id) {
    const list = this.getAssignments().filter(a => a.id != id);
    localStorage.setItem("lms_assignments", JSON.stringify(list));
    return true;
  }

  getEvents() {
    try {
      return JSON.parse(localStorage.getItem("lms_events")) || [];
    } catch {
      return [];
    }
  }

  saveEvents(events) {
    localStorage.setItem("lms_events", JSON.stringify(events));
  }

  nowStr() {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  recordSubmission(studentCode, assignmentId, operator = "Học sinh") {
    const students = this.getStudents();
    const rawClean = String(studentCode).trim().toUpperCase();
    const match = rawClean.match(/HS\d+/i);
    const cleanCode = match ? match[0].toUpperCase() : rawClean;
    const st = students.find(s => s.code.toUpperCase() === cleanCode);
    if (!st) return { error: `Không tìm thấy học sinh với mã "${studentCode}"!` };

    const assignments = this.getAssignments();
    const asg = assignments.find(a => a.id == assignmentId);
    if (!asg) return { error: "Không tìm thấy bài tập!" };

    const events = this.getEvents();
    const pastAttempts = events.filter(e => e.student_id === st.id && e.assignment_id == assignmentId && e.event_type.startsWith("SUBMIT_"));
    const attemptNumber = pastAttempts.length + 1;

    const timestamp = this.nowStr();
    const isLate = asg.due_date ? timestamp > asg.due_date : false;
    const status = attemptNumber > 1 ? "Đã nộp lại" : "Đã nộp";
    const eventType = `SUBMIT_ATTEMPT_${attemptNumber}`;

    const newEvent = {
      id: Date.now(),
      student_id: st.id,
      assignment_id: asg.id,
      event_type: eventType,
      attempt_number: attemptNumber,
      submit_count: attemptNumber,
      status: status,
      score: null,
      teacher_note: "",
      operator: operator,
      is_late: isLate,
      timestamp: timestamp
    };

    events.push(newEvent);
    this.saveEvents(events);

    this.syncToGoogleSheet({
      action: "log_event",
      event_type: "submit",
      student_code: st.code,
      student_name: st.full_name,
      assignment_title: asg.title,
      attempt_number: attemptNumber,
      timestamp: timestamp,
      status: status,
      score: "",
      teacher_note: "",
      operator: operator
    });

    return {
      success: true,
      student: st,
      assignment: asg,
      event: newEvent,
      attempt_number: attemptNumber,
      submit_count: attemptNumber,
      is_late: isLate,
      status: status,
      submitted_at: timestamp
    };
  }

  recordGrading(studentId, assignmentId, score, status, teacherNote = "", operator = "Cô Linh") {
    const students = this.getStudents();
    const st = students.find(s => s.id == studentId);
    if (!st) return { error: "Không tìm thấy học sinh!" };

    const assignments = this.getAssignments();
    const asg = assignments.find(a => a.id == assignmentId);
    if (!asg) return { error: "Không tìm thấy bài tập!" };

    const events = this.getEvents();
    const pastGrades = events.filter(e => e.student_id === st.id && e.assignment_id == assignmentId && e.event_type.startsWith("GRADE_"));
    const attemptNumber = pastGrades.length + 1;

    const lastScore = pastGrades.length > 0 ? pastGrades[pastGrades.length - 1].score : null;
    const scoreVal = score !== "" && score !== null && score !== undefined ? parseFloat(score) : null;
    const delta = (lastScore !== null && scoreVal !== null) ? Math.round((scoreVal - lastScore) * 10) / 10 : null;

    const timestamp = this.nowStr();
    const eventType = `GRADE_ATTEMPT_${attemptNumber}`;

    const newEvent = {
      id: Date.now(),
      student_id: st.id,
      assignment_id: asg.id,
      event_type: eventType,
      attempt_number: attemptNumber,
      status: status,
      score: scoreVal,
      teacher_note: teacherNote.trim(),
      operator: operator,
      score_change_delta: delta,
      timestamp: timestamp
    };

    events.push(newEvent);
    this.saveEvents(events);

    this.syncToGoogleSheet({
      action: "log_event",
      event_type: "grade",
      student_code: st.code,
      student_name: st.full_name,
      assignment_title: asg.title,
      attempt_number: attemptNumber,
      timestamp: timestamp,
      status: status,
      score: scoreVal !== null ? scoreVal : "",
      teacher_note: teacherNote.trim(),
      operator: operator
    });

    return {
      success: true,
      student: st,
      assignment: asg,
      attempt_number: attemptNumber,
      score: scoreVal,
      score_change_delta: delta,
      status: status,
      timestamp: timestamp
    };
  }

  // --- 11-column Tracking Matrix ---
  getTrackingMatrix(assignmentId) {
    const students = this.getStudents();
    const assignments = this.getAssignments();
    const asg = assignments.find(a => a.id == assignmentId);
    if (!asg) return null;

    const events = this.getEvents().filter(e => e.assignment_id == assignmentId);

    const rows = students.map((st, idx) => {
      const stEvents = events.filter(e => e.student_id === st.id);
      const submits = stEvents.filter(e => e.event_type.startsWith("SUBMIT_"));
      const grades = stEvents.filter(e => e.event_type.startsWith("GRADE_"));

      const submitCount = submits.length;
      const retryCount = grades.filter(g => g.status === "Cần sửa" || g.status === "Cần nộp lại").length;
      const isLate = submits.length > 0 ? submits[0].is_late : false;
      const firstSubmitTime = submits.length > 0 ? submits[0].timestamp : null;
      const latestSubmitTime = submits.length > 0 ? submits[submits.length - 1].timestamp : null;

      let currentStatus = "Chưa nộp";
      let colorGroup = "red";
      let latestScore = null;
      let firstScore = grades.length > 0 && grades[0].score !== null ? grades[0].score : null;
      let teacherNote = null;
      let delta = null;

      if (submitCount === 0) {
        currentStatus = "Chưa nộp";
        colorGroup = "red";
      } else {
        const lastEv = stEvents[stEvents.length - 1];
        if (lastEv && lastEv.event_type.startsWith("GRADE_")) {
          latestScore = lastEv.score;
          teacherNote = lastEv.teacher_note;
          delta = lastEv.score_change_delta;
          if (lastEv.status === "Đã đạt") {
            currentStatus = "Đã hoàn thành";
            colorGroup = "green";
          } else if (lastEv.status === "Cần sửa" || lastEv.status === "Cần nộp lại") {
            currentStatus = "Đang cần sửa";
            colorGroup = "yellow";
          } else if (lastEv.status === "Chưa hoàn thành") {
            currentStatus = "Chưa đạt yêu cầu";
            colorGroup = "red";
          } else {
            currentStatus = lastEv.status;
            colorGroup = "yellow";
          }
        } else {
          if (submitCount > 1) {
            currentStatus = "Đã nộp lại";
            colorGroup = "blue";
          } else {
            currentStatus = isLate ? "Nộp trễ" : "Đã nộp đúng hạn";
            colorGroup = isLate ? "orange" : "blue";
          }
        }
      }

      return {
        stt: st.order_num || (idx + 1),
        order_num: st.order_num || (idx + 1),
        student_id: st.id,
        code: st.code,
        full_name: st.full_name,
        gender: st.gender || "Học sinh",
        current_status: currentStatus,
        status: currentStatus,
        color_group: colorGroup,
        submit_count: submitCount,
        is_late: isLate,
        first_submit_time: firstSubmitTime,
        latest_submit_time: latestSubmitTime,
        retry_count: retryCount,
        first_score: firstScore,
        latest_score: latestScore,
        teacher_note: teacherNote,
        score_change_delta: delta,
        history: stEvents
      };
    });

    const totalStudents = students.length;
    const submittedCount = rows.filter(r => r.submit_count > 0).length;
    const gradedCount = rows.filter(r => r.latest_score !== null).length;
    const passedCount = rows.filter(r => r.current_status === "Đã hoàn thành" || r.current_status === "Đã đạt").length;
    const needFixCount = rows.filter(r => r.current_status.includes("sửa")).length;
    const needResubmitCount = rows.filter(r => r.current_status === "Cần nộp lại").length;
    const notSubmittedCount = totalStudents - submittedCount;
    const lateCount = rows.filter(r => r.is_late).length;
    const scores = rows.filter(r => r.latest_score !== null).map(r => r.latest_score);
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

    return {
      assignment: asg,
      rows: rows,
      matrix: rows,
      summary: {
        total_students: totalStudents,
        submitted_count: submittedCount,
        not_submitted_count: notSubmittedCount,
        graded_count: gradedCount,
        passed_count: passedCount,
        need_fix_count: needFixCount,
        need_resubmit_count: needResubmitCount,
        late_count: lateCount,
        average_score: avgScore,
        submission_rate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 1000) / 10 : 0
      }
    };
  }

  // --- 3-Way Analytics ---
  getAnalytics() {
    const students = this.getStudents();
    const assignments = this.getAssignments();
    const allEvents = this.getEvents();

    const asgStats = assignments.map(a => {
      const matrix = this.getTrackingMatrix(a.id);
      const rows = matrix ? matrix.rows : [];
      const submitted = rows.filter(r => r.submit_count > 0).length;
      const onTime = rows.filter(r => r.submit_count > 0 && !r.is_late).length;
      const late = rows.filter(r => r.is_late).length;
      const needFix = rows.filter(r => (r.current_status || "").includes("sửa")).length;
      const resubmitted = rows.filter(r => r.submit_count > 1).length;
      const completed = rows.filter(r => (r.current_status || "") === "Đã hoàn thành" || (r.current_status || "") === "Đã đạt").length;
      const scores = rows.filter(r => r.latest_score !== null && r.latest_score !== undefined).map(r => r.latest_score);
      const classAvg = scores.length > 0 ? Math.round((scores.reduce((acc, v) => acc + v, 0) / scores.length) * 10) / 10 : null;

      return {
        assignment_id: a.id,
        id: a.id,
        title: a.title,
        subject: a.subject || "Bài tập",
        assigned_date: a.assigned_date,
        due_date: a.due_date,
        total_students: students.length,
        num_submitted: submitted,
        num_missing: students.length - submitted,
        num_on_time: onTime,
        num_late: late,
        num_need_fix: needFix,
        num_resubmitted: resubmitted,
        num_completed: completed,
        class_avg_score: classAvg,
        summary: matrix ? matrix.summary : {}
      };
    });

    const studentStats = students.map(st => {
      const stEvents = allEvents.filter(e => e.student_id === st.id);
      let submittedCount = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let completedCount = 0;
      let retryCount = 0;
      let scores = [];

      assignments.forEach(asg => {
        const events = stEvents.filter(e => e.assignment_id === asg.id);
        const submits = events.filter(e => e.event_type.startsWith("SUBMIT_"));
        const grades = events.filter(e => e.event_type.startsWith("GRADE_"));
        if (submits.length > 0) {
          submittedCount++;
          if (submits[0].is_late) lateCount++;
          else onTimeCount++;
        }
        if (grades.length > 0) {
          const lastGrade = grades[grades.length - 1];
          if (lastGrade.score !== null && lastGrade.score !== undefined) scores.push(lastGrade.score);
          if (lastGrade.status === "Đã đạt" || lastGrade.status === "Đã hoàn thành") completedCount++;
          if (lastGrade.status === "Cần sửa" || lastGrade.status === "Cần nộp lại") retryCount++;
        }
      });

      const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

      return {
        student_id: st.id,
        id: st.id,
        code: st.code,
        full_name: st.full_name,
        order_num: st.order_num,
        total_assigned: assignments.length,
        num_submitted: submittedCount,
        num_missing: assignments.length - submittedCount,
        on_time_count: onTimeCount,
        late_count: lateCount,
        asg_requiring_retry_count: retryCount,
        num_completed: completedCount,
        avg_score: avgScore,
        improved_count: 0
      };
    });

    const totalAssignments = assignments.length;
    const totalExpectedSubmissions = students.length * totalAssignments;
    const totalActualSubmissions = asgStats.reduce((acc, a) => acc + a.num_submitted, 0);
    const completionRate = totalExpectedSubmissions > 0 ? Math.round((totalActualSubmissions / totalExpectedSubmissions) * 1000) / 10 : 0;

    return {
      whole_class: {
        total_students: students.length,
        total_assignments: totalAssignments,
        total_submissions: totalActualSubmissions,
        class_completion_rate: completionRate,
        top_on_time: studentStats.slice().sort((a, b) => b.on_time_count - a.on_time_count),
        top_missing: studentStats.slice().sort((a, b) => b.num_missing - a.num_missing),
        top_late: studentStats.slice().sort((a, b) => b.late_count - a.late_count),
        top_improved: studentStats.slice().sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0))
      },
      assignment_stats: asgStats,
      student_stats: studentStats
    };
  }

  // --- Student Profile ---
  getStudentProfile(studentId) {
    const students = this.getStudents();
    const st = students.find(s => s.id == studentId);
    if (!st) return null;

    const assignments = this.getAssignments();
    const allEvents = this.getEvents().filter(e => e.student_id == studentId);

    const asgProfiles = assignments.map(asg => {
      const asgEvents = allEvents.filter(e => e.assignment_id == asg.id);
      const submits = asgEvents.filter(e => e.event_type.startsWith("SUBMIT_"));
      const grades = asgEvents.filter(e => e.event_type.startsWith("GRADE_"));
      const lastGrade = grades.length > 0 ? grades[grades.length - 1] : null;
      const firstScore = grades.length > 0 && grades[0].score !== null ? grades[0].score : null;
      const latestScore = lastGrade ? lastGrade.score : null;
      const retryCount = grades.filter(g => g.status === "Cần sửa" || g.status === "Cần nộp lại").length;
      const isLate = submits.length > 0 ? submits[0].is_late : false;

      let status = "Chưa nộp";
      let color = "red";
      if (submits.length === 0) {
        status = "Chưa nộp";
        color = "red";
      } else if (lastGrade) {
        status = lastGrade.status === "Đã đạt" ? "Đã đạt" : lastGrade.status;
        color = status === "Đã đạt" ? "green" : (status.includes("sửa") ? "yellow" : "red");
      } else {
        status = submits.length > 1 ? "Đã nộp lại" : (isLate ? "Nộp trễ" : "Đã nộp đúng hạn");
        color = isLate ? "orange" : "blue";
      }

      return {
        assignment_id: asg.id,
        id: asg.id,
        title: asg.title,
        assignment_title: asg.title,
        subject: asg.subject || "Bài tập",
        due_date: asg.due_date,
        submit_count: submits.length,
        attempt_number: submits.length,
        retry_count: retryCount,
        first_score: firstScore,
        latest_score: latestScore,
        status: status,
        latest_status: status,
        color: color,
        teacher_note: lastGrade ? lastGrade.teacher_note : null,
        score_change_delta: lastGrade ? lastGrade.score_change_delta : null,
        is_late: isLate,
        events: asgEvents
      };
    });

    const gradedList = asgProfiles.filter(a => a.latest_score !== null);
    const avgScore = gradedList.length > 0 ? Math.round((gradedList.reduce((acc, a) => acc + a.latest_score, 0) / gradedList.length) * 10) / 10 : null;

    return {
      student: st,
      assignments: asgProfiles,
      overall_avg_score: avgScore,
      total_completed: asgProfiles.filter(a => a.submit_count > 0).length,
      total_assigned: assignments.length
    };
  }

  // --- Submission History ---
  getSubmissionHistory(studentId, assignmentId) {
    const events = this.getEvents().filter(e => e.student_id == studentId && e.assignment_id == assignmentId);
    return events;
  }

  // --- Async Google Sheet Sync ---

  // =====================================================================
  // LIBRARY & READING RACE ENGINE ("3A7 – HÀNH TRÌNH ĐỌC SÁCH")
  // =====================================================================

  getBooks(query = "", category = "") {
    try {
      const raw = JSON.parse(localStorage.getItem("lms_books"));
      let list = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_BOOKS_3A7;
      if (category && category !== "all") {
        list = list.filter(b => b.category === category);
      }
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(b => 
          (b.title && b.title.toLowerCase().includes(q)) ||
          (b.author && b.author.toLowerCase().includes(q)) ||
          (b.contributed_by && b.contributed_by.toLowerCase().includes(q)) ||
          (b.code && b.code.toLowerCase().includes(q)) ||
          (String(b.stt) === q)
        );
      }
      return list;
    } catch {
      return DEFAULT_BOOKS_3A7;
    }
  }

  getBookById(id) {
    const list = this.getBooks();
    return list.find(b => b.id == id || b.stt == id) || null;
  }

  getBookByCode(codeOrStt) {
    if (!codeOrStt) return null;
    const clean = String(codeOrStt).trim().toUpperCase();
    const list = this.getBooks();
    return list.find(b => 
      (b.code && b.code.toUpperCase() === clean) || 
      String(b.stt) === clean ||
      (b.id && String(b.id) === clean)
    ) || null;
  }

  addBook(data) {
    const list = this.getBooks();
    const maxStt = list.length > 0 ? Math.max(...list.map(b => b.stt || 0)) : 0;
    const maxId = list.length > 0 ? Math.max(...list.map(b => b.id || 0)) : 0;
    const nextStt = maxStt + 1;
    const code = "SACH" + String(nextStt).padStart(3, "0");
    const newBook = {
      id: maxId + 1,
      stt: nextStt,
      code: code,
      title: (data.title || "").trim(),
      author: (data.author || "").trim(),
      category: data.category || "Truyện hay",
      shelf_code: data.shelf_code || "K1",
      contributed_by: (data.contributed_by || "Thư viện lớp").trim(),
      condition: data.condition || "Tốt",
      status: "available",
      created_at: this.nowStr()
    };
    list.push(newBook);
    localStorage.setItem("lms_books", JSON.stringify(list));
    return newBook;
  }

  updateBook(id, data) {
    const list = this.getBooks();
    const idx = list.findIndex(b => b.id == id || b.stt == id);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], data);
    localStorage.setItem("lms_books", JSON.stringify(list));
    return list[idx];
  }

  deleteBook(id) {
    const list = this.getBooks().filter(b => b.id != id && b.stt != id);
    localStorage.setItem("lms_books", JSON.stringify(list));
    return true;
  }

  resetBooksToDefault() {
    localStorage.setItem("lms_books", JSON.stringify(DEFAULT_BOOKS_3A7));
    return DEFAULT_BOOKS_3A7;
  }

  importBooksFromRows(rows, replace = false) {
    let list = replace ? [] : this.getBooks();
    const startStt = list.length > 0 ? Math.max(...list.map(b => Number(b.stt) || 0)) + 1 : 1;
    let nextId = list.length > 0 ? Math.max(...list.map(b => Number(b.id) || 0)) + 1 : 1;
    let curStt = startStt;

    const imported = [];
    for (const r of rows) {
      const title = (r.title || "").trim();
      if (!title) continue;
      const code = `SACH${String(curStt).padStart(3, '0')}`;
      const item = {
        id: nextId++,
        stt: curStt++,
        code: code,
        title: title,
        author: (r.author || "").trim(),
        category: (r.category || "Truyện hay").trim() || "Truyện hay",
        shelf_code: (r.shelf_code || "K1").trim() || "K1",
        contributed_by: (r.contributed_by || "Thư viện lớp").trim() || "Thư viện lớp",
        condition: (r.condition || "Tốt").trim() || "Tốt",
        status: "available"
      };
      list.push(item);
      imported.push(item);
    }

    if (replace) {
      localStorage.setItem("lms_loans", JSON.stringify([]));
    }
    localStorage.setItem("lms_books", JSON.stringify(list));
    return { count: imported.length, books: imported };
  }

  getStudentReadingSummary(studentIdOrCode) {
    const students = this.getStudents();
    const cleanSC = String(studentIdOrCode).trim().toUpperCase();
    const st = students.find(s => String(s.id) === cleanSC || (s.code && s.code.toUpperCase() === cleanSC));
    if (!st) return null;

    const race = this.getReadingRace();
    const myRace = race.find(r => r.student_id == st.id || r.code === st.code) || {
      student_id: st.id,
      code: st.code,
      name: st.full_name,
      order_num: st.order_num,
      completed: 0,
      avatar: "🐶",
      rank: race.length + 1,
      percentage: 0
    };

    const activeLoans = this.getActiveLoans().filter(l => l.student_id == st.id || l.student_code === st.code);
    const asgs = this.getAssignments();
    const events = this.getEvents();

    const submittedAsgIds = new Set(events.filter(e => e.student_id == st.id && (e.event_type === 'submit' || e.event_type === 'resubmit')).map(e => e.assignment_id));
    const passedAsgIds = new Set(events.filter(e => e.student_id == st.id && e.event_type === 'grade' && (e.status === 'Đã đạt' || (e.score !== null && e.score >= 8.0))).map(e => e.assignment_id));

    return {
      student: st,
      race: myRace,
      active_loans: activeLoans,
      stats: {
        total_assignments: asgs.length,
        submitted_assignments: submittedAsgIds.size,
        passed_assignments: passedAsgIds.size,
        completed_books: myRace.completed,
        target_books: 33,
        milestone_15: 15,
        percentage: myRace.percentage,
        rank: myRace.rank
      }
    };
  }

  borrowBook(studentIdOrCode, bookIdOrCode, dueDays = 14, notes = "") {
    const students = this.getStudents();
    const cleanSC = String(studentIdOrCode).trim().toUpperCase();
    const student = students.find(s => 
      String(s.id) === cleanSC || 
      (s.code && s.code.toUpperCase() === cleanSC) ||
      (s.full_name && s.full_name.toLowerCase() === cleanSC.toLowerCase())
    );
    if (!student) throw new Error("Không tìm thấy học sinh: " + studentIdOrCode);

    const book = this.getBookByCode(bookIdOrCode) || this.getBookById(bookIdOrCode);
    if (!book) throw new Error("Không tìm thấy sách: " + bookIdOrCode);

    if (book.status === "borrowed") {
      throw new Error("Cuốn sách '" + book.title + "' hiện đang được mượn, chưa trả về thư viện!");
    }

    const now = new Date();
    const due = new Date(now.getTime() + dueDays * 86400 * 1000);
    const borrowDateStr = now.toISOString().replace("T", " ").substring(0, 19);
    const dueDateStr = due.toISOString().replace("T", " ").substring(0, 19);

    const loans = this.getLoanHistory();
    const newId = loans.length > 0 ? Math.max(...loans.map(l => l.id || 0)) + 1 : 1;
    const loan = {
      id: newId,
      book_id: book.id,
      book_stt: book.stt,
      book_code: book.code,
      book_title: book.title,
      student_id: student.id,
      student_code: student.code,
      student_name: student.full_name,
      borrow_date: borrowDateStr,
      due_date: dueDateStr,
      return_date: null,
      status: "borrowed",
      notes: notes || ""
    };
    loans.unshift(loan);
    localStorage.setItem("lms_loans", JSON.stringify(loans));

    // Update book status
    this.updateBook(book.id, { status: "borrowed" });

    return loan;
  }

  returnBook(bookIdOrCode, notes = "") {
    const book = this.getBookByCode(bookIdOrCode) || this.getBookById(bookIdOrCode);
    if (!book) throw new Error("Không tìm thấy sách: " + bookIdOrCode);

    const loans = this.getLoanHistory();
    const loanIdx = loans.findIndex(l => 
      (l.book_id == book.id || l.book_code === book.code || l.book_stt == book.stt) && 
      l.status === "borrowed"
    );

    const returnDateStr = this.nowStr();
    let studentInfo = { id: null, name: "Chưa rõ", code: "" };

    if (loanIdx !== -1) {
      loans[loanIdx].status = "returned";
      loans[loanIdx].return_date = returnDateStr;
      if (notes) loans[loanIdx].notes = notes;
      studentInfo = {
        id: loans[loanIdx].student_id,
        name: loans[loanIdx].student_name,
        code: loans[loanIdx].student_code
      };
      localStorage.setItem("lms_loans", JSON.stringify(loans));
    }

    // Update book status
    this.updateBook(book.id, { status: "available" });

    return {
      success: true,
      book_id: book.id,
      book_title: book.title,
      book_code: book.code,
      student_id: studentInfo.id,
      student_name: studentInfo.name,
      student_code: studentInfo.code,
      return_date: returnDateStr
    };
  }

  getLoanHistory() {
    try {
      return JSON.parse(localStorage.getItem("lms_loans")) || [];
    } catch {
      return [];
    }
  }

  getActiveLoans() {
    const loans = this.getLoanHistory();
    const nowStr = this.nowStr();
    return loans.filter(l => l.status === "borrowed").map(l => {
      l.is_overdue = l.due_date && l.due_date < nowStr;
      return l;
    });
  }

  getReadingRace() {
    const students = this.getStudents();
    let rawRace = [];
    try {
      rawRace = JSON.parse(localStorage.getItem("lms_reading_race")) || DEFAULT_READING_RACE;
    } catch {
      rawRace = DEFAULT_READING_RACE;
    }

    const petAvatars = ['🐶', '🐱', '🦊', '🐰', '🐼', '🦁', '🐯', '🐨', '🦄', '🐸',
                        '🐵', '🐻', '🐧', '🐤', '🦉', '🐺', '🐗', '🐴', '🐝', '🐙',
                        '🦋', '🐢', '🐬', '🐳', '🦖', '🦔', '🐿️', '🦩', '🦚'];

    const list = students.map((s, idx) => {
      const match = rawRace.find(r => r.student_id == s.id || r.code === s.code);
      const completed = match ? Number(match.completed) || 0 : 0;
      const avatar = (match && match.avatar) ? match.avatar : petAvatars[idx % petAvatars.length];
      const lastUpdated = match ? match.last_updated : s.created_at;
      return {
        student_id: s.id,
        code: s.code,
        name: s.full_name,
        order_num: s.order_num || idx + 1,
        completed: completed,
        avatar: avatar,
        last_updated: lastUpdated
      };
    });

    // Sort by completed desc, then order_num asc
    list.sort((a, b) => {
      if (b.completed !== a.completed) return b.completed - a.completed;
      return a.order_num - b.order_num;
    });

    // Compute ranks with ties
    let currentRank = 1;
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].completed < list[i - 1].completed) {
        currentRank = i + 1;
      }
      list[i].rank = currentRank;
      list[i].percentage = Math.min(100, Math.round((list[i].completed / 33) * 1000) / 10);
    }

    return list;
  }

  updateReadingRace(studentIdOrCode, delta = 1, setCompleted = null, newAvatar = null) {
    const students = this.getStudents();
    const cleanSC = String(studentIdOrCode).trim().toUpperCase();
    const student = students.find(s => String(s.id) === cleanSC || (s.code && s.code.toUpperCase() === cleanSC));
    if (!student) throw new Error("Không tìm thấy học sinh: " + studentIdOrCode);

    let raceList = [];
    try {
      raceList = JSON.parse(localStorage.getItem("lms_reading_race")) || DEFAULT_READING_RACE;
    } catch {
      raceList = DEFAULT_READING_RACE;
    }

    let entry = raceList.find(r => r.student_id == student.id || r.code === student.code);
    if (!entry) {
      entry = {
        student_id: student.id,
        code: student.code,
        completed: 0,
        avatar: '🐶',
        last_updated: this.nowStr()
      };
      raceList.push(entry);
    }

    if (setCompleted !== null && setCompleted !== undefined) {
      entry.completed = Math.max(0, parseInt(setCompleted) || 0);
    } else {
      entry.completed = Math.max(0, (entry.completed || 0) + delta);
    }

    if (newAvatar) {
      entry.avatar = newAvatar;
    }

    entry.last_updated = this.nowStr();
    localStorage.setItem("lms_reading_race", JSON.stringify(raceList));
    return this.getReadingRace();
  }

  getLibraryStats() {
    const books = this.getBooks();
    const loans = this.getActiveLoans();
    const students = this.getStudents();
    const race = this.getReadingRace();

    const categories = {};
    for (const b of books) {
      const cat = b.category || "Khác";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    const totalRead = race.reduce((sum, r) => sum + (r.completed || 0), 0);

    return {
      totalBooks: books.length,
      borrowedCount: loans.length,
      readersCount: students.length,
      overdueCount: loans.filter(l => l.is_overdue).length,
      totalCompletedReadings: totalRead,
      categories: categories
    };
  }

  async syncToGoogleSheet(payload) {
    const settings = this.getSettings();
    const url = settings.google_sheet_url;
    if (!url || settings.auto_sync_sheets !== "true") return;

    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({
          class_name: settings.class_name,
          teacher_name: settings.teacher_name
        }, payload))
      });
      console.log("[ClientDB]: Synced event to Google Sheet Web App via webhook.");
    } catch (e) {
      console.warn("[ClientDB]: Could not sync event to Google Sheet:", e);
    }
  }
}

// Attach globally
window.ClientDB = new ClientDBEngine();
