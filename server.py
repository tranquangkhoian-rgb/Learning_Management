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
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def end_headers(self):
        if not getattr(self, "_headers_ended", False):
            if not self.path.startswith("/api/qr"):
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
        super().end_headers()

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

        elif path == "/api/animal-groups":
            return self.send_json(database.get_animal_groups_config())

        elif path == "/api/students/passwords":
            return self.send_json(database.get_student_passwords())

        elif path == "/api/students/group-history":
            sid = query.get("student_id", [None])[0]
            subj = query.get("subject", [None])[0]
            return self.send_json(database.get_group_change_history(sid, subj))

        elif path.startswith("/api/students/"):
            try:
                sid = int(path.split("/")[-1])
                st = database.get_student_by_id(sid)
                return self.send_json(st if st else {"error": "Not found"}, 200 if st else 404)
            except ValueError:
                return self.send_json({"error": "Invalid student ID"}, 400)

        elif path == "/api/assignments":
            return self.send_json(database.get_assignments())

        elif path.startswith("/api/assignments/") and path.endswith("/competency-analysis"):
            try:
                aid = int(path.split("/")[3])
                comp = database.get_assignment_competency_analysis(aid)
                return self.send_json(comp if comp else {"error": "Not found"}, 200 if comp else 404)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/assignments/") and path.endswith("/analysis"):
            try:
                aid = int(path.split("/")[3])
                analysis = database.get_assignment_analysis(aid)
                return self.send_json(analysis if analysis else {"error": "Not found"}, 200 if analysis else 404)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/assignments/"):
            try:
                aid = int(path.split("/")[-1])
                asg = database.get_assignment_by_id(aid)
                return self.send_json(asg if asg else {"error": "Not found"}, 200 if asg else 404)
            except ValueError:
                return self.send_json({"error": "Invalid assignment ID"}, 400)

        elif path == "/api/bottlenecks":
            aid = query.get("assignment_id", [None])[0]
            return self.send_json(database.get_learning_bottlenecks(int(aid) if aid and aid.isdigit() else None))

        elif path == "/api/remediation-plans":
            aid = query.get("assignment_id", [None])[0]
            status = query.get("status", [None])[0]
            return self.send_json(database.get_remediation_plans(int(aid) if aid and aid.isdigit() else None, status))

        elif path == "/api/spelling-stats":
            sid = query.get("student_id", [None])[0]
            return self.send_json(database.get_spelling_statistics(int(sid) if sid and sid.isdigit() else None))

        elif path.startswith("/api/student-growth/"):
            try:
                sid = int(path.split("/")[-1])
                growth = database.get_student_growth_profile(sid)
                return self.send_json(growth if growth else {"error": "Not found"}, 200 if growth else 404)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

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

        elif path.startswith("/api/student-reading-summary/"):
            try:
                sid = path.split("/")[-1]
                summary = database.get_student_reading_summary(sid)
                if summary is None:
                    return self.send_json({"error": "Student not found"}, 404)
                return self.send_json(summary)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/history":
            sid = query.get("student_id", [None])[0]
            aid = query.get("assignment_id", [None])[0]
            if sid and aid:
                return self.send_json(database.get_submission_history(int(sid), int(aid)))
            return self.send_json({"error": "Missing student_id or assignment_id"}, 400)

        elif path == "/api/books":
            q = query.get("q", [""])[0]
            cat = query.get("category", [""])[0]
            return self.send_json(database.get_books(q, cat))

        elif path.startswith("/api/books/"):
            bid = path.split("/")[-1]
            book = database.get_book_by_code(bid) if not bid.isdigit() else database.get_book_by_id(int(bid))
            return self.send_json(book if book else {"error": "Book not found"}, 200 if book else 404)

        elif path == "/api/loans":
            return self.send_json(database.get_active_loans())

        elif path == "/api/race":
            return self.send_json(database.get_reading_race())

        elif path == "/api/library/stats":
            return self.send_json(database.get_library_stats())

        elif path == "/api/teams":
            return self.send_json(database.get_teams())

        elif path.startswith("/api/teams/"):
            try:
                tid = int(path.split("/")[-1])
                t = database.get_team_by_id(tid)
                return self.send_json(t if t else {"error": "Team not found"}, 200 if t else 404)
            except ValueError:
                return self.send_json({"error": "Invalid team ID"}, 400)

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
            order_num = body.get("order_num")
            birthday = body.get("birthday", "")
            homeroom_group = body.get("homeroom_group", "Nhóm 1")
            math_group = body.get("math_group", "cat")
            viet_group = body.get("viet_group", "cat")
            class_name = body.get("class_name", "Lớp 3A7")
            if not code or not name:
                return self.send_json({"error": "Mã và Tên học sinh là bắt buộc!"}, 400)
            st = database.add_student(code, name, gender, order_num=order_num, class_name=class_name, birthday=birthday, homeroom_group=homeroom_group, math_group=math_group, viet_group=viet_group)
            return self.send_json(st, 201)

        elif path == "/api/students/bulk-group":
            try:
                sids = body.get("student_ids", [])
                g_type = body.get("group_type", "homeroom")
                new_grp = body.get("new_group", "")
                changed_by = body.get("changed_by", "Cô Linh")
                reason = body.get("reason", "")
                res = database.bulk_update_student_groups(sids, g_type, new_grp, changed_by, reason)
                return self.send_json({"success": True, "count": len(res), "students": res})
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/students/import":
            try:
                st_list = body.get("students", [])
                replace = body.get("replace", False)
                res = database.import_students_batch(st_list, replace=replace)
                return self.send_json(res)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/students/") and path.split("/")[-1].isdigit():
            try:
                sid = int(path.split("/")[-1])
                st = database.update_student(
                    sid,
                    body.get("full_name", ""),
                    body.get("gender", "Nam"),
                    body.get("code", ""),
                    order_num=body.get("order_num"),
                    birthday=body.get("birthday", ""),
                    homeroom_group=body.get("homeroom_group"),
                    math_group=body.get("math_group"),
                    viet_group=body.get("viet_group"),
                    class_name=body.get("class_name"),
                    changed_by=body.get("changed_by", "Cô Linh"),
                    reason=body.get("reason", "")
                )
                return self.send_json(st)
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        elif path == "/api/students/reset":
            st_list = database.reset_students_to_default()
            return self.send_json(st_list)

        elif path == "/api/students/reset-all-passwords":
            default_pwd = body.get("password", "1234")
            database.reset_all_student_passwords(default_pwd)
            return self.send_json({"success": True, "password": default_pwd})

        elif path.startswith("/api/students/") and path.endswith("/password"):
            try:
                sid = path.split("/")[-2]
                new_pwd = body.get("password", "1234")
                database.update_student_password(sid, new_pwd)
                return self.send_json({"success": True, "student_id": sid, "password": new_pwd})
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/students/") and path.endswith("/animal-group"):
            try:
                sid = path.split("/")[-2]
                group = body.get("animal_group", "orange_cat")
                symbol = body.get("animal_symbol")
                title = body.get("animal_title")
                res = database.update_student_animal_group(sid, group, symbol, title)
                return self.send_json(res)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/students/") and path.endswith("/subject-animal"):
            try:
                sid = path.split("/")[-2]
                subject = body.get("subject", "Toán")
                group = body.get("animal_group", "orange_cat")
                symbol = body.get("animal_symbol")
                title = body.get("animal_title")
                res = database.update_student_subject_animal(sid, subject, group, symbol, title)
                return self.send_json(res)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path.startswith("/api/students/") and path.endswith("/color-group"):
            try:
                sid = path.split("/")[-2]
                g_name = body.get("group_name", "Nhóm 1")
                g_color = body.get("group_color", "#3B82F6")
                sync_group = body.get("sync_group", True)
                res = database.update_student_color_group(sid, g_name, g_color, sync_all_in_group=sync_group)
                return self.send_json(res)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/students/verify-password":
            sid = body.get("student_id") or body.get("code")
            pwd = body.get("password", "")
            if not sid:
                return self.send_json({"error": "Thiếu mã hoặc ID học sinh"}, 400)
            valid = database.verify_student_password(sid, pwd)
            return self.send_json({"success": valid, "valid": valid})

        elif path == "/api/teams":
            name = body.get("name", "").strip()
            if not name:
                return self.send_json({"error": "Tên nhóm là bắt buộc!"}, 400)
            color = body.get("color", "#3B82F6")
            icon = body.get("icon", "⭐")
            image = body.get("image", "")
            motto = body.get("motto", "")
            member_ids = body.get("member_ids", [])
            max_capacity = int(body.get("max_capacity", 0))
            team = database.create_team(name, color=color, icon=icon, image=image, motto=motto, member_ids=member_ids, max_capacity=max_capacity)
            return self.send_json(team, 201)

        elif path == "/api/assignments":
            title = body.get("title", "")
            subject = body.get("subject", "Toán")
            assigned_date = body.get("assigned_date", datetime.now().strftime("%Y-%m-%d"))
            due_date = body.get("due_date", "")
            max_score = body.get("max_score", 10.0)
            notes = body.get("notes", "")
            questions = body.get("questions")
            goals = body.get("goals", "")
            questions_data = body.get("questions_data")
            subject_type = body.get("subject_type", "toan")

            if not title or not due_date:
                return self.send_json({"error": "Tên bài tập và Hạn nộp là bắt buộc!"}, 400)

            asg = database.add_assignment(title, subject, assigned_date, due_date, max_score, notes, questions=questions, goals=goals, questions_data=questions_data, subject_type=subject_type)
            return self.send_json(asg, 201)

        elif path == "/api/remediation-plans":
            asg_id = body.get("assignment_id")
            target_code = body.get("target_code", "MT1")
            target_name = body.get("target_name", "")
            skill_name = body.get("skill_name", "")
            group_name = body.get("group_name", "Nhóm rèn luyện")
            student_ids = body.get("student_ids", [])
            supplementary_task = body.get("supplementary_task", "")
            start_date = body.get("start_date", datetime.now().strftime("%Y-%m-%d"))
            notes = body.get("notes", "")
            questions = body.get("questions", [])
            plan = database.create_remediation_plan(asg_id, target_code, target_name, skill_name, group_name, student_ids, supplementary_task, start_date, notes, questions=questions)
            return self.send_json(plan, 201)

        elif path.startswith("/api/remediation-plans/") and path.endswith("/reassess"):
            try:
                plan_id = int(path.split("/")[3])
                st_id = body.get("student_id")
                score = body.get("score")
                max_score = body.get("max_score", 10.0)
                status = body.get("status", "Đã đạt")
                note = body.get("note", "")
                operator = body.get("operator", "Cô Linh")
                res = database.record_reassessment(plan_id, st_id, score, max_score=max_score, status=status, note=note, operator=operator)
                return self.send_json(res)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

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
            # Teacher grades assignment (single or batch)
            student_ids = body.get("student_ids")
            student_id = body.get("student_id")
            assignment_id = body.get("assignment_id")
            score = body.get("score")
            status = body.get("status")
            teacher_note = body.get("teacher_note", "")
            operator = body.get("operator", "Cô Linh")
            question_details = body.get("question_details")
            animal_group = body.get("animal_group")
            animal_symbol = body.get("animal_symbol")
            animal_title = body.get("animal_title")
            spelling_errors = body.get("spelling_errors", 0)
            spelling_error_types = body.get("spelling_error_types")
            writing_rubrics = body.get("writing_rubrics")

            if not assignment_id or (not student_id and not student_ids):
                return self.send_json({"error": "Thiếu student_id/student_ids hoặc assignment_id!"}, 400)

            if student_ids and isinstance(student_ids, list):
                res = database.record_grading_batch(student_ids, int(assignment_id), score, status, teacher_note, operator=operator, question_details=question_details, animal_group=animal_group, animal_symbol=animal_symbol, animal_title=animal_title, spelling_errors=spelling_errors, spelling_error_types=spelling_error_types, writing_rubrics=writing_rubrics)
                for item in res.get("results", []):
                    st = item.get("student")
                    asg = item.get("assignment")
                    if st and asg:
                        sync_payload = {
                            "action": "log_event",
                            "event_type": "grade",
                            "timestamp": item.get("graded_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                            "student_code": st["code"],
                            "student_name": st["full_name"],
                            "class_name": st["class_name"],
                            "assignment_title": asg["title"],
                            "subject": asg["subject"],
                            "attempt_number": item.get("attempt_number", 1),
                            "is_late": "",
                            "score": item.get("score"),
                            "status": item.get("status"),
                            "teacher_note": item.get("teacher_note"),
                            "operator": operator
                        }
                        async_sync_to_google_sheet(sync_payload)
                return self.send_json(res)

            res = database.record_grading(student_id, int(assignment_id), score, status, teacher_note, operator=operator, question_details=question_details, animal_group=animal_group, animal_symbol=animal_symbol, animal_title=animal_title, spelling_errors=spelling_errors, spelling_error_types=spelling_error_types, writing_rubrics=writing_rubrics)
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

        elif path == "/api/books":
            title = body.get("title", "")
            if not title:
                return self.send_json({"error": "Tiêu đề sách là bắt buộc!"}, 400)
            nb = database.add_book(
                title=title,
                author=body.get("author", ""),
                category=body.get("category", "Truyện hay"),
                shelf_code=body.get("shelf_code", "K1"),
                contributed_by=body.get("contributed_by", "Thư viện lớp"),
                condition=body.get("condition", "Tốt")
            )
            return self.send_json(nb, 201)

        elif path == "/api/loans/borrow":
            student_id = body.get("student_id") or body.get("student_code")
            book_id = body.get("book_id") or body.get("book_code") or body.get("book_stt")
            due_days = int(body.get("due_days", 14))
            notes = body.get("notes", "")
            if not student_id or not book_id:
                return self.send_json({"error": "Cần cung cấp mã học sinh và mã sách!"}, 400)
            try:
                loan = database.borrow_book(student_id, book_id, due_days, notes)
                return self.send_json(loan, 201)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/loans/return":
            book_id = body.get("book_id") or body.get("book_code") or body.get("book_stt")
            notes = body.get("notes", "")
            if not book_id:
                return self.send_json({"error": "Cần cung cấp mã sách hoặc STT sách để trả!"}, 400)
            try:
                ret = database.return_book(book_id, notes)
                return self.send_json(ret, 200)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/race/update":
            student_id = body.get("student_id")
            delta = int(body.get("delta", 1)) if "delta" in body else 1
            set_completed = body.get("completed")
            avatar = body.get("avatar")
            if not student_id:
                return self.send_json({"error": "Missing student_id"}, 400)
            try:
                race = database.update_reading_race(int(student_id), delta=delta, set_completed=set_completed, avatar=avatar)
                return self.send_json(race)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/books/update":
            book_id = body.get("id") or body.get("book_id")
            if not book_id:
                return self.send_json({"error": "Missing book_id"}, 400)
            try:
                updated_b = database.update_book(int(book_id), body)
                return self.send_json(updated_b)
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/books/delete":
            book_id = body.get("id") or body.get("book_id")
            if not book_id:
                return self.send_json({"error": "Missing book_id"}, 400)
            try:
                database.delete_book(int(book_id))
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

        elif path == "/api/books/import-excel":
            replace = bool(body.get("replace", False))
            if "file_base64" in body and body["file_base64"]:
                import base64
                try:
                    raw_b = base64.b64decode(body["file_base64"])
                    rows = database.parse_excel_books(raw_b)
                except Exception as e:
                    return self.send_json({"error": f"Lỗi đọc file Excel: {e}"}, 400)
            elif "rows" in body and isinstance(body["rows"], list):
                rows = body["rows"]
            else:
                return self.send_json({"error": "Thiếu dữ liệu file Excel (file_base64 hoặc rows)"}, 400)

            try:
                imported = database.import_books_from_rows(rows, replace=replace)
                return self.send_json({"success": True, "count": len(imported), "books": imported})
            except Exception as e:
                return self.send_json({"error": str(e)}, 400)

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
                    order_num=body.get("order_num"),
                    birthday=body.get("birthday", ""),
                    homeroom_group=body.get("homeroom_group"),
                    math_group=body.get("math_group"),
                    viet_group=body.get("viet_group"),
                    class_name=body.get("class_name"),
                    changed_by=body.get("changed_by", "Cô Linh"),
                    reason=body.get("reason", "")
                )
                return self.send_json(st)
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        elif path.startswith("/api/teams/"):
            try:
                tid = int(path.split("/")[-1])
                name = body.get("name", "").strip()
                if not name:
                    return self.send_json({"error": "Tên nhóm không được để trống!"}, 400)
                color = body.get("color", "#3B82F6")
                icon = body.get("icon", "⭐")
                image = body.get("image", "")
                motto = body.get("motto", "")
                member_ids = body.get("member_ids")
                max_capacity = int(body.get("max_capacity", 0)) if "max_capacity" in body else None
                updated = database.update_team(tid, name, color=color, icon=icon, image=image, motto=motto, member_ids=member_ids, max_capacity=max_capacity)
                return self.send_json(updated)
            except ValueError:
                return self.send_json({"error": "Invalid team ID"}, 400)

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
                    body.get("notes", ""),
                    questions=body.get("questions"),
                    goals=body.get("goals"),
                    questions_data=body.get("questions_data"),
                    subject_type=body.get("subject_type")
                )
                return self.send_json(asg)
            except ValueError:
                return self.send_json({"error": "Invalid ID"}, 400)

        elif path.startswith("/api/books/"):
            try:
                bid = int(path.split("/")[-1])
                updated_b = database.update_book(bid, body)
                return self.send_json(updated_b)
            except ValueError:
                return self.send_json({"error": "Invalid book ID"}, 400)

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/teams/"):
            try:
                tid = int(path.split("/")[-1])
                database.delete_team(tid)
                return self.send_json({"success": True})
            except ValueError:
                return self.send_json({"error": "Invalid team ID"}, 400)

        elif path.startswith("/api/students/"):
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

        elif path.startswith("/api/books/"):
            try:
                bid = int(path.split("/")[-1])
                database.delete_book(bid)
                return self.send_json({"success": True})
            except ValueError:
                return self.send_json({"error": "Invalid book ID"}, 400)

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

