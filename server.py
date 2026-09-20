"""
Web Server for LMS - Quản lý nộp bài và điểm số (Cô Linh)
Pure Python 3 standard library (http.server, urllib, json, threading, csv).
Zero external dependencies.
"""

import os
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
from datetime import datetime

import database
import qr_engine

PORT = 8080
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

def async_sync_to_google_sheet(payload):
    """Sends payload to Google Sheets Apps Script Web App in a background thread."""
    def _worker():
        try:
            settings = database.get_settings()
            sheet_url = settings.get("google_sheet_url", "").strip()
            if not sheet_url or settings.get("auto_sync_sheets") != "true":
                return

            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                sheet_url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"[GoogleSheets Sync] Status: {resp.status}")
        except Exception as e:
            print(f"[GoogleSheets Sync Error]: {e}")

    threading.Thread(target=_worker, daemon=True).start()

class LMSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} - {args[1]}")

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Static files fallback to index.html for root
        if path in ("", "/"):
            self.path = "/index.html"
            return super().do_GET()

        # API Routes
        if path == "/api/qr":
            text = query.get("text", [""])[0]
            if not text:
                return self.send_json({"error": "Missing 'text' query parameter"}, 400)
            try:
                svg = qr_engine.generate_qr_svg(text)
                self.send_response(200)
                self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(svg.encode("utf-8"))
                return
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)

        elif path == "/api/settings":
            return self.send_json(database.get_settings())

        elif path == "/api/students":
            return self.send_json(database.get_students())

        elif path.startswith("/api/students/"):
            try:
                sid = int(path.split("/")[-1])
                st = database.get_student_by_id(sid)
                return self.send_json(st if st else {"error": "Not found"}, 200 if st else 404)
            except ValueError:
                return self.send_json({"error": "Invalid student ID"}, 400)

        elif path == "/api/assignments":
            return self.send_json(database.get_assignments())

        elif path.startswith("/api/assignments/"):
            try:
                aid = int(path.split("/")[-1])
                asg = database.get_assignment_by_id(aid)
                return self.send_json(asg if asg else {"error": "Not found"}, 200 if asg else 404)
            except ValueError:
                return self.send_json({"error": "Invalid assignment ID"}, 400)

        elif path.startswith("/api/tracking/"):
            try:
                aid = int(path.split("/")[-1])
                matrix_data = database.get_assignment_tracking_matrix(aid)
                if matrix_data is None:
                    return self.send_json({"error": "Assignment not found"}, 404)
                return self.send_json(matrix_data)
            except ValueError:
                return self.send_json({"error": "Invalid assignment ID"}, 400)

        elif path == "/api/analytics":
            return self.send_json(database.get_comprehensive_analytics())

        elif path.startswith("/api/student-profile/"):
            try:
                sid = int(path.split("/")[-1])
                prof = database.get_student_profile(sid)
                if prof is None:
                    return self.send_json({"error": "Student not found"}, 404)
                return self.send_json(prof)
            except ValueError:
                return self.send_json({"error": "Invalid student ID"}, 400)

        elif path == "/api/history":
            sid = query.get("student_id", [None])[0]
            aid = query.get("assignment_id", [None])[0]
            if sid and aid:
                return self.send_json(database.get_submission_history(int(sid), int(aid)))
            return self.send_json({"error": "Missing student_id or assignment_id"}, 400)

        elif path == "/api/export-csv":
            aid = query.get("assignment_id", [None])[0]
            if not aid:
                return self.send_json({"error": "Missing assignment_id"}, 400)
            
            matrix_data = database.get_assignment_tracking_matrix(int(aid))
            if not matrix_data:
                return self.send_json({"error": "Assignment not found"}, 404)

            asg = matrix_data["assignment"]
            matrix = matrix_data["matrix"]

            # Generate CSV with UTF-8 BOM so Excel opens with full Vietnamese diacritics
            self.send_response(200)
            filename = f"TheoDoi_{asg['id']}_{asg['title'][:20].replace(' ', '_')}.csv"
            self.send_header("Content-Type", "text/csv; charset=utf-8-sig")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.end_headers()

            # UTF-8 BOM
            output_bytes = b'\xef\xbb\xbf'
            header = "STT,Mã HS,Họ và tên,Giới tính,Trạng thái,Thời gian nộp gần nhất,Đúng/Trễ hạn,Số lần đã nộp,Số lần làm lại,Điểm lần 1,Điểm gần nhất,Nhận xét của giáo viên\n"
            output_bytes += header.encode("utf-8")

            for row in matrix:
                is_late_str = "Trễ hạn" if row["is_late"] else ("Đúng hạn" if row["submit_count"] > 0 else "")
                first_score_str = str(row["first_score"]) if row["first_score"] is not None else ""
                latest_score_str = str(row["latest_score"]) if row["latest_score"] is not None else ""
                note_clean = (row["teacher_note"] or "").replace('"', '""')

                line = f'{row["stt"]},"{row["code"]}","{row["full_name"]}","{row["gender"]}","{row["current_status"]}","{row["latest_submit_time"]}","{is_late_str}",{row["submit_count"]},{row["retry_count"]},"{first_score_str}","{latest_score_str}","{note_clean}"\n'
                output_bytes += line.encode("utf-8")

            self.wfile.write(output_bytes)
            return

        # Fallback to serving static files
        return super().do_GET()

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {}

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == "/api/settings":
            updated = database.update_settings(body)
            return self.send_json(updated)

        elif path == "/api/students":
            code = body.get("code", "")
            name = body.get("full_name", "")
            gender = body.get("gender", "Nam")
            class_name = body.get("class_name", "Lớp 3A7")
            if not code or not name:
                return self.send_json({"error": "Mã và Tên học sinh là bắt buộc!"}, 400)
            st = database.add_student(code, name, gender, class_name=class_name)
            return self.send_json(st, 201)

        elif path == "/api/students/reset":
            st_list = database.reset_students_to_default()
            return self.send_json(st_list)

        elif path == "/api/assignments":
            title = body.get("title", "")
            subject = body.get("subject", "Toán")
            assigned_date = body.get("assigned_date", datetime.now().strftime("%Y-%m-%d"))
            due_date = body.get("due_date", "")
            max_score = body.get("max_score", 10.0)
            notes = body.get("notes", "")

            if not title or not due_date:
                return self.send_json({"error": "Tên bài tập và Hạn nộp là bắt buộc!"}, 400)

            asg = database.add_assignment(title, subject, assigned_date, due_date, max_score, notes)
            return self.send_json(asg, 201)

        elif path == "/api/scan-submit":
            # Student or teacher scans QR code
            student_code_or_id = body.get("student_code") or body.get("student_id")
            assignment_id = body.get("assignment_id")
            operator = body.get("operator", "Học sinh")

            if not student_code_or_id or not assignment_id:
                return self.send_json({"error": "Thiếu thông tin học sinh hoặc bài tập!"}, 400)

            res = database.record_submission(student_code_or_id, int(assignment_id), operator=operator)
            if not res.get("success"):
                return self.send_json(res, 400)

            # Background sync to Google Sheets
            st = res["student"]
            asg = res["assignment"]
            sync_payload = {
                "action": "log_event",
                "event_type": "submit",
                "timestamp": res["submitted_at"],
                "student_code": st["code"],
                "student_name": st["full_name"],
                "class_name": st["class_name"],
                "assignment_title": asg["title"],
                "subject": asg["subject"],
                "attempt_number": res["attempt_number"],
                "is_late": "Trễ hạn" if res["is_late"] else "Đúng hạn",
                "score": "",
                "status": res["status"],
                "teacher_note": "",
                "operator": operator
            }
            async_sync_to_google_sheet(sync_payload)

            return self.send_json(res)

        elif path == "/api/grade":
            # Teacher grades assignment
            student_id = body.get("student_id")
            assignment_id = body.get("assignment_id")
            score = body.get("score")
            status = body.get("status", "Đã đạt")
            teacher_note = body.get("teacher_note", "")
            operator = body.get("operator", "Cô Linh")

            if not student_id or not assignment_id:
                return self.send_json({"error": "Thiếu student_id hoặc assignment_id!"}, 400)

            res = database.record_grading(int(student_id), int(assignment_id), score, status, teacher_note, operator=operator)
            if not res.get("success"):
                return self.send_json(res, 400)

            # Background sync to Google Sheets
            st = res["student"]
            asg = res["assignment"]
            sync_payload = {
                "action": "log_event",
                "event_type": "grade",
                "timestamp": res["graded_at"],
                "student_code": st["code"],
                "student_name": st["full_name"],
                "class_name": st["class_name"],
                "assignment_title": asg["title"],
                "subject": asg["subject"],
                "attempt_number": res["attempt_number"],
                "is_late": "",
                "score": res["score"],
                "status": res["status"],
                "teacher_note": res["teacher_note"],
                "operator": operator
            }
            async_sync_to_google_sheet(sync_payload)

            return self.send_json(res)

        elif path == "/api/test-google-sheet":
            sheet_url = body.get("url", "").strip()
            if not sheet_url:
                return self.send_json({"success": False, "error": "Vui lòng nhập đường dẫn Google Sheets Web App!"}, 400)

            test_payload = {
                "action": "test_connection",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "student_code": "TEST01",
                "student_name": "Kiểm tra kết nối",
                "class_name": "Lớp 3A7",
                "assignment_title": "Kiểm tra đồng bộ",
                "subject": "Hệ thống",
                "attempt_number": 1,
                "is_late": "Đúng hạn",
                "score": 10,
                "status": "Kết nối thành công",
                "teacher_note": "Kết nối giữa ứng dụng và Google Sheets đã hoạt động hoàn hảo!",
                "operator": "Cô Linh"
            }
            try:
                req_data = json.dumps(test_payload).encode("utf-8")
                req = urllib.request.Request(
                    sheet_url,
                    data=req_data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_body = resp.read().decode("utf-8")
                    return self.send_json({"success": True, "message": "Gửi dữ liệu kiểm tra thành công!", "response": resp_body})
            except Exception as e:
                return self.send_json({"success": False, "error": str(e)}, 500)

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path.startswith("/api/students/"):
            try:
                sid = int(path.split("/")[-1])
                st = database.update_student(
                    sid,
                    body.get("full_name", ""),
                    body.get("gender", "Nam"),
                    body.get("code", ""),
                    body.get("order_num")
                )
                return self.send_json(st)
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        elif path.startswith("/api/assignments/"):
            try:
                aid = int(path.split("/")[-1])
                asg = database.update_assignment(
                    aid,
                    body.get("title", ""),
                    body.get("subject", ""),
                    body.get("assigned_date", ""),
                    body.get("due_date", ""),
                    body.get("max_score", 10.0),
                    body.get("notes", "")
                )
                return self.send_json(asg)
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/students/"):
            try:
                sid = int(path.split("/")[-1])
                database.delete_student(sid)
                return self.send_json({"success": True})
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        elif path.startswith("/api/assignments/"):
            try:
                aid = int(path.split("/")[-1])
                database.delete_assignment(aid)
                return self.send_json({"success": True})
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        self.send_json({"error": "Endpoint not found"}, 404)

def run_server(ports=(8080, 3000)):
    database.init_db()
    servers = []
    for p in ports:
        try:
            srv = HTTPServer(("", p), LMSRequestHandler)
            servers.append((p, srv))
        except Exception as e:
            print(f"Không thể mở cổng {p}: {e}")

    if not servers:
        print("Lỗi: Không thể mở cổng nào!")
        return

    print("============================================================")
    print("  HỆ THỐNG QUẢN LÝ NỘP BÀI & ĐIỂM SỐ - CÔ LINH")
    for p, _ in servers:
        print(f"  👉 http://localhost:{p}")
    print(f"  Thư mục tĩnh: {PUBLIC_DIR}")
    print("============================================================")

    for p, srv in servers[1:]:
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()

    try:
        servers[0][1].serve_forever()
    except KeyboardInterrupt:
        print("\nĐang tắt máy chủ...")
        for _, srv in servers:
            srv.server_close()

if __name__ == "__main__":
    run_server()

