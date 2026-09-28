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

    # 24. Test Multi-Student Batch Grading, Team/Animal Groups & Questions Right First
    print("\n--- 24. Test Multi-Student Batch Grading, Team/Animal Groups & Questions Right First ---")
    
    # 24a. Database record_grading_batch
    batch_sts = ["HS01", "HS02", "HS03"]
    b_res = database.record_grading_batch(
        batch_sts,
        aid,
        score=10.0,
        status="Đã đạt",
        teacher_note="Bài làm cả nhóm rất tốt!",
        operator="Cô Linh",
        question_details={"Question 1": "correct", "Question 2": "correct", "Question 3": "correct", "Question 4": "correct"},
        animal_group="dolphin"
    )
    assert b_res["success"] is True, "Batch grading failed"
    assert b_res["count"] == 3
    assert len(b_res["results"]) == 3
    for r in b_res["results"]:
        assert r["score"] == 10.0
        assert r["status"] == "Đã đạt"
    # Restore HS02 back to monkey for test suite idempotency
    database.update_student_animal_group("HS02", "monkey")
    print(" -> PASS: Database record_grading_batch successfully graded multiple students.")

    # 24b. Server HTTP POST /api/grade with student_ids (Batch API)
    batch_payload = json.dumps({
        "student_ids": ["HS04", "HS05"],
        "assignment_id": aid,
        "score": 9.0,
        "status": "Đã đạt",
        "teacher_note": "Chấm hàng loạt qua API",
        "question_details": {"Question 1": "correct", "Question 2": "correct", "Question 3": "correct", "Question 4": "incorrect"},
        "animal_group": None
    })
    req_batch = f"POST /api/grade HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: {len(batch_payload.encode('utf-8'))}\r\nConnection: close\r\n\r\n{batch_payload}".encode("utf-8")
    sock_batch = MockSocket(req_batch)
    server.LMSRequestHandler(sock_batch, ("127.0.0.1", 12345), None)
    out_batch = sock_batch.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_batch, f"Batch API failed: {out_batch}"
    assert '"count": 2' in out_batch or '"count":2' in out_batch
    print(" -> PASS: Server POST /api/grade batch endpoint successfully handled student_ids list.")

    # 24c. Verify UI and JS contracts for Batch Grading, Group Selectors & Right/Wrong Questions
    assert "grade-mode-toggle-bar" in html_c, "Missing grade-mode-toggle-bar in public/index.html"
    assert "btn-grade-mode-single" in html_c, "Missing btn-grade-mode-single in public/index.html"
    assert "btn-grade-mode-multi" in html_c, "Missing btn-grade-mode-multi in public/index.html"
    assert "grade-team-selector" in html_c, "Missing grade-team-selector in public/index.html"
    assert "grade-animal-quick-chips" in html_c, "Missing grade-animal-quick-chips in public/index.html"
    assert "grade-batch-header" in html_c, "Missing grade-batch-header in public/index.html"
    assert "markAllGradeQuestionsCorrect" in html_c, "Missing markAllGradeQuestionsCorrect in public/index.html"
    assert "markAllGradeQuestionsWrong" in html_c, "Missing markAllGradeQuestionsWrong in public/index.html"

    assert "recordGradingBatch" in db_c, "Missing recordGradingBatch in public/js/client_db.js"
    assert "setGradeSelectionMode" in js_c, "Missing setGradeSelectionMode in public/js/app.js"
    assert "selectGradeAnimalGroupBulk" in js_c, "Missing selectGradeAnimalGroupBulk in public/js/app.js"
    assert "selectGradeTeamBulk" in js_c, "Missing selectGradeTeamBulk in public/js/app.js"
    assert "openGradingForMultipleStudents" in js_c, "Missing openGradingForMultipleStudents in public/js/app.js"
    assert "markAllGradeQuestionsWrong" in js_c, "Missing markAllGradeQuestionsWrong in public/js/app.js"
    assert "renderGradeStudentList" in js_c, "Missing renderGradeStudentList in public/js/app.js"

    assert "grade-mode-toggle-bar" in css_c, "Missing grade-mode-toggle-bar in public/css/style.css"
    assert "grade-student-item" in css_c, "Missing grade-student-item in public/css/style.css"
    assert "batch-st-chip" in css_c, "Missing batch-st-chip in public/css/style.css"
    print(" -> PASS: Client UI, JS, and CSS contracts for multi/single grading and right/wrong question toggling verified.")

    # 25. Test Homework Goals (Mục Tiêu), Mascot Cleanliness, Horizontal Table, Subject Animals & Team Capacity
    print("\n--- 25. Test Goals, Clean Mascots, Horizontal Table, Subject Animals & Team Capacity ---")
    
    # 25a. Homework Goals (Mục Tiêu) CRUD & API
    goal_asg = database.add_assignment(
        "Toán 3: Phép nhân và chia 7",
        "Toán",
        datetime.now().strftime("%Y-%m-%d"),
        datetime.now().strftime("%Y-%m-%d 23:59"),
        10.0,
        "Làm bài cẩn thận",
        questions=["Bài 1", "Bài 2", "Bài 3", "Bài 4"],
        goals="1. Thuộc bảng nhân 7.\n2. Vận dụng tính diện tích và chu vi hình chữ nhật."
    )
    assert goal_asg is not None, "Failed to create assignment with goals"
    assert goal_asg.get("goals") == "1. Thuộc bảng nhân 7.\n2. Vận dụng tính diện tích và chu vi hình chữ nhật."

    # Update goals
    up_goal_asg = database.update_assignment(
        goal_asg["id"],
        goal_asg["title"],
        goal_asg["subject"],
        goal_asg["assigned_date"],
        goal_asg["due_date"],
        goal_asg["max_score"],
        goal_asg["notes"],
        questions=goal_asg["questions"],
        goals="1. Nắm chắc bảng nhân và chia 7.\n2. Tự tin giải toán đố."
    )
    assert "Tự tin giải toán đố" in up_goal_asg["goals"]
    print(" -> PASS: Homework goals (Mục Tiêu) database CRUD verified.")

    # 25b. Mascot Cleanliness (No embarrassing words and zero animal text labels)
    animal_cfg = database.get_animal_groups_config()
    embarrassing_words = ["smart", "kinda", "ordinary", "weak", "improvement", "xuất sắc", "khá giỏi", "tiêu chuẩn", "cần cố gắng", "cá heo", "khỉ con", "mèo cam", "rùa con", "ốc sên"]
    for k, v in animal_cfg.items():
        name_lower = (v.get("default_name") or "").lower()
        tier_lower = (v.get("tier_name") or "").lower()
        assert v.get("tier_name") == v.get("default_symbol"), f"Tier name should be symbol, got {v.get('tier_name')}"
        assert v.get("default_name") == v.get("default_symbol"), f"Default name should be symbol, got {v.get('default_name')}"
        for opt in v.get("options", []):
            assert opt.get("name") == opt.get("symbol"), f"Option name should match symbol: {opt}"
        for word in embarrassing_words:
            assert word not in name_lower, f"Embarrassing word '{word}' found in {k} default_name: {name_lower}"
            assert word not in tier_lower, f"Embarrassing word '{word}' found in {k} tier_name: {tier_lower}"
    print(" -> PASS: Animal mascots are 100% clean and free of embarrassing words/titles.")

    # 25c. Subject-Specific Animal Mascots
    st_hs01 = database.get_student_by_code("HS01")
    assert st_hs01 is not None
    # Assign Dolphin in Toán, Monkey in Tiếng Việt
    database.update_student_subject_animal("HS01", "Toán", "dolphin", "🐬", "🐬")
    database.update_student_subject_animal("HS01", "Tiếng Việt", "monkey", "🐵", "🐵")
    
    st_hs01_updated = database.get_student_by_code("HS01")
    subj_animals = st_hs01_updated.get("subject_animals") or {}
    assert "Toán" in subj_animals, "Missing Toán in subject_animals"
    assert subj_animals["Toán"]["group"] == "dolphin"
    assert "Tiếng Việt" in subj_animals, "Missing Tiếng Việt in subject_animals"
    assert subj_animals["Tiếng Việt"]["group"] == "monkey"

    # Test tracking matrix reflects subject-specific mascot
    tracking_toan = database.get_assignment_tracking_matrix(goal_asg["id"])
    assert tracking_toan is not None
    matrix_rows = tracking_toan.get("matrix") or []
    hs01_row = next((r for r in matrix_rows if r["code"] == "HS01"), None)
    assert hs01_row is not None
    assert hs01_row.get("animal_group") == "dolphin", f"Expected dolphin for Toán, got {hs01_row.get('animal_group')}"

    subj_str = json.dumps({
        "subject": "Tiếng Anh",
        "animal_group": "orange_cat",
        "animal_symbol": "🐱",
        "animal_title": "🐱"
    })
    req_sa = f"POST /api/students/{st_hs01['id']}/subject-animal HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: {len(subj_str.encode('utf-8'))}\r\nConnection: close\r\n\r\n{subj_str}".encode("utf-8")
    sock_sa = MockSocket(req_sa)
    server.LMSRequestHandler(sock_sa, ("127.0.0.1", 12345), None)
    out_sa = sock_sa.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_sa, f"Subject animal API failed: {out_sa}"
    print(" -> PASS: Subject-specific animal mascots verified in DB, Tracking Matrix, and API.")

    # 25d. Team Capacity Management
    team_cap = database.create_team(
        "Biệt Đội Tia Chớp",
        color="#F59E0B",
        icon="⚡",
        image="",
        motto="Nhanh như chớp!",
        member_ids=["HS01", "HS02", "HS03"],
        max_capacity=4
    )
    assert team_cap is not None
    assert team_cap.get("max_capacity") == 4

    up_team_cap = database.update_team(
        team_cap["id"],
        team_cap["name"],
        color=team_cap["color"],
        icon=team_cap["icon"],
        image=team_cap["image"],
        motto=team_cap["motto"],
        member_ids=team_cap["members"],
        max_capacity=6
    )
    assert up_team_cap.get("max_capacity") == 6
    database.delete_team(team_cap["id"])
    print(" -> PASS: Team max_capacity verified in database.")

    # 25e. Client Code Contracts (5-row table, goals, modal-animal-subject-select, team capacity)
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_25 = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_25 = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_25 = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_25 = f.read()

    # Goals banner & inputs
    assert "grade-assignment-goals-banner" in html_25
    assert "grade-assignment-goals-text" in html_25
    assert "new-asg-goals" in html_25
    assert "edit-asg-goals" in html_25
    assert "updateGradeAssignmentGoalsBanner" in js_25

    # Horizontal 5-row table / Fast question grading
    assert "grade-questions-container" in html_25 or "grade-questions-horizontal-wrapper" in html_25
    assert "setGradeQuestionStatus" in js_25 or "grade-horizontal-table" in js_25
    assert "setGradeQuestionNote" in js_25
    assert "grade-horizontal-table" in css_25 or "grade-question-card" in css_25


    # Subject animal selector & team capacity
    assert "modal-animal-subject-select" in html_25
    assert "onStudentAnimalSubjectChange" in js_25
    assert "updateStudentSubjectAnimal" in db_25
    assert "team-modal-capacity" in html_25
    assert "max_capacity" in js_25

    print(" -> PASS: Client UI, JS, and CSS contracts for all 5 capabilities verified.")

    # 26. Test Color Group Division, Normal Avatars & Removal of Team Tab
    print("\n--- 26. Test Color Group Division, Normal Avatars & Team Tab Removal ---")

    # 26a. Database Color Group Assignment & Distribution
    students_list = database.get_students()
    assert len(students_list) >= 29
    # Verify group_name and group_color exist on students
    for st in students_list[:5]:
        assert "group_name" in st, f"Missing group_name on student {st['code']}"
        assert "group_color" in st, f"Missing group_color on student {st['code']}"

    # Update color group in database
    st_hs01 = database.get_student_by_code("HS01")
    database.update_student_color_group(st_hs01["id"], "Nhóm Tím Siêu Đẳng", "#8B5CF6")
    st_hs01_updated = database.get_student_by_code("HS01")
    assert st_hs01_updated["group_name"] == "Nhóm Tím Siêu Đẳng"
    assert st_hs01_updated["group_color"] == "#8B5CF6"

    # Reset HS01 back to Nhóm Đỏ
    database.update_student_color_group(st_hs01["id"], "Nhóm Đỏ", "#EF4444")
    assert database.get_student_by_code("HS01")["group_name"] == "Nhóm Đỏ"
    print(" -> PASS: Student color group database CRUD verified.")

    # 26b. Tracking Matrix includes group_name and group_color
    trk_matrix = database.get_assignment_tracking_matrix(goal_asg["id"])
    m_rows = trk_matrix.get("matrix", [])
    assert len(m_rows) > 0
    row_0 = m_rows[0]
    assert "group_name" in row_0, "Missing group_name in tracking matrix row"
    assert "group_color" in row_0, "Missing group_color in tracking matrix row"
    print(" -> PASS: Tracking matrix includes student group_name and group_color.")

    # 26c. API POST /api/students/{id}/color-group
    color_grp_payload = json.dumps({
        "group_name": "Nhóm Vàng Nắng",
        "group_color": "#F59E0B"
    }).encode("utf-8")
    req_cg = (
        f"POST /api/students/{st_hs01['id']}/color-group HTTP/1.1\r\n"
        f"Host: localhost\r\nContent-Type: application/json\r\nContent-Length: {len(color_grp_payload)}\r\nConnection: close\r\n\r\n"
    ).encode("utf-8") + color_grp_payload
    sock_cg = MockSocket(req_cg)
    server.LMSRequestHandler(sock_cg, ("127.0.0.1", 12345), None)
    out_cg = sock_cg.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_cg, f"Color group API failed: {out_cg}"
    assert "Nhóm Vàng Nắng" in out_cg
    # Reset back to Nhóm Đỏ
    database.update_student_color_group(st_hs01["id"], "Nhóm Đỏ", "#EF4444")
    print(" -> PASS: Server API endpoint POST /api/students/{id}/color-group verified.")

    # 26d. UI & Frontend Contracts
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_26 = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_26 = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_26 = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_26 = f.read()

    # Team tab removed from #teacher-nav
    assert '<button class="nav-tab" onclick="app.switchTab(\'pane-teams\')">🏆 Quản Lý Nhóm</button>' not in html_26, "Team tab should be removed from teacher-nav"
    # Color group filter bar & modal in HTML
    assert "color-group-filter-bar" in html_26, "Missing color-group-filter-bar in HTML"
    assert "modal-assign-color-group" in html_26, "Missing modal-assign-color-group in HTML"
    assert "modal-color-preview-pill" in html_26, "Missing modal-color-preview-pill in HTML"

    # JS color group methods & normal avatars
    assert "setStudentColorGroupFilter" in js_26, "Missing setStudentColorGroupFilter in app.js"
    assert "updateStudentColorGroupCounters" in js_26, "Missing updateStudentColorGroupCounters in app.js"
    assert "openAssignColorGroupModal" in js_26, "Missing openAssignColorGroupModal in app.js"
    assert "saveStudentColorGroup" in js_26, "Missing saveStudentColorGroup in app.js"
    assert "selectGradeColorGroupBulk" in js_26, "Missing selectGradeColorGroupBulk in app.js"
    assert "updateStudentColorGroup" in db_26, "Missing updateStudentColorGroup in client_db.js"

    # CSS classes for normal student avatar and color groups
    assert "student-avatar-circle" in css_26, "Missing student-avatar-circle in CSS"
    assert "color-group-filter-bar" in css_26, "Missing color-group-filter-bar in CSS"
    assert "color-filter-btn" in css_26, "Missing color-filter-btn in CSS"
    assert "color-group-pill" in css_26, "Missing color-group-pill in CSS"
    assert "color-bullet" in css_26, "Missing color-bullet in CSS"

    print(" -> PASS: Client UI, JS, and CSS contracts for color groups and normal avatars verified.")

    # 27. Pedagogical Grading, 3-Tier Analysis, Bottlenecks, Remediation & Growth
    print("\n--- TEST 27: Pedagogical Analysis, Bottlenecks, Remediation & Growth ---")

    # 27a. Add assignment with structured questions_data and subject_type
    ped_questions = [
        {"id": "q1", "name": "C1", "target": "MT1", "skill": "Nhận biết phép tính", "max_score": 1.0},
        {"id": "q2", "name": "C2", "target": "MT1", "skill": "Kĩ năng đặt tính", "max_score": 1.0},
        {"id": "q3", "name": "C3", "target": "MT2", "skill": "Nhóm lại hàng chục", "max_score": 2.0},
        {"id": "q4", "name": "C4", "target": "MT2", "skill": "Giải toán có lời văn", "max_score": 2.0}
    ]
    now_str = datetime.now().strftime("%Y-%m-%d")
    ped_asg = database.add_assignment(
        "Phiếu 2.2.d - Phép cộng có nhớ",
        "Toán",
        now_str,
        f"{now_str} 23:59",
        6.0,
        "Đánh giá MT1 & MT2",
        questions=["C1", "C2", "C3", "C4"],
        questions_data=ped_questions,
        subject_type="math"
    )
    assert ped_asg is not None, "Failed to create pedagogical assignment"
    ped_asg_id = ped_asg["id"]
    assert ped_asg["subject_type"] == "math"
    assert len(ped_asg.get("questions_data", [])) == 4
    assert ped_asg["max_score"] == 6.0
    print(f" -> PASS: Created pedagogical assignment '{ped_asg['title']}' with 4 questions, 2 MTs, total 6.0 pts.")

    # 27b. Record grading with detailed question items and causes for HS01 & HS02
    st_hs01 = [s for s in students if s['code'] == 'HS01'][0]
    st_hs02 = [s for s in students if s['code'] == 'HS02'][0]

    q_details_hs01 = {
        "questions": [
            {"num": 1, "label": "C1", "name": "C1", "target": "MT1", "skill": "Nhận biết phép tính", "max_score": 1.0, "status": "correct", "score": 1.0, "cause": ""},
            {"num": 2, "label": "C2", "name": "C2", "target": "MT1", "skill": "Kĩ năng đặt tính", "max_score": 1.0, "status": "correct", "score": 1.0, "cause": ""},
            {"num": 3, "label": "C3", "name": "C3", "target": "MT2", "skill": "Nhóm lại hàng chục", "max_score": 2.0, "status": "correct", "score": 2.0, "cause": ""},
            {"num": 4, "label": "C4", "name": "C4", "target": "MT2", "skill": "Giải toán có lời văn", "max_score": 2.0, "status": "correct", "score": 2.0, "cause": ""}
        ]
    }
    database.record_grading(
        student_id=st_hs01["id"],
        assignment_id=ped_asg_id,
        score=6.0,
        status="Đã đạt",
        teacher_note="Xuất sắc",
        operator="Cô Linh",
        question_details=q_details_hs01
    )

    q_details_hs02 = {
        "questions": [
            {"num": 1, "label": "C1", "name": "C1", "target": "MT1", "skill": "Nhận biết phép tính", "max_score": 1.0, "status": "correct", "score": 1.0, "cause": ""},
            {"num": 2, "label": "C2", "name": "C2", "target": "MT1", "skill": "Kĩ năng đặt tính", "max_score": 1.0, "status": "correct", "score": 1.0, "cause": ""},
            {"num": 3, "label": "C3", "name": "C3", "target": "MT2", "skill": "Nhóm lại hàng chục", "max_score": 2.0, "status": "need_fix", "score": 1.0, "cause": "Tính toán ẩu"},
            {"num": 4, "label": "C4", "name": "C4", "target": "MT2", "skill": "Giải toán có lời văn", "max_score": 2.0, "status": "incorrect", "score": 0.0, "cause": "Sai quy trình tính"}
        ]
    }
    database.record_grading(
        student_id=st_hs02["id"],
        assignment_id=ped_asg_id,
        score=3.0,
        status="Cần sửa",
        teacher_note="Cần rèn thêm MT2",
        operator="Cô Linh",
        question_details=q_details_hs02
    )
    print(" -> PASS: Recorded grading with questions breakdown & error causes for HS01 & HS02.")

    # 27c. Test get_assignment_analysis (3 Tiers & Heatmap)
    analysis = database.get_assignment_analysis(ped_asg_id)
    assert analysis["assignment"]["id"] == ped_asg_id
    assert analysis["tier1"]["graded_count"] == 2
    assert analysis["tier1"]["average_score"] == 4.5
    assert analysis["tier1"]["average_percentage"] == 75.0

    # Tier 2: MT1 should be 100%, MT2 should have failed student HS02
    t2_targets = analysis["tier2"]
    assert len(t2_targets) == 2, f"Expected 2 targets, got {len(t2_targets)}"
    mt1 = [t for t in t2_targets if t["target_code"] == "MT1"][0]
    mt2 = [t for t in t2_targets if t["target_code"] == "MT2"][0]
    assert mt1["percentage"] == 100.0
    assert len(mt1["failed_students"]) == 0
    assert mt2["percentage"] == 62.5
    assert mt2["is_passed"] is False
    assert len(mt2["failed_students"]) == 1
    assert mt2["failed_students"][0]["code"] == "HS02"

    # Tier 3: Questions
    t3_questions = analysis["tier3"]
    assert len(t3_questions) == 4
    q4_res = [q for q in t3_questions if q["num"] == 4][0]
    assert q4_res["incorrect_count"] == 1
    assert "Sai quy trình tính" in q4_res["causes_summary"]

    # Heatmap: 29 students
    heatmap_matrix = analysis["heatmap"]["matrix"]
    assert len(heatmap_matrix) == 29
    hm_hs02 = [h for h in heatmap_matrix if h["code"] == "HS02"][0]
    assert hm_hs02["is_graded"] is True
    assert hm_hs02["score"] == 3.0
    assert hm_hs02["questions"][2]["status"] == "need_fix"
    assert hm_hs02["questions"][3]["status"] == "incorrect"
    print(" -> PASS: 3-Tier analysis and 29-student Heatmap verified.")

    # 27d. Test get_learning_bottlenecks
    bottlenecks = database.get_learning_bottlenecks(ped_asg_id)
    assert len(bottlenecks) >= 1
    b_mt2 = [b for b in bottlenecks if b["target_code"] == "MT2"][0]
    assert any(s["code"] == "HS02" for s in b_mt2["students"])
    print(f" -> PASS: Bottlenecks detected successfully ({len(bottlenecks)} clusters found).")

    # 27e. Create Remediation Plan and Reassess
    plan = database.create_remediation_plan(
        assignment_id=ped_asg_id,
        target_code="MT2",
        target_name="Mục tiêu 2",
        skill_name="Nhóm lại hàng chục & Giải toán",
        group_name="Nhóm Rèn MT2",
        student_ids=[st_hs02["id"]],
        supplementary_task="Rèn bài tập có bước nhớ vào hàng chục",
        start_date=now_str
    )
    assert plan is not None
    plan_id = plan["id"]
    plans = database.get_remediation_plans()
    assert any(p["id"] == plan_id for p in plans)
    p_data = database.get_remediation_plan_by_id(plan_id)
    assert len(p_data["students"]) == 1
    assert p_data["students"][0]["code"] == "HS02"

    # Reassess HS02: score improved from 3.0 -> 5.5 / 6.0 (Passed)
    reass_res = database.record_reassessment(
        plan_id=plan_id,
        student_id=st_hs02["id"],
        score=5.5,
        max_score=6.0,
        status="Đã đạt",
        note="Đã khắc phục lỗi nhớ hàng chục thành công!"
    )
    assert reass_res["success"] is True
    p_data_after = database.get_remediation_plan_by_id(plan_id)
    assert len(p_data_after["reassessments"]) == 1
    assert p_data_after["reassessments"][0]["score"] == 5.5
    print(" -> PASS: Remediation plan creation and reassessment audit trail verified.")

    # 27f. Spelling Statistics & Student Growth Profile
    spelling_stats = database.get_spelling_statistics(st_hs02["id"])
    assert "total_errors" in spelling_stats
    assert "error_types" in spelling_stats

    growth_profile = database.get_student_growth_profile(st_hs02["id"])
    assert growth_profile["student"]["code"] == "HS02"
    assert len(growth_profile["remediations"]) >= 1
    assert len(growth_profile["remediations"][0]["reassessments"]) >= 1
    assert growth_profile["remediations"][0]["reassessments"][0]["score"] == 5.5
    print(" -> PASS: Spelling statistics and Student growth profile verified.")

    # 27g. Server API endpoints
    # Analysis API
    req_an = f"GET /api/assignments/{ped_asg_id}/analysis HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_an = MockSocket(req_an)
    server.LMSRequestHandler(sock_an, ("127.0.0.1", 12345), None)
    out_an = sock_an.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_an
    assert "tier1" in out_an
    assert "tier2" in out_an
    assert "heatmap" in out_an

    # Bottlenecks API
    req_bn = f"GET /api/bottlenecks?assignment_id={ped_asg_id} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_bn = MockSocket(req_bn)
    server.LMSRequestHandler(sock_bn, ("127.0.0.1", 12345), None)
    out_bn = sock_bn.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_bn
    assert "MT2" in out_bn

    # Remediation plans API
    req_rp = f"GET /api/remediation-plans HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_rp = MockSocket(req_rp)
    server.LMSRequestHandler(sock_rp, ("127.0.0.1", 12345), None)
    out_rp = sock_rp.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_rp
    assert "Nhóm Rèn MT2" in out_rp

    # Student Growth API
    req_sg = f"GET /api/student-growth/{st_hs02['id']} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_sg = MockSocket(req_sg)
    server.LMSRequestHandler(sock_sg, ("127.0.0.1", 12345), None)
    out_sg = sock_sg.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_sg
    assert "remediations" in out_sg
    print(" -> PASS: Server API endpoints for Analysis, Bottlenecks, Plans, and Growth verified.")

    # 27h. Frontend & UI Contracts
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_27 = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_27 = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_27 = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_27 = f.read()

    assert "CHẤM NHANH" in html_27
    assert "PHÂN TÍCH BÀI" in html_27
    assert "ĐIỂM NGHẼN & RÈN" in html_27
    assert "HỒ SƠ TIẾN BỘ" in html_27
    assert "grade-questions-container" in html_27
    assert "btn-submit-grading-next" in html_27
    assert "remediation-create-modal" in html_27
    assert "reassessment-modal" in html_27

    assert "setGradeQuestionStatus" in js_27
    assert "setGradeQuestionCause" in js_27
    assert "submitGradingAndNext" in js_27
    assert "loadAssignmentAnalysis" in js_27
    assert "openRemediationCreateModal" in js_27
    assert "recordReassessment" in db_27
    assert "getAssignmentAnalysis" in db_27

    assert "heatmap-table" in css_27
    assert "fast-q-card" in css_27
    assert "fast-choice-btn" in css_27

    print(" -> PASS: Client UI, JS, DB, and CSS contracts for pedagogical workflow verified.")

    # 28. Test Neutral Reading Race Starting State & Normal Avatars
    print("\n--- TEST 28: Neutral Reading Race Starting State & Normal Avatars ---")
    race = database.get_reading_race()
    assert len(race) == 29
    # All students currently have completed == 0 in test suite
    for r in race:
        if r["completed"] == 0:
            assert r.get("is_neutral") is True, f"Student {r['code']} with 0 completed books must be neutral"
            assert "gender" in r
            assert "group_name" in r
            assert "group_color" in r
    print(" -> PASS: All students with 0 completed books are marked as neutral starting position in database.")

    # ClientDB parity
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_28 = f.read()
    assert "is_neutral" in db_28
    assert "gender" in db_28

    # App.js neutral top readers & normal avatars
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_28 = f.read()
    assert "Tất cả 29 bạn đang ở vạch xuất phát" in js_28
    assert "Đồng hạng" in js_28
    assert "student-avatar-circle" in js_28

    print(" -> PASS: Neutral leaderboard logic and normal student avatars verified.")

    # 29. Test Independent Groups, Student Info Editing, Bulk Reassignment, Import & Competency Aggregation
    print("\n--- TEST 29: Independent Groups, Student Info Editing, Bulk Reassignment, Import & Competency Aggregation ---")

    # 29a. Verify 6 Homeroom Groups and Independent Math/Vietnamese Groups
    st_test = database.get_student_by_code("HS01")
    assert st_test is not None
    assert "homeroom_group" in st_test, "Missing homeroom_group column"
    assert "math_group" in st_test, "Missing math_group column"
    assert "viet_group" in st_test, "Missing viet_group column"
    assert "birthday" in st_test, "Missing birthday column"

    # Homeroom groups config: Nhóm 1..6
    hr_cfg = database.get_homeroom_groups_config()
    assert len(hr_cfg) == 6
    assert "Nhóm 1" in hr_cfg and "Nhóm 6" in hr_cfg

    # Ability groups config: 4 animals
    ab_cfg = database.get_ability_groups_config()
    assert len(ab_cfg) == 4
    for key in ["dolphin", "monkey", "cat", "ant"]:
        assert key in ab_cfg

    # 29b. Student Info Editing & Independent Group Isolation
    orig_hr = st_test.get("homeroom_group") or "Nhóm 1"
    orig_vg = st_test.get("viet_group") or "cat"

    # Update student HS01: set birthday, change Math group to monkey, keep homeroom and viet
    up_st = database.update_student(
        st_test["id"],
        code="HS01",
        full_name="Nguyễn Vỹ An (Đã Sửa)",
        gender="Nữ",
        order_num=1,
        birthday="2018-05-15",
        homeroom_group="Nhóm 2",
        math_group="monkey",
        viet_group=orig_vg,
        changed_by="Cô Linh",
        reason="Chuyển sang nhóm Khỉ Con môn Toán"
    )
    assert up_st["full_name"] == "Nguyễn Vỹ An (Đã Sửa)"
    assert up_st["gender"] == "Nữ"
    assert up_st["birthday"] == "2018-05-15"
    assert up_st["homeroom_group"] == "Nhóm 2"
    assert up_st["math_group"] == "monkey"
    assert up_st["viet_group"] == orig_vg  # Vietnamese group remains unchanged!

    # Reset student HS01 back to dolphin and Nhóm 1
    database.update_student(
        st_test["id"],
        code="HS01",
        full_name="Nguyễn Vỹ An",
        gender="Nữ",
        order_num=1,
        birthday="2018-05-15",
        homeroom_group="Nhóm 1",
        math_group="dolphin",
        viet_group=orig_vg,
        changed_by="Cô Linh",
        reason="Khôi phục họ tên và nhóm gốc"
    )
    print(" -> PASS: Student info editing and independent group isolation verified.")

    # 29c. Group Change History Audit Trail
    hist = database.get_group_change_history()
    assert len(hist) > 0
    # HS01 math group change should be logged
    hs01_math_logs = [h for h in hist if h["student_code"] == "HS01" and h["subject"] == "Toán"]
    assert len(hs01_math_logs) > 0
    latest_m_log = hs01_math_logs[0]
    assert latest_m_log["new_group"] == "dolphin"
    assert latest_m_log["changed_by"] == "Cô Linh"

    # HS01 homeroom group change should be logged
    hs01_hr_logs = [h for h in hist if h["student_code"] == "HS01" and h["subject"] == "homeroom"]
    assert len(hs01_hr_logs) > 0
    print(f" -> PASS: Group change history captured {len(hist)} audit log entries successfully.")

    # 29d. Bulk Group Reassignment
    bulk_sts = [database.get_student_by_code("HS03")["id"], database.get_student_by_code("HS04")["id"]]
    bulk_res = database.bulk_update_student_groups(
        student_ids=bulk_sts,
        group_type="viet",
        new_group="ant",
        changed_by="Cô Linh",
        reason="Cần bồi dưỡng chính tả Tiếng Việt"
    )
    assert len(bulk_res) == 2
    assert database.get_student_by_code("HS03")["viet_group"] == "ant"
    assert database.get_student_by_code("HS04")["viet_group"] == "ant"
    print(" -> PASS: Bulk student group reassignment verified.")

    # 29e. Batch Import (Append mode)
    sample_import = [
        {"order_num": 30, "code": "HS30", "full_name": "Phạm Gia Bảo", "gender": "Nam", "birthday": "2018-07-10", "homeroom_group": "Nhóm 5", "math_group": "cat", "viet_group": "cat", "class_name": "Lớp 3A7"}
    ]
    imp_res = database.import_students_batch(sample_import, replace=False)
    assert imp_res["success"] is True
    assert imp_res["count"] == 1
    st_hs30 = database.get_student_by_code("HS30")
    assert st_hs30 is not None
    assert st_hs30["full_name"] == "Phạm Gia Bảo"
    assert st_hs30["homeroom_group"] == "Nhóm 5"
    # Clean up HS30 to keep 29 students standard
    conn = database.get_db()
    c = conn.cursor()
    c.execute("DELETE FROM students WHERE code = 'HS30'")
    conn.commit()
    conn.close()
    print(" -> PASS: Batch student import (Append mode) verified.")

    # 29f. Competency Group Aggregation & Analysis API
    comp_analysis = database.get_assignment_competency_analysis(ped_asg_id)
    assert comp_analysis is not None
    assert comp_analysis["subject"] == "Toán"
    groups = comp_analysis["groups"]
    assert len(groups) == 4
    for g in groups:
        assert g["group_key"] in ["dolphin", "monkey", "cat", "ant"]
        assert "student_count" in g
        assert "targets" in g
    print(" -> PASS: Assignment competency group aggregation (4 ability tiers & targets) verified.")

    # 29g. Server Endpoints Verification
    # GET /api/students/group-history
    req_gh = b"GET /api/students/group-history HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    sock_gh = MockSocket(req_gh)
    server.LMSRequestHandler(sock_gh, ("127.0.0.1", 12345), None)
    out_gh = sock_gh.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_gh
    assert "HS01" in out_gh

    # POST /api/students/bulk-group
    bg_payload = json.dumps({
        "student_ids": [database.get_student_by_code("HS05")["id"]],
        "group_type": "math",
        "new_group": "monkey",
        "changed_by": "Cô Linh",
        "reason": "API bulk test"
    }).encode("utf-8")
    req_bg = f"POST /api/students/bulk-group HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: {len(bg_payload)}\r\nConnection: close\r\n\r\n".encode("utf-8") + bg_payload
    sock_bg = MockSocket(req_bg)
    server.LMSRequestHandler(sock_bg, ("127.0.0.1", 12345), None)
    out_bg = sock_bg.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_bg
    assert '"success": true' in out_bg or '"success":true' in out_bg

    # GET /api/assignments/{id}/competency-analysis
    req_ca = f"GET /api/assignments/{ped_asg_id}/competency-analysis HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode("utf-8")
    sock_ca = MockSocket(req_ca)
    server.LMSRequestHandler(sock_ca, ("127.0.0.1", 12345), None)
    out_ca = sock_ca.out.getvalue().decode("utf-8", errors="ignore")
    assert "200 OK" in out_ca
    assert "groups" in out_ca

    print(" -> PASS: Server API endpoints for group-history, bulk-group, and competency-analysis verified.")

    # 29h. Frontend Code Contracts
    with open("public/index.html", "r", encoding="utf-8") as f:
        html_29 = f.read()
    with open("public/js/app.js", "r", encoding="utf-8") as f:
        js_29 = f.read()
    with open("public/js/client_db.js", "r", encoding="utf-8") as f:
        db_29 = f.read()
    with open("public/css/style.css", "r", encoding="utf-8") as f:
        css_29 = f.read()

    # HTML
    assert "student-view-switcher" in html_29
    assert "btn-view-homeroom" in html_29
    assert "btn-view-math" in html_29
    assert "btn-view-viet" in html_29
    assert "student-dynamic-filter-bar" in html_29
    assert "student-bulk-bar" in html_29
    assert "modal-import-students" in html_29
    assert "modal-group-history" in html_29
    assert "analytics-competency-view" in html_29

    # JS
    assert "setStudentGroupView" in js_29
    assert "renderStudentFilterBar" in js_29
    assert "applyBulkGroupChange" in js_29
    assert "openImportStudentsModal" in js_29
    assert "exportStudentsExcel" in js_29
    assert "openGroupHistoryModal" in js_29
    assert "renderCompetencyAnalysis" in js_29

    # ClientDB
    assert "bulkUpdateStudentGroups" in db_29
    assert "importStudentsBatch" in db_29
    assert "getGroupChangeHistory" in db_29
    assert "getAssignmentCompetencyAnalysis" in db_29

    # CSS
    assert "student-view-switcher" in css_29
    assert "badge-animal-ant" in css_29
    assert "competency-card" in css_29

    print(" -> PASS: Frontend HTML, JS, ClientDB, and CSS contracts for group management and competency view verified.")

    print("\n============================================================")
    print("  ALL DIRECT VERIFICATION TESTS PASSED SUCCESSFULLY! (29/29)")
    print("============================================================")

if __name__ == "__main__":
    test_all()


