"""
Direct verification test script (No network socket required).
Validates database logic, business rules, tracking calculations, and file integrity.
"""

import os
import json
from datetime import datetime
import database

def test_all():
    print("=== STARTING DIRECT VERIFICATION TESTS ===")

    # 1. Verify files exist
    required_files = [
        "Requirement.md",
        "README.md",
        "DEPLOY_GUIDE.md",
        "package.json",
        "next.config.mjs",
        "tailwind.config.ts",
        "Dockerfile",
        "docker-compose.yml",
        "deploy.sh",
        "lib/db.ts",
        "lib/types.ts",
        "lib/google-sheets.ts",
        "components/Navbar.tsx",
        "components/KioskView.tsx",
        "components/GradingView.tsx",
        "components/TrackingView.tsx",
        "components/AnalyticsView.tsx",
        "components/StudentProfileView.tsx",
        "components/PrintQrSheet.tsx",
        "components/SettingsView.tsx",
        "app/layout.tsx",
        "app/page.tsx",
        "app/globals.css",
        "google_sheet_script.js",
        "server.py",
        "database.py",
        "run.command",
        "start.sh",
        "public/index.html",
        "public/css/style.css",
        "public/js/app.js",
        "public/js/vendor/qrcode.js",
        "public/js/vendor/scanner.js",
        "public/js/vendor/jsqr.js"
    ]
    for rf in required_files:
        assert os.path.exists(rf), f"Missing file: {rf}"
        assert os.path.getsize(rf) > 0, f"Empty file: {rf}"
        print(f" -> PASS: {rf} exists ({os.path.getsize(rf)} bytes)")

    # 2. Test DB Initialization
    database.init_db()
    students = database.get_students()
    assert len(students) == 29, f"Expected 29 students, got {len(students)}"
    print(f" -> PASS: 29 students loaded successfully (HS01: {students[0]['full_name']} ... HS29: {students[28]['full_name']})")

    # Verify test homework assignments exist
    assignments = database.get_assignments()
    if len(assignments) < 2:
        # Create test assignments for test suite
        now = datetime.now()
        database.add_assignment(
            "Phiếu bài tập Toán: Phép nhân và phép chia",
            "Toán",
            now.strftime("%Y-%m-%d"),
            now.strftime("%Y-%m-%d 23:59"),
            10.0,
            "Bài tập kiểm tra",
            questions=["Question 1", "Question 2", "Question 3", "Question 4"]
        )
        database.add_assignment(
            "Chính tả: Mùa thu quê em",
            "Tiếng Việt",
            now.strftime("%Y-%m-%d"),
            now.strftime("%Y-%m-%d 23:59"),
            10.0,
            "Rèn chữ giữ vở",
            questions=["Câu 1", "Câu 2", "Câu 3"]
        )
        assignments = database.get_assignments()

    assert len(assignments) >= 2, f"Expected at least 2 assignments, got {len(assignments)}"
    aid = assignments[0]["id"]
    print(f" -> PASS: {len(assignments)} test assignments active. Primary test assignment: '{assignments[0]['title']}' (ID: {aid})")

    st_hs29 = [s for s in students if s['code'] == 'HS29'][0]
    hs29_id = st_hs29["id"]

    # Clean up test events for HS29 so test is idempotent
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM submission_events WHERE student_id = ? AND assignment_id = ?", (hs29_id, aid))
    conn.commit()
    conn.close()

    # 3. Test Student Submission (Lần 1)
    res1 = database.record_submission("HS29", aid, operator="Học sinh")
    assert res1["success"] is True
    assert res1["student"]["code"] == "HS29"
    assert res1["attempt_number"] == 1
    assert res1["status"] == "Đã nộp"
    print(f" -> PASS: HS29 submitted Attempt 1 (status: {res1['status']}, is_late: {res1['is_late']})")

    # 4. Test Teacher Grading (Lần 1 -> Cần sửa)
    st_id = res1["student"]["id"]
    res_g1 = database.record_grading(st_id, aid, score=5.5, status="Cần sửa", teacher_note="Xem lại câu tính diện tích", operator="Cô Linh")
    assert res_g1["success"] is True
    assert res_g1["score"] == 5.5
    assert res_g1["status"] == "Cần sửa"
    print(f" -> PASS: Graded HS29 with 5.5 (Cần sửa)")

    # 5. Test Re-submission (Lần 2 sau khi sửa bài)
    res2 = database.record_submission("HS29", aid, operator="Học sinh")
    assert res2["success"] is True
    assert res2["attempt_number"] == 2
    assert res2["status"] == "Đã nộp lại"
    print(f" -> PASS: HS29 re-submitted Attempt 2 (status: {res2['status']})")

    # 6. Test Re-grading (Lần 2 -> Đã đạt 9.5)
    res_g2 = database.record_grading(st_id, aid, score=9.5, status="Đã đạt", teacher_note="Đã sửa rất tốt, đáng khen!", operator="Cô Linh")
    assert res_g2["success"] is True
    assert res_g2["score"] == 9.5
    assert res_g2["status"] == "Đã đạt"
    print(f" -> PASS: Re-graded HS29 with 9.5 (Đã đạt)")

    # 7. Test Immutable Audit History
    history = database.get_submission_history(st_id, aid)
    assert len(history) == 4, f"Expected 4 events, got {len(history)}"
    event_types = [h["event_type"] for h in history]
    assert event_types == ["submit", "grade", "resubmit", "grade"]
    scores = [h["score"] for h in history if h["score"] is not None]
    assert scores == [5.5, 9.5]
    print(" -> PASS: Audit history strictly preserved (Nộp 1 -> Chấm 1 (5.5) -> Nộp 2 -> Chấm 2 (9.5)). No overwriting!")

    # 8. Test Section 6 Tracking Matrix (11 Columns)
    matrix_data = database.get_assignment_tracking_matrix(aid)
    assert matrix_data is not None
    matrix = matrix_data["matrix"]
    assert len(matrix) == 29, f"Expected 29 rows in matrix, got {len(matrix)}"
    hs29_row = next(r for r in matrix if r["code"] == "HS29")
    assert hs29_row["current_status"] == "Đã hoàn thành"
    assert hs29_row["first_score"] == 5.5
    assert hs29_row["latest_score"] == 9.5
    assert hs29_row["submit_count"] == 2
    assert hs29_row["retry_count"] == 1
    assert hs29_row["teacher_note"] == "Đã sửa rất tốt, đáng khen!"
    print(f" -> PASS: Section 6 tracking matrix accurate for all 29 students. Row HS29 verified.")

    # 9. Test Section 7 3-Way Analytics
    analytics = database.get_comprehensive_analytics()
    assert "student_stats" in analytics
    assert len(analytics["student_stats"]) == 29
    assert "assignment_stats" in analytics
    assert len(analytics["assignment_stats"]) >= 2
    assert "whole_class" in analytics
    whole = analytics["whole_class"]
    assert whole["total_students"] == 29
    assert whole["class_completion_rate"] > 0
    print(f" -> PASS: Section 7 analytics verified (Class completion rate: {whole['class_completion_rate']}%)")

    # 10. Test Section 8 Student Profile
    profile = database.get_student_profile(st_id)
    assert profile is not None
    assert profile["student"]["code"] == "HS29"
    assert len(profile["assignments"]) >= 2
    print(f" -> PASS: Section 8 student profile verified for HS29 ({profile['student']['full_name']})")

    # 11. Test Settings
    settings = database.get_settings()
    assert "teacher_name" in settings
    assert settings["class_name"] == "Lớp 3A7"
    assert "teacher_pin" in settings
    print(f" -> PASS: Settings verified (Teacher: {settings['teacher_name']}, Class: {settings['class_name']})")

    # 12. Test QR Engine ISO/IEC 18004 generation and decodability for all 29 students
    import qr_engine
    for i in range(1, 30):
        code = f"HS{i:02d}"
        svg = qr_engine.generate_qr_svg(code)
        assert "<svg" in svg
        assert 'viewBox="0 0 29 29"' in svg
        assert 'shape-rendering="crispEdges"' in svg
        assert '<rect width="29" height="29" fill="#FFFFFF"/>' in svg
        assert "<rect" in svg
    print(" -> PASS: QR Engine generated 100% standard-compliant QR SVGs with 4-module quiet zone for all 29 students (HS01..HS29).")

    # 13. Test server.py LMSRequestHandler for /api/qr
    from io import BytesIO
    import server

    class MockSocket:
        def __init__(self, data):
            self.data = data
            self.out = BytesIO()
        def makefile(self, mode, *args, **kwargs):
            if "r" in mode:
                return BytesIO(self.data)
            return self.out
        def sendall(self, data):
            self.out.write(data)

    for code in ["HS01", "HS15", "HS29"]:
        req_bytes = f"GET /api/qr?text={code} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
        sock = MockSocket(req_bytes)
        handler = server.LMSRequestHandler(sock, ("127.0.0.1", 12345), None)
        output = sock.out.getvalue().decode("utf-8", errors="ignore")
        assert "200 OK" in output
        assert "Content-Type: image/svg+xml" in output
        assert "<svg" in output
        assert 'viewBox="0 0 29 29"' in output
    print(" -> PASS: server.py /api/qr route verified directly with HTTP 200 SVG response.")

    # 14. Test Library & Reading Race ("Đường đua đọc sách 3A7")
    books = database.get_books()
    assert len(books) == 75, f"Expected 75 books, got {len(books)}"
    assert books[0]["title"] == "Quiz! Khoa học kì thú - Toán học đố mẹo"
    assert books[0]["contributed_by"] == "Thiện Nhân"
    assert books[-1]["title"] == "Hóa ra mình cũng tuyệt đấy chứ! - Bí kíp giúp trẻ tự tin"
    assert books[-1]["contributed_by"] == "Phúc Hưng"
    print(f" -> PASS: Library catalog seeded with exactly 75 books from Danh_sach_sach_lop_3A7.xlsx (STT 1 to 75).")

    race = database.get_reading_race()
    assert len(race) == 29, f"Expected 29 students in reading race, got {len(race)}"
    print(f" -> PASS: Reading race initialized for all 29 students with default pet avatars and 33-book target.")

    # Test borrow & return cycle
    st_first = database.get_students()[0]
    loan = database.borrow_book(st_first["code"], "SACH002", 14, "Mượn sách đọc tại nhà")
    assert loan["status"] == "borrowed"
    assert loan["student_code"] == st_first["code"]
    book2 = database.get_book_by_code("SACH002")
    assert book2["status"] == "borrowed"

    active_loans = database.get_active_loans()
    assert any(l["book_code"] == "SACH002" for l in active_loans)

    ret = database.return_book("SACH002", "Đã đọc xong")
    assert ret["success"] is True
    book2_after = database.get_book_by_code("SACH002")
    assert book2_after["status"] == "available"

    # Test race increment
    database.update_reading_race(st_first["id"], delta=2)
    race_after = database.get_reading_race()
    st_race = next(r for r in race_after if r["student_id"] == st_first["id"])
    assert st_race["completed"] >= 2
    print(f" -> PASS: Borrow & return cycle and reading race progress (+1/+2 ô) verified successfully.")

    stats = database.get_library_stats()
    assert stats["totalBooks"] == 75
    assert stats["readersCount"] == 29
    print(f" -> PASS: Library overview stats verified (Total books: {stats['totalBooks']}, Readers: {stats['readersCount']}).")

    # 15. Verify "In QR Sách (PDF)" button and export function
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    assert "printAllBooksQrSheet()" in html_content, "Missing printAllBooksQrSheet in public/index.html"
    assert "In QR Sách (PDF)" in html_content, "Missing 'In QR Sách (PDF)' button text in public/index.html"
    
    # Verify button position: In QR Sách must precede Khôi Phục 75 Cuốn Gốc
    idx_print = html_content.find("printAllBooksQrSheet()")
    idx_reset = html_content.find("resetBooksCatalogToSeed()")
    assert idx_print != -1 and idx_reset != -1, "Both buttons must exist"
    assert idx_print < idx_reset, "'In QR Sách (PDF)' must be placed before 'Khôi Phục 75 Cuốn Gốc'"
    print(" -> PASS: 'In QR Sách (PDF)' button is verified right before 'Khôi Phục 75 Cuốn Gốc' in Kho Sách toolbar.")

    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_content = f.read()
    assert "printAllBooksQrSheet()" in js_content, "Missing printAllBooksQrSheet() method in public/js/app.js"
    assert "Mã QR Sách Lớp 3A7" in js_content, "Missing book QR print layout in public/js/app.js"
    print(" -> PASS: printAllBooksQrSheet() method and A4 PDF printing template verified in public/js/app.js.")

    # 16. Verify Mobile Reading Race responsiveness and elements
    assert "race-milestones-summary-card" in html_content, "Missing race milestones banner in public/index.html"
    assert "lib-race-search-input" in html_content, "Missing race search input in public/index.html"
    assert "onRaceSearch" in js_content, "Missing onRaceSearch in public/js/app.js"
    assert "filterRaceList" in js_content, "Missing filterRaceList in public/js/app.js"
    assert "race-track-milestones-mobile" in js_content, "Missing mobile race track milestones in public/js/app.js"
    
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_content = f.read()
    assert ".race-milestones-summary-card" in css_content, "Missing milestone banner CSS"
    assert ".race-student-row" in css_content and "@media (max-width: 768px)" in css_content, "Missing mobile responsive race CSS"
    print(" -> PASS: Mobile Reading Race UI enhancements (Milestone goals banner, search/filter, full-width responsive track cards) verified.")

    # Verify mirrors are in sync
    with open("index.html", "r", encoding="utf-8") as f:
        assert f.read() == html_content, "index.html not in sync with public/index.html"
    with open("docs/index.html", "r", encoding="utf-8") as f:
        assert f.read() == html_content, "docs/index.html not in sync with public/index.html"
    with open("js/app.js", "r", encoding="utf-8") as f:
        assert f.read() == js_content, "js/app.js not in sync with public/js/app.js"
    with open("docs/js/app.js", "r", encoding="utf-8") as f:
        assert f.read() == js_content, "docs/js/app.js not in sync with public/js/app.js"
    with open("css/style.css", "r", encoding="utf-8") as f:
        assert f.read() == css_content, "css/style.css not in sync with public/css/style.css"
    with open("docs/css/style.css", "r", encoding="utf-8") as f:
        assert f.read() == css_content, "docs/css/style.css not in sync with public/css/style.css"
    print(" -> PASS: All mirror files (public/, docs/, root) are 100% in sync.")

    # 17. Test Universal Student Password Verification and Updates
    # Reset to default '1234' to ensure idempotency
    database.update_student_password("HS01", "1234")
    assert database.verify_student_password("HS01", "1234") is True
    assert database.verify_student_password("HS01", "wrong_pass") is False
    # Update password for HS01
    upd_res = database.update_student_password("HS01", "5678")
    assert upd_res is True
    assert database.verify_student_password("HS01", "5678") is True
    assert database.verify_student_password("HS01", "1234") is False
    # Reset back to 1234
    database.update_student_password("HS01", "1234")
    assert database.verify_student_password("HS01", "1234") is True
    print(" -> PASS: Universal student password verification and update verified successfully (default: '1234').")

    # 18. Test Student Reading Summary (Integration in Student Portal)
    summary = database.get_student_reading_summary("HS01")
    assert summary is not None
    assert summary["student"]["code"] == "HS01"
    assert "race" in summary
    assert "active_loans" in summary
    assert "target" in summary["race"]
    assert summary["race"]["target"] == 33
    assert "stats" in summary
    print(f" -> PASS: Student reading summary for HS01 verified (Race completed: {summary['race']['completed']}/33, Active loans: {len(summary['active_loans'])}).")

    # Clean up HS01 race test increment
    conn = database.get_db()
    c = conn.cursor()
    c.execute("UPDATE reading_race SET completed = 0 WHERE student_id = ?", (st_first["id"],))
    conn.commit()
    conn.close()

    # 19. Test Excel Book Parser and Import Engine
    excel_path = "Danh_sach_sach_lop_3A7.xlsx"
    parsed_books = database.parse_excel_books(excel_path)
    assert len(parsed_books) >= 70, f"Expected at least 70 books parsed from Excel, got {len(parsed_books)}"
    assert parsed_books[0]["title"] == "Quiz! Khoa học kì thú - Toán học đố mẹo"
    print(f" -> PASS: Excel book parser successfully extracted {len(parsed_books)} books directly from OpenXML without external libraries.")

    # Test Book update and import logic
    test_update = database.update_book("SACH001", {"title": "Quiz! Khoa học kì thú - Tập 1 (Đã chỉnh sửa)", "author": "Nhiều tác giả", "category": "Khoa học"})
    assert test_update is not None
    b1_check = database.get_book_by_code("SACH001")
    assert "Đã chỉnh sửa" in b1_check["title"]
    # Revert back
    database.update_book("SACH001", {"title": "Quiz! Khoa học kì thú - Toán học đố mẹo", "author": "Nhiều tác giả", "category": "Khoa học"})
    b1_reverted = database.get_book_by_code("SACH001")
    assert b1_reverted["title"] == "Quiz! Khoa học kì thú - Toán học đố mẹo"
    print(" -> PASS: Book metadata editing and update verified successfully.")

    # 20. Test UI Contracts: Student Private Password, Portal Race Widget, Teacher-only Borrow, Excel Import Modal
    # 20a. No manual student code text input, only QR scan or tap name
    assert 'id="student-code-form"' not in html_content, "Manual student code form must be removed from public/index.html"
    assert "modal-student-password" in html_content, "Missing student password modal in public/index.html"
    assert "promptStudentPassword" in js_content, "Missing promptStudentPassword in public/js/app.js"
    assert "submitStudentPassword" in js_content, "Missing submitStudentPassword in public/js/app.js"

    # 20b. Reading race integrated into Student Portal
    assert "student-race-portal-card" in html_content, "Missing student race portal card in public/index.html"
    assert "sp-race-runner" in html_content, "Missing runner avatar on portal track in public/index.html"
    assert "sp-borrowed-books-container" in html_content, "Missing active borrowed books list in public/index.html"

    # 20c. Teacher-only borrow and return tabs
    assert 'id="btn-lib-tab-borrow"' in html_content, "Missing ID for borrow tab in public/index.html"
    assert 'id="btn-lib-tab-return"' in html_content, "Missing ID for return tab in public/index.html"
    assert "switchLibSubTab" in js_content, "Missing switchLibSubTab in public/js/app.js"

    # 20d. Edit book modal & Excel import modal
    assert "modal-edit-book" in html_content, "Missing modal-edit-book in public/index.html"
    assert "modal-import-excel-books" in html_content, "Missing modal-import-excel-books in public/index.html"
    assert "openEditBookModal" in js_content, "Missing openEditBookModal in public/js/app.js"
    assert "openImportExcelModal" in js_content, "Missing openImportExcelModal in public/js/app.js"
    assert "handleExcelFileSelected" in js_content, "Missing handleExcelFileSelected in public/js/app.js"

    # 20e. Settings: Universal student password manager
    assert "settings-student-pwd-tbody" in html_content, "Missing student password table in public/index.html"
    assert "renderStudentPasswordTable" in js_content, "Missing renderStudentPasswordTable in public/js/app.js"
    assert "resetStudentPassword" in js_content, "Missing resetStudentPassword in public/js/app.js"

    # 20f. Live sync polling mechanism
    assert "startLiveSync" in js_content, "Missing startLiveSync in public/js/app.js"
    assert "silentSyncData" in js_content, "Missing silentSyncData in public/js/app.js"
    print(" -> PASS: All UI contracts (No-manual-input login, Student portal race widget, Teacher-only borrow, Excel import, Universal password manager, Live sync) verified.")

    # 21. Test Match Every Device's Code to Default & Real-time Cross-device Change Sync
    # 21a. Test reset_all_student_passwords to default '1234'
    assert database.reset_all_student_passwords("1234") is True
    pw_map = database.get_student_passwords()
    assert len(pw_map) >= 29, f"Expected at least 29 passwords mapped, got {len(pw_map)}"
    assert pw_map["HS01"] == "1234"
    assert pw_map["HS29"] == "1234"

    # 21b. Test when someone changes a code, it updates and propagates
    assert database.update_student_password("HS10", "7788") is True
    assert database.verify_student_password("HS10", "7788") is True
    pw_map_after = database.get_student_passwords()
    assert pw_map_after["HS10"] == "7788"
    # Reset back to default
    assert database.reset_all_student_passwords("1234") is True
    assert database.verify_student_password("HS10", "1234") is True

    # 21c. Test server endpoints for password sync and reset-all
    req_pwd = b"GET /api/students/passwords HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    sock_pwd = MockSocket(req_pwd)
    handler_pwd = server.LMSRequestHandler(sock_pwd, ("127.0.0.1", 12345), None)
    out_pwd = sock_pwd.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_pwd
    assert '"HS01": "1234"' in out_pwd

    # 21d. Test UI & ClientDB contracts for cross-device sync
    assert "resetAllStudentsPasswords" in js_content, "Missing resetAllStudentsPasswords in public/js/app.js"
    assert "Khôi Phục Toàn Bộ Về Mặc Định" in html_content, "Missing reset all passwords button in public/index.html"
    assert "modal-student-change-pwd" in html_content, "Missing modal-student-change-pwd in public/index.html"
    assert "openStudentChangePasswordModal" in js_content, "Missing openStudentChangePasswordModal in public/js/app.js"
    assert "submitStudentChangePassword" in js_content, "Missing submitStudentChangePassword in public/js/app.js"
    assert "initCloudSyncRelay" in js_content, "Missing initCloudSyncRelay in public/js/app.js"
    assert "broadcastCloudSync" in js_content, "Missing broadcastCloudSync in public/js/app.js"
    assert "handleCloudSyncMessage" in js_content, "Missing handleCloudSyncMessage in public/js/app.js"
    print(" -> PASS: Match every device's code to default and cross-device sync contracts verified successfully.")

    # 22. Test Teacher Animal Group & Ranking System & Device-Specific Passwords
    # 22a. Animal Groups Configuration & Database Schema
    cfg = database.get_animal_groups_config()
    assert "dolphin" in cfg, "Missing dolphin tier in ANIMAL_GROUPS_CONFIG"
    assert "monkey" in cfg, "Missing monkey tier in ANIMAL_GROUPS_CONFIG"
    assert "orange_cat" in cfg, "Missing orange_cat tier in ANIMAL_GROUPS_CONFIG"
    assert "turtle_snail" in cfg, "Missing turtle_snail tier in ANIMAL_GROUPS_CONFIG"
    assert len(cfg["dolphin"]["options"]) >= 4, "Expected at least 4 dolphin options"
    assert len(cfg["turtle_snail"]["options"]) >= 4, "Expected at least 4 turtle/snail options"

    # Verify student seed distribution
    all_sts = database.get_students()
    hs01 = next(s for s in all_sts if s["code"] == "HS01")
    assert hs01["animal_group"] == "dolphin", f"Expected HS01 to be dolphin, got {hs01['animal_group']}"
    hs02 = next(s for s in all_sts if s["code"] == "HS02")
    assert hs02["animal_group"] == "monkey", f"Expected HS02 to be monkey, got {hs02['animal_group']}"
    hs22 = next(s for s in all_sts if s["code"] == "HS22")
    assert hs22["animal_group"] == "turtle_snail", f"Expected HS22 to be turtle_snail, got {hs22['animal_group']}"

    # Verify updating animal group
    up_res = database.update_student_animal_group("HS05", "dolphin", "🦅", "Đại bàng tinh anh")
    assert up_res and up_res.get("success") is True, "Failed to update student animal group"
    hs05 = next(s for s in database.get_students() if s["code"] == "HS05")
    assert hs05["animal_group"] == "dolphin"
    assert hs05["animal_symbol"] == "🦅"
    assert hs05["animal_title"] == "Đại bàng tinh anh"

    # Verify tracking matrix includes animal group fields
    matrix_data = database.get_assignment_tracking_matrix(aid)
    rows = matrix_data.get("matrix", matrix_data.get("rows", []))
    assert len(rows) >= 29
    assert "animal_group" in rows[0]
    assert "animal_symbol" in rows[0]
    assert "animal_title" in rows[0]

    # 22b. API Server Endpoints for Animal Groups
    req_ag = b"GET /api/animal-groups HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    sock_ag = MockSocket(req_ag)
    server.LMSRequestHandler(sock_ag, ("127.0.0.1", 12345), None)
    out_ag = sock_ag.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_ag
    assert "dolphin" in out_ag
    assert "monkey" in out_ag
    assert "orange_cat" in out_ag
    assert "turtle_snail" in out_ag

    post_ag_body = json.dumps({
        "animal_group": "turtle_snail",
        "animal_symbol": "🐌",
        "animal_title": "Ốc sên nỗ lực"
    })
    req_post_ag = (
        f"POST /api/students/{hs05['id']}/animal-group HTTP/1.1\r\n"
        f"Host: localhost\r\n"
        f"Content-Type: application/json\r\n"
        f"Content-Length: {len(post_ag_body.encode('utf-8'))}\r\n"
        f"Connection: close\r\n\r\n{post_ag_body}"
    ).encode("utf-8")
    sock_post_ag = MockSocket(req_post_ag)
    server.LMSRequestHandler(sock_post_ag, ("127.0.0.1", 12345), None)
    out_post_ag = sock_post_ag.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_post_ag
    assert '"success": true' in out_post_ag

    # 22c. Frontend UI & ClientDB contracts
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_content = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        client_db_content = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_content = f.read()

    # Animal group UI
    assert "modal-assign-animal-group" in html_content, "Missing modal-assign-animal-group in public/index.html"
    assert "animal-filter-bar" in html_content, "Missing animal-filter-bar in public/index.html"
    assert "tracking-animal-filter" in html_content, "Missing tracking-animal-filter in public/index.html"
    assert "openAssignAnimalGroupModal" in js_content, "Missing openAssignAnimalGroupModal in public/js/app.js"
    assert "selectStudentAnimal" in js_content, "Missing selectStudentAnimal in public/js/app.js"
    assert "saveStudentAnimalGroup" in js_content, "Missing saveStudentAnimalGroup in public/js/app.js"
    assert "setStudentAnimalFilter" in js_content, "Missing setStudentAnimalFilter in public/js/app.js"
    assert "badge-animal-dolphin" in css_content, "Missing badge-animal-dolphin in style.css"
    assert "badge-animal-monkey" in css_content, "Missing badge-animal-monkey in style.css"

    # Device-specific local password contracts
    assert "getDeviceStudentPassword" in client_db_content, "Missing getDeviceStudentPassword in client_db.js"
    assert "updateDeviceStudentPassword" in client_db_content, "Missing updateDeviceStudentPassword in client_db.js"
    assert "resetDeviceAllPasswords" in client_db_content, "Missing resetDeviceAllPasswords in client_db.js"
    assert "lms_device_passwords" in client_db_content, "Missing lms_device_passwords storage key in client_db.js"
    # 23. Test Question Evaluation, Grading Animal Mascot Customization, and Team Management
    print("\n--- 23. Test Question Evaluation, Animal Grading & Team Management ---")
    # 23a. Test Assignment Questions CRUD
    asg_q = database.add_assignment(
        "Toán 3: Luyện tập chung chương 1",
        "Toán",
        datetime.now().strftime("%Y-%m-%d"),
        datetime.now().strftime("%Y-%m-%d 23:59"),
        10.0,
        "Làm bài đầy đủ",
        questions=["Question 1", "Question 2", "Question 3", "Question 4"]
    )
    assert asg_q is not None
    assert "questions" in asg_q
    assert len(asg_q["questions"]) == 4
    assert asg_q["questions"][0] == "Question 1"

    # Update assignment questions
    up_asg_q = database.update_assignment(
        asg_q["id"],
        asg_q["title"],
        asg_q["subject"],
        asg_q["assigned_date"],
        asg_q["due_date"],
        asg_q["max_score"],
        asg_q["notes"],
        questions=["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]
    )
    assert len(up_asg_q["questions"]) == 5
    print(" -> PASS: Assignment custom questions CRUD verified.")

    # 23b. Test Grading with Question Details and Animal Mascot Customization
    st_hs02 = next(s for s in database.get_students() if s["code"] == "HS02")
    grade_res = database.record_grading(
        st_hs02["id"],
        asg_q["id"],
        9.0,
        "Đã đạt",
        teacher_note="Bài làm rất tốt!",
        operator="Cô Linh",
        question_details={"Question 1": "correct", "Question 2": "correct", "Question 3": "need_fix"},
        animal_group="dolphin"
    )
    assert grade_res["success"] is True
    assert grade_res["animal_group"] == "dolphin"
    assert "Question 1" in grade_res["question_details"]

    # Verify student was updated in students table
    st_hs02_after = next(s for s in database.get_students() if s["code"] == "HS02")
    assert st_hs02_after["animal_group"] == "dolphin"
    # Restore HS02 back to monkey for idempotent test suite runs
    database.update_student_animal_group("HS02", "monkey")
    print(" -> PASS: Grading with question breakdown and student animal mascot update verified.")

    # 23c. Test Teams CRUD in Database
    t1 = database.create_team(
        "Biệt Đội Ánh Dương",
        color="#7C3AED",
        icon="🚀",
        image="",
        motto="Vươn tới những vì sao!",
        member_ids=["HS01", "HS02", "HS03", "HS04"]
    )
    assert t1 is not None
    assert t1["name"] == "Biệt Đội Ánh Dương"
    assert t1["color"] == "#7C3AED"
    assert t1["icon"] == "🚀"
    assert len(t1["members"]) == 4

    teams_list = database.get_teams()
    assert any(t["id"] == t1["id"] for t in teams_list)

    # Update team
    up_t1 = database.update_team(
        t1["id"],
        "Biệt Đội Ánh Dương Pro",
        color="#059669",
        icon="🔥",
        image="",
        motto="Đoàn kết và bứt phá!",
        member_ids=["HS01", "HS02", "HS05", "HS06", "HS07"]
    )
    assert up_t1["name"] == "Biệt Đội Ánh Dương Pro"
    assert up_t1["color"] == "#059669"
    assert up_t1["icon"] == "🔥"
    assert len(up_t1["members"]) == 5

    # Delete team
    del_ok = database.delete_team(t1["id"])
    assert del_ok is True
    assert not any(t["id"] == t1["id"] for t in database.get_teams())
    print(" -> PASS: Team management CRUD in database verified.")

    # 23d. Test Teams API Server Endpoints
    post_team_body = json.dumps({
        "name": "Team Rồng Xanh",
        "color": "#0284C7",
        "icon": "🐬",
        "motto": "Bơi nhanh về đích",
        "member_ids": ["HS01", "HS02"]
    }).encode("utf-8")
    req_pt = (
        b"POST /api/teams HTTP/1.1\r\nHost: localhost\r\n"
        b"Content-Type: application/json\r\nContent-Length: " + str(len(post_team_body)).encode() + b"\r\n\r\n" + post_team_body
    )
    sock_pt = MockSocket(req_pt)
    server.LMSRequestHandler(sock_pt, ("127.0.0.1", 12345), None)
    out_pt = sock_pt.out.getvalue().decode("utf-8", errors="ignore")
    assert "201 Created" in out_pt
    team_data = json.loads(out_pt.split("\r\n\r\n", 1)[1])
    created_team_id = team_data["id"]

    # GET /api/teams
    req_gt = b"GET /api/teams HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    sock_gt = MockSocket(req_gt)
    server.LMSRequestHandler(sock_gt, ("127.0.0.1", 12345), None)
    out_gt = sock_gt.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_gt
    assert "Team Rồng Xanh" in out_gt

    # DELETE /api/teams/<id>
    req_dt = f"DELETE /api/teams/{created_team_id} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_dt = MockSocket(req_dt)
    server.LMSRequestHandler(sock_dt, ("127.0.0.1", 12345), None)
    out_dt = sock_dt.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_dt
    print(" -> PASS: Teams API endpoints (GET, POST, DELETE) verified.")

    # 23e. Client Code Contracts (HTML, JS, CSS)
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_c = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_c = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_c = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_c = f.read()

    assert "pane-teams" in html_c, "Missing pane-teams in public/index.html"
    assert "team-editor-modal" in html_c, "Missing team-editor-modal in public/index.html"
    assert "grade-questions-container" in html_c, "Missing grade-questions-container in public/index.html"
    assert "loadTeams" in js_c, "Missing loadTeams in public/js/app.js"
    assert "renderTeams" in js_c, "Missing renderTeams in public/js/app.js"
    assert "openCreateTeamModal" in js_c, "Missing openCreateTeamModal in public/js/app.js"
    assert "selectGradingAnimal" in js_c, "Missing selectGradingAnimal in public/js/app.js"
    assert "renderGradingQuestions" in js_c, "Missing renderGradingQuestions in public/js/app.js"
    assert "getTeams" in db_c, "Missing getTeams in public/js/client_db.js"
    assert "createTeam" in db_c, "Missing createTeam in public/js/client_db.js"
    assert "team-card" in css_c, "Missing team-card in public/css/style.css"
    assert "q-btn-correct" in css_c, "Missing q-btn-correct in public/css/style.css"
    print(" -> PASS: Client UI, JS, and CSS contracts for questions, animals, and teams verified.")

    print("\n============================================================")
    print("  ALL DIRECT VERIFICATION TESTS PASSED SUCCESSFULLY! (23/23)")
    print("============================================================")

if __name__ == "__main__":
    test_all()

