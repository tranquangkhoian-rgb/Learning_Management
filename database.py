"""
Database management module for Learning Management System (LMS - Cô Linh)
Uses SQLite standard library.
Stores:
- Students (30 students with QR code)
- Assignments
- Submission Events (Full immutable history log: Submit 1 -> Grade 1 -> Fix -> Submit 2 -> Grade 2)
- Settings (Class name, Teacher PIN, Google Sheets Webhook URL)
"""

import os
import sqlite3
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "learning.db")

def get_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Create tables if not exist and seed initial data for class of 30 students."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        gender TEXT DEFAULT 'Nam',
        birthday TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        class_name TEXT DEFAULT 'Lớp 3A',
        order_num INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        assigned_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        max_score REAL DEFAULT 10.0,
        notes TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submission_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL, -- 'submit', 'grade', 'edit'
        attempt_number INTEGER NOT NULL, -- Lần thứ mấy (1, 2, 3...)
        timestamp TEXT NOT NULL,
        is_late INTEGER DEFAULT 0,
        score REAL DEFAULT NULL,
        status TEXT DEFAULT 'Đã nộp', -- 'Đã nộp', 'Đã đạt', 'Cần sửa', 'Cần nộp lại', 'Chưa hoàn thành', 'Chưa nộp'
        teacher_note TEXT DEFAULT '',
        operator TEXT DEFAULT 'Học sinh',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Settings
    default_settings = {
        "teacher_name": "Cô Linh",
        "class_name": "Lớp 3A7",
        "teacher_pin": "1234",
        "school_name": "Trường Tiểu Học Ánh Dương",
        "google_sheet_url": "",
        "auto_sync_sheets": "true"
    }
    for key, val in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))
    cursor.execute("UPDATE settings SET value = 'Lớp 3A7' WHERE key = 'class_name' AND value = 'Lớp 3A'")

    # Seed 29 students of Lớp 3A7 from 3a7.xlsx
    seed_students = [
        ("HS01", "Vỹ An", "Nữ", 1),
        ("HS02", "Tuệ An", "Nữ", 2),
        ("HS03", "Lam Anh", "Nữ", 3),
        ("HS04", "Minh Anh", "Nữ", 4),
        ("HS05", "Hoàng Ân", "Nam", 5),
        ("HS06", "Gia Bảo", "Nam", 6),
        ("HS07", "Lan Chi", "Nữ", 7),
        ("HS08", "Thiên Di", "Nữ", 8),
        ("HS09", "Hải Đăng", "Nam", 9),
        ("HS10", "Minh Hoàng", "Nam", 10),
        ("HS11", "Phúc Hưng", "Nam", 11),
        ("HS12", "Gia Hào", "Nam", 12),
        ("HS13", "An Khang", "Nam", 13),
        ("HS14", "Đăng Khang", "Nam", 14),
        ("HS15", "Chí Khôi", "Nam", 15),
        ("HS16", "Phương Lâm", "Nữ", 16),
        ("HS17", "Phúc Lâm", "Nam", 17),
        ("HS18", "Tuệ Linh", "Nữ", 18),
        ("HS19", "Hà Linh", "Nữ", 19),
        ("HS20", "Hà My", "Nữ", 20),
        ("HS21", "Thiện Nhân", "Nam", 21),
        ("HS22", "Mộc Nhi", "Nữ", 22),
        ("HS23", "Hạ Nhiên", "Nữ", 23),
        ("HS24", "Thanh Phương", "Nữ", 24),
        ("HS25", "Minh Phương", "Nữ", 25),
        ("HS26", "Gia Phát", "Nam", 26),
        ("HS27", "Minh Tân", "Nam", 27),
        ("HS28", "Minh Thư", "Nữ", 28),
        ("HS29", "Tấn Tài", "Nam", 29),
    ]

    cursor.execute("SELECT COUNT(*) FROM students")
    count = cursor.fetchone()[0]
    if count == 0 or count == 30: # Migrate from old 30 generic students to 29 3A7 students
        cursor.execute("DELETE FROM submission_events")
        cursor.execute("DELETE FROM students")
        cursor.executemany(
            "INSERT INTO students (code, full_name, gender, order_num, class_name) VALUES (?, ?, ?, ?, 'Lớp 3A7')",
            seed_students
        )

    # Check if assignments exist, if not seed 2 sample assignments
    cursor.execute("SELECT COUNT(*) FROM assignments")
    asgn_count = cursor.fetchone()[0]
    if asgn_count == 0:
        now = datetime.now()
        cursor.execute("""
            INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "Phiếu bài tập Toán: Phép nhân và phép chia trong phạm vi 1000",
            "Toán",
            now.strftime("%Y-%m-%d"),
            now.strftime("%Y-%m-%d 23:59"),
            10.0,
            "Học sinh hoàn thành các bài tập trong phiếu và nộp vở tại góc nộp bài."
        ))
        asgn_id1 = cursor.lastrowid

        yesterday = datetime.fromtimestamp(now.timestamp() - 86400)
        cursor.execute("""
            INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "Chính tả & Luyện từ và câu: Mùa thu yêu thương",
            "Tiếng Việt",
            yesterday.strftime("%Y-%m-%d"),
            yesterday.strftime("%Y-%m-%d 17:00"),
            10.0,
            "Viết bài chính tả sạch đẹp, rèn chữ giữ vở."
        ))
        asgn_id2 = cursor.lastrowid

        # Add some initial sample submission events to demonstrate the workflow
        # HS01: On-time -> Graded Đã đạt 10
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (1, ?, 'submit', 1, ?, 0, NULL, 'Đã nộp', '', 'Học sinh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 08:30:00")))
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (1, ?, 'grade', 1, ?, 0, 10.0, 'Đã đạt', 'Bài làm rất sạch đẹp và chuẩn xác!', 'Cô Linh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 09:15:00")))

        # HS02: Submit 1 -> Graded 6 (Cần sửa) -> Resubmit 2 -> Graded 9.5 (Đã đạt)
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (2, ?, 'submit', 1, ?, 0, NULL, 'Đã nộp', '', 'Học sinh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 08:35:00")))
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (2, ?, 'grade', 1, ?, 0, 6.0, 'Cần sửa', 'Em xem lại câu 3 tính nhầm phép chia nhé.', 'Cô Linh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 09:20:00")))
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (2, ?, 'submit', 2, ?, 0, NULL, 'Đã nộp lại', '', 'Học sinh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 10:10:00")))
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (2, ?, 'grade', 2, ?, 0, 9.5, 'Đã đạt', 'Đã sửa chính xác câu 3, rất tiến bộ!', 'Cô Linh')
        """, (asgn_id1, now.strftime("%Y-%m-%d 10:30:00")))

        # HS03: Late submission
        cursor.execute("""
            INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
            VALUES (3, ?, 'submit', 1, ?, 1, NULL, 'Đã nộp', '', 'Học sinh')
        """, (asgn_id2, now.strftime("%Y-%m-%d 08:45:00")))

    conn.commit()
    conn.close()

# --- Settings ---
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings

def update_settings(data):
    conn = get_db()
    cursor = conn.cursor()
    for key, val in data.items():
        cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, str(val)))
    conn.commit()
    conn.close()
    return get_settings()

# --- Students ---
def get_students(include_inactive=False):
    conn = get_db()
    cursor = conn.cursor()
    if include_inactive:
        cursor.execute("SELECT * FROM students ORDER BY order_num ASC, code ASC")
    else:
        cursor.execute("SELECT * FROM students WHERE is_active = 1 ORDER BY order_num ASC, code ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_student_by_code(code):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE code = ? AND is_active = 1", (code.strip().upper(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_student_by_id(student_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_student(code, full_name, gender="Nam", order_num=None, class_name="Lớp 3A7"):
    conn = get_db()
    cursor = conn.cursor()
    code = code.strip().upper()
    if order_num is None:
        cursor.execute("SELECT COALESCE(MAX(order_num), 0) + 1 FROM students")
        order_num = cursor.fetchone()[0]
    cursor.execute("""
        INSERT INTO students (code, full_name, gender, order_num, class_name)
        VALUES (?, ?, ?, ?, ?)
    """, (code, full_name.strip(), gender, order_num, class_name))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_student_by_id(new_id)

def update_student(student_id, full_name, gender, code, order_num=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE students
        SET full_name = ?, gender = ?, code = ?, order_num = COALESCE(?, order_num)
        WHERE id = ?
    """, (full_name.strip(), gender, code.strip().upper(), order_num, student_id))
    conn.commit()
    conn.close()
    return get_student_by_id(student_id)

def delete_student(student_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE students SET is_active = 0 WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return True

def reset_students_to_default():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE students SET is_active = 0")
    seed_students = [
        ("HS01", "Vỹ An", "Nữ", 1),
        ("HS02", "Tuệ An", "Nữ", 2),
        ("HS03", "Lam Anh", "Nữ", 3),
        ("HS04", "Minh Anh", "Nữ", 4),
        ("HS05", "Hoàng Ân", "Nam", 5),
        ("HS06", "Gia Bảo", "Nam", 6),
        ("HS07", "Lan Chi", "Nữ", 7),
        ("HS08", "Thiên Di", "Nữ", 8),
        ("HS09", "Hải Đăng", "Nam", 9),
        ("HS10", "Minh Hoàng", "Nam", 10),
        ("HS11", "Phúc Hưng", "Nam", 11),
        ("HS12", "Gia Hào", "Nam", 12),
        ("HS13", "An Khang", "Nam", 13),
        ("HS14", "Đăng Khang", "Nam", 14),
        ("HS15", "Chí Khôi", "Nam", 15),
        ("HS16", "Phương Lâm", "Nữ", 16),
        ("HS17", "Phúc Lâm", "Nam", 17),
        ("HS18", "Tuệ Linh", "Nữ", 18),
        ("HS19", "Hà Linh", "Nữ", 19),
        ("HS20", "Hà My", "Nữ", 20),
        ("HS21", "Thiện Nhân", "Nam", 21),
        ("HS22", "Mộc Nhi", "Nữ", 22),
        ("HS23", "Hạ Nhiên", "Nữ", 23),
        ("HS24", "Thanh Phương", "Nữ", 24),
        ("HS25", "Minh Phương", "Nữ", 25),
        ("HS26", "Gia Phát", "Nam", 26),
        ("HS27", "Minh Tân", "Nam", 27),
        ("HS28", "Minh Thư", "Nữ", 28),
        ("HS29", "Tấn Tài", "Nam", 29),
    ]
    for code, name, gender, order_num in seed_students:
        cursor.execute("SELECT id FROM students WHERE code = ?", (code,))
        row = cursor.fetchone()
        if row:
            cursor.execute("""
                UPDATE students
                SET full_name = ?, gender = ?, order_num = ?, is_active = 1, class_name = 'Lớp 3A7'
                WHERE id = ?
            """, (name, gender, order_num, row[0]))
        else:
            cursor.execute("""
                INSERT INTO students (code, full_name, gender, order_num, class_name, is_active)
                VALUES (?, ?, ?, ?, 'Lớp 3A7', 1)
            """, (code, name, gender, order_num))
    conn.commit()
    conn.close()
    return get_students()

# --- Assignments ---
def get_assignments(include_inactive=False):
    conn = get_db()
    cursor = conn.cursor()
    if include_inactive:
        cursor.execute("SELECT * FROM assignments ORDER BY id DESC")
    else:
        cursor.execute("SELECT * FROM assignments WHERE is_active = 1 ORDER BY id DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_assignment_by_id(assignment_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_assignment(title, subject, assigned_date, due_date, max_score=10.0, notes=""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (title.strip(), subject.strip(), assigned_date, due_date, float(max_score), notes.strip()))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_assignment_by_id(new_id)

def update_assignment(assignment_id, title, subject, assigned_date, due_date, max_score, notes):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE assignments
        SET title = ?, subject = ?, assigned_date = ?, due_date = ?, max_score = ?, notes = ?
        WHERE id = ?
    """, (title.strip(), subject.strip(), assigned_date, due_date, float(max_score), notes.strip(), assignment_id))
    conn.commit()
    conn.close()
    return get_assignment_by_id(assignment_id)

def delete_assignment(assignment_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE assignments SET is_active = 0 WHERE id = ?", (assignment_id,))
    conn.commit()
    conn.close()
    return True

# --- Submission & Grading Engine (Full Audit Log) ---
def record_submission(student_code_or_id, assignment_id, operator="Học sinh"):
    """
    Called when a student or teacher scans QR code to submit work.
    Determines attempt number, checks if late, records event, returns detailed status.
    NEVER overwrites old data!
    """
    conn = get_db()
    cursor = conn.cursor()

    # Find student
    if isinstance(student_code_or_id, int) or str(student_code_or_id).isdigit():
        student = get_student_by_id(int(student_code_or_id))
    else:
        student = get_student_by_code(str(student_code_or_id))

    if not student:
        conn.close()
        return {"success": False, "error": f"Không tìm thấy học sinh với mã '{student_code_or_id}'!"}

    assignment = get_assignment_by_id(assignment_id)
    if not assignment:
        conn.close()
        return {"success": False, "error": "Không tìm thấy bài tập đã chọn!"}

    # Count previous submissions
    cursor.execute("""
        SELECT COUNT(*) FROM submission_events
        WHERE student_id = ? AND assignment_id = ? AND event_type IN ('submit', 'resubmit')
    """, (student["id"], assignment["id"]))
    prev_submit_count = cursor.fetchone()[0]
    attempt_num = prev_submit_count + 1

    # Check deadline
    now_dt = datetime.now()
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    is_late = 0
    try:
        # Expecting due_date format: YYYY-MM-DD HH:MM or YYYY-MM-DD
        due_str = assignment["due_date"]
        if len(due_str) == 10:
            due_str += " 23:59:59"
        elif len(due_str) == 16:
            due_str += ":00"
        due_dt = datetime.strptime(due_str, "%Y-%m-%d %H:%M:%S")
        if now_dt > due_dt:
            is_late = 1
    except Exception:
        is_late = 0

    event_type = 'submit' if attempt_num == 1 else 'resubmit'
    status_label = 'Đã nộp lại' if attempt_num > 1 else 'Đã nộp'

    cursor.execute("""
        INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '', ?)
    """, (student["id"], assignment["id"], event_type, attempt_num, now_str, is_late, status_label, operator))
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "event_id": event_id,
        "student": student,
        "assignment": assignment,
        "attempt_number": attempt_num,
        "is_late": bool(is_late),
        "status": status_label,
        "submitted_at": now_str
    }

def record_grading(student_id, assignment_id, score, status, teacher_note="", operator="Cô Linh"):
    """
    Teacher grades a student's work.
    Saves a new 'grade' event without overwriting previous attempts.
    """
    conn = get_db()
    cursor = conn.cursor()

    student = get_student_by_id(student_id)
    assignment = get_assignment_by_id(assignment_id)
    if not student or not assignment:
        conn.close()
        return {"success": False, "error": "Học sinh hoặc bài tập không hợp lệ!"}

    # Find the current attempt number (based on latest submit)
    cursor.execute("""
        SELECT COALESCE(MAX(attempt_number), 1) FROM submission_events
        WHERE student_id = ? AND assignment_id = ?
    """, (student["id"], assignment["id"]))
    attempt_num = cursor.fetchone()[0]

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    score_val = float(score) if (score is not None and str(score).strip() != "") else None

    # Valid statuses: 'Đã đạt', 'Cần sửa', 'Cần nộp lại', 'Chưa hoàn thành'
    valid_statuses = ['Đã đạt', 'Cần sửa', 'Cần nộp lại', 'Chưa hoàn thành']
    if status not in valid_statuses:
        status = 'Đã đạt'

    cursor.execute("""
        INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
        VALUES (?, ?, 'grade', ?, ?, 0, ?, ?, ?, ?)
    """, (student["id"], assignment["id"], attempt_num, now_str, score_val, status, teacher_note.strip(), operator))
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "event_id": event_id,
        "student": student,
        "assignment": assignment,
        "attempt_number": attempt_num,
        "score": score_val,
        "status": status,
        "teacher_note": teacher_note,
        "graded_at": now_str
    }

def get_submission_history(student_id, assignment_id):
    """Get full audit timeline of all submissions and grading actions for a student in an assignment."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM submission_events
        WHERE student_id = ? AND assignment_id = ?
        ORDER BY id ASC
    """, (student_id, assignment_id))
    events = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return events

# --- Section 6: Bảng theo dõi nhanh của từng bài ---
def get_assignment_tracking_matrix(assignment_id):
    """
    Returns full tracking table for an assignment:
    - STT
    - Họ tên học sinh
    - Trạng thái hiện tại (Chưa nộp / Đã nộp đúng hạn / Nộp trễ / Cần sửa / Đã nộp lại / Đã hoàn thành / Chưa hoàn thành)
    - Thời gian nộp gần nhất
    - Đúng hạn hay trễ hạn
    - Số lần đã nộp
    - Số lần phải làm lại
    - Điểm lần đầu
    - Điểm gần nhất
    - Nhận xét gần nhất
    - Lịch sử đầy đủ
    """
    conn = get_db()
    cursor = conn.cursor()

    assignment = get_assignment_by_id(assignment_id)
    if not assignment:
        conn.close()
        return None

    students = get_students(include_inactive=False)

    cursor.execute("""
        SELECT * FROM submission_events
        WHERE assignment_id = ?
        ORDER BY student_id ASC, id ASC
    """, (assignment_id,))
    all_events = [dict(r) for r in cursor.fetchall()]
    conn.close()

    events_by_student = {}
    for ev in all_events:
        sid = ev["student_id"]
        if sid not in events_by_student:
            events_by_student[sid] = []
        events_by_student[sid].append(ev)

    matrix = []
    for st in students:
        sid = st["id"]
        s_events = events_by_student.get(sid, [])

        submit_events = [e for e in s_events if e["event_type"] in ('submit', 'resubmit')]
        grade_events = [e for e in s_events if e["event_type"] == 'grade']

        submit_count = len(submit_events)
        # Số lần phải làm lại = số lần nhận trạng thái 'Cần sửa' hoặc 'Cần nộp lại'
        retry_count = len([e for e in grade_events if e["status"] in ('Cần sửa', 'Cần nộp lại')])

        scores = [e["score"] for e in grade_events if e["score"] is not None]
        first_score = scores[0] if len(scores) > 0 else None
        latest_score = scores[-1] if len(scores) > 0 else None

        latest_note = ""
        for g in reversed(grade_events):
            if g["teacher_note"]:
                latest_note = g["teacher_note"]
                break

        latest_submit_time = submit_events[-1]["timestamp"] if submit_events else ""
        is_latest_late = submit_events[-1]["is_late"] == 1 if submit_events else False

        # Determine current status
        # Color codes:
        # Green: Đã hoàn thành (status == 'Đã đạt')
        # Yellow: Cần sửa (status == 'Cần sửa' or 'Cần nộp lại')
        # Orange: Nộp trễ (submitted after deadline, not yet marked complete)
        # Red: Chưa nộp (submit_count == 0)
        # Blue: Đã nộp lại (resubmitted, waiting for re-grading)
        if submit_count == 0:
            current_status = "Chưa nộp"
            color_group = "red"
        else:
            latest_event = s_events[-1]
            if latest_event["event_type"] in ('submit', 'resubmit'):
                if submit_count > 1:
                    current_status = "Đã nộp lại"
                    color_group = "blue"
                else:
                    if is_latest_late:
                        current_status = "Nộp trễ"
                        color_group = "orange"
                    else:
                        current_status = "Đã nộp đúng hạn"
                        color_group = "blue"
            else: # latest event is grade
                if latest_event["status"] == "Đã đạt":
                    current_status = "Đã hoàn thành"
                    color_group = "green"
                elif latest_event["status"] in ("Cần sửa", "Cần nộp lại"):
                    current_status = "Đang cần sửa"
                    color_group = "yellow"
                elif latest_event["status"] == "Chưa hoàn thành":
                    current_status = "Chưa đạt yêu cầu"
                    color_group = "red"
                else:
                    current_status = latest_event["status"]
                    color_group = "yellow"

        matrix.append({
            "stt": st["order_num"],
            "student_id": st["id"],
            "code": st["code"],
            "full_name": st["full_name"],
            "gender": st["gender"],
            "current_status": current_status,
            "color_group": color_group,
            "latest_submit_time": latest_submit_time,
            "is_late": is_latest_late,
            "submit_count": submit_count,
            "retry_count": retry_count,
            "first_score": first_score,
            "latest_score": latest_score,
            "teacher_note": latest_note,
            "history": s_events
        })

    return {
        "assignment": assignment,
        "matrix": matrix
    }

# --- Section 7: Bảng Thống Kê Tổng Hợp (3 Chiều) ---
def get_comprehensive_analytics():
    """Calculates 3-way analytics: by student, by assignment, and whole class."""
    conn = get_db()
    cursor = conn.cursor()

    students = get_students()
    assignments = get_assignments()

    cursor.execute("SELECT * FROM submission_events ORDER BY id ASC")
    all_events = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_assignments_count = len(assignments)

    # Group events by student and by assignment
    student_stats = []
    assignment_stats = []

    # Map student stats
    for st in students:
        sid = st["id"]
        st_events = [e for e in all_events if e["student_id"] == sid]

        # Assignments submitted at least once
        submitted_asg_ids = set([e["assignment_id"] for e in st_events if e["event_type"] in ('submit', 'resubmit')])
        num_submitted = len(submitted_asg_ids)
        num_missing = max(0, total_assignments_count - num_submitted)

        on_time_count = len([e for e in st_events if e["event_type"] in ('submit', 'resubmit') and e["is_late"] == 0])
        late_count = len([e for e in st_events if e["event_type"] in ('submit', 'resubmit') and e["is_late"] == 1])

        retry_events = [e for e in st_events if e["event_type"] == 'grade' and e["status"] in ('Cần sửa', 'Cần nộp lại')]
        asg_requiring_retry = set([e["assignment_id"] for e in retry_events])
        total_retry_count = len([e for e in st_events if e["event_type"] == 'resubmit'])

        # Completed assignments
        completed_asg_ids = set([e["assignment_id"] for e in st_events if e["event_type"] == 'grade' and e["status"] == 'Đã đạt'])
        num_completed = len(completed_asg_ids)
        num_uncompleted = max(0, total_assignments_count - num_completed)

        # Average score (based on latest score per assignment)
        scores_by_asg = {}
        first_scores = {}
        for e in st_events:
            if e["event_type"] == 'grade' and e["score"] is not None:
                asg_id = e["assignment_id"]
                if asg_id not in first_scores:
                    first_scores[asg_id] = e["score"]
                scores_by_asg[asg_id] = e["score"]

        avg_score = round(sum(scores_by_asg.values()) / len(scores_by_asg), 1) if scores_by_asg else None

        # Check score improvement after correction
        improved_count = 0
        for asg_id in scores_by_asg:
            if asg_id in first_scores and scores_by_asg[asg_id] > first_scores[asg_id]:
                improved_count += 1

        # Missing or needs fix assignments list
        missing_titles = [a["title"] for a in assignments if a["id"] not in submitted_asg_ids]
        need_fix_titles = [a["title"] for a in assignments if a["id"] in asg_requiring_retry and a["id"] not in completed_asg_ids]

        student_stats.append({
            "student_id": st["id"],
            "code": st["code"],
            "full_name": st["full_name"],
            "total_assigned": total_assignments_count,
            "num_submitted": num_submitted,
            "num_missing": num_missing,
            "on_time_count": on_time_count,
            "late_count": late_count,
            "asg_requiring_retry_count": len(asg_requiring_retry),
            "total_resubmit_count": total_retry_count,
            "num_completed": num_completed,
            "num_uncompleted": num_uncompleted,
            "avg_score": avg_score,
            "improved_count": improved_count,
            "missing_assignments": missing_titles,
            "need_fix_assignments": need_fix_titles
        })

    # Map assignment stats
    total_students_count = len(students)
    for asg in assignments:
        aid = asg["id"]
        asg_events = [e for e in all_events if e["assignment_id"] == aid]

        submitted_students = set([e["student_id"] for e in asg_events if e["event_type"] in ('submit', 'resubmit')])
        num_submitted = len(submitted_students)
        num_missing = max(0, total_students_count - num_submitted)

        on_time_students = set([e["student_id"] for e in asg_events if e["event_type"] in ('submit', 'resubmit') and e["is_late"] == 0])
        late_students = set([e["student_id"] for e in asg_events if e["event_type"] in ('submit', 'resubmit') and e["is_late"] == 1])

        need_fix_students = set([e["student_id"] for e in asg_events if e["event_type"] == 'grade' and e["status"] in ('Cần sửa', 'Cần nộp lại')])
        resubmitted_students = set([e["student_id"] for e in asg_events if e["event_type"] == 'resubmit'])
        completed_students = set([e["student_id"] for e in asg_events if e["event_type"] == 'grade' and e["status"] == 'Đã đạt'])

        # Class average score for this assignment
        latest_scores = {}
        for e in asg_events:
            if e["event_type"] == 'grade' and e["score"] is not None:
                latest_scores[e["student_id"]] = e["score"]
        asg_avg_score = round(sum(latest_scores.values()) / len(latest_scores), 1) if latest_scores else None

        assignment_stats.append({
            "assignment_id": asg["id"],
            "title": asg["title"],
            "subject": asg["subject"],
            "due_date": asg["due_date"],
            "total_students": total_students_count,
            "num_submitted": num_submitted,
            "num_missing": num_missing,
            "num_on_time": len(on_time_students),
            "num_late": len(late_students),
            "num_need_fix": len(need_fix_students),
            "num_resubmitted": len(resubmitted_students),
            "num_completed": len(completed_students),
            "class_avg_score": asg_avg_score
        })

    # Whole Class Analytics:
    # 1. Thường xuyên nộp đủ và đúng hạn (on_time_count high, num_missing == 0)
    top_on_time = [s for s in student_stats if s["num_missing"] == 0 and s["late_count"] == 0]
    if not top_on_time:
        top_on_time = sorted(student_stats, key=lambda x: (-x["on_time_count"], x["late_count"]))[:5]

    # 2. Còn thiếu nhiều bài
    top_missing = [s for s in student_stats if s["num_missing"] > 0]
    top_missing = sorted(top_missing, key=lambda x: -x["num_missing"])

    # 3. Thường xuyên nộp trễ
    top_late = [s for s in student_stats if s["late_count"] > 0]
    top_late = sorted(top_late, key=lambda x: -x["late_count"])

    # 4. Phải làm lại nhiều lần
    top_retry = [s for s in student_stats if s["total_resubmit_count"] > 0 or s["asg_requiring_retry_count"] > 0]
    top_retry = sorted(top_retry, key=lambda x: -x["asg_requiring_retry_count"])

    # 5. Có tiến bộ sau khi sửa bài
    top_improved = [s for s in student_stats if s["improved_count"] > 0]
    top_improved = sorted(top_improved, key=lambda x: -x["improved_count"])

    # 6. Tỷ lệ hoàn thành toàn lớp
    total_slots = total_students_count * total_assignments_count if total_assignments_count > 0 else 1
    total_completed_slots = sum(s["num_completed"] for s in student_stats)
    class_completion_rate = round((total_completed_slots / total_slots) * 100, 1)

    return {
        "student_stats": student_stats,
        "assignment_stats": assignment_stats,
        "whole_class": {
            "total_students": total_students_count,
            "total_assignments": total_assignments_count,
            "class_completion_rate": class_completion_rate,
            "top_on_time": top_on_time,
            "top_missing": top_missing,
            "top_late": top_late,
            "top_retry": top_retry,
            "top_improved": top_improved
        }
    }

# --- Section 8: Hồ Sơ Của Từng Học Sinh ---
def get_student_profile(student_id):
    """Returns complete learning profile for one student."""
    student = get_student_by_id(student_id)
    if not student:
        return None

    assignments = get_assignments()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM submission_events
        WHERE student_id = ?
        ORDER BY assignment_id ASC, id ASC
    """, (student_id,))
    events = [dict(r) for r in cursor.fetchall()]
    conn.close()

    events_by_asg = {}
    for ev in events:
        aid = ev["assignment_id"]
        if aid not in events_by_asg:
            events_by_asg[aid] = []
        events_by_asg[aid].append(ev)

    assignment_details = []
    score_trend = []

    for asg in assignments:
        aid = asg["id"]
        a_events = events_by_asg.get(aid, [])

        submits = [e for e in a_events if e["event_type"] in ('submit', 'resubmit')]
        grades = [e for e in a_events if e["event_type"] == 'grade']

        submit_count = len(submits)
        retry_count = len([e for e in grades if e["status"] in ('Cần sửa', 'Cần nộp lại')])

        scores = [e["score"] for e in grades if e["score"] is not None]
        latest_score = scores[-1] if scores else None
        first_score = scores[0] if scores else None

        latest_note = ""
        for g in reversed(grades):
            if g["teacher_note"]:
                latest_note = g["teacher_note"]
                break

        if submit_count == 0:
            status = "Chưa nộp"
            color = "red"
        else:
            last_ev = a_events[-1]
            if last_ev["event_type"] == 'grade':
                status = last_ev["status"]
                color = "green" if status == 'Đã đạt' else ("yellow" if status in ('Cần sửa', 'Cần nộp lại') else "red")
            else:
                if submit_count > 1:
                    status = "Đã nộp lại"
                    color = "blue"
                else:
                    status = "Nộp trễ" if submits[-1]["is_late"] == 1 else "Đã nộp đúng hạn"
                    color = "orange" if submits[-1]["is_late"] == 1 else "blue"

        if latest_score is not None:
            score_trend.append({
                "assignment_title": asg["title"],
                "subject": asg["subject"],
                "score": latest_score,
                "first_score": first_score,
                "improved": (latest_score > first_score) if first_score else False
            })

        assignment_details.append({
            "assignment_id": asg["id"],
            "title": asg["title"],
            "subject": asg["subject"],
            "due_date": asg["due_date"],
            "submit_count": submit_count,
            "retry_count": retry_count,
            "first_score": first_score,
            "latest_score": latest_score,
            "status": status,
            "color": color,
            "teacher_note": latest_note,
            "events": a_events
        })

    return {
        "student": student,
        "assignments": assignment_details,
        "score_trend": score_trend
    }

# --- Quick Test when run directly ---
if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
    students = get_students()
    print(f"Loaded {len(students)} students.")
    asgs = get_assignments()
    print(f"Loaded {len(asgs)} assignments.")
    settings = get_settings()
    print("Settings:", settings)
