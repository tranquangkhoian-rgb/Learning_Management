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
import re
import json
import sqlite3
import zipfile
import io
import xml.etree.ElementTree as ET
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "learning.db")

# Teacher Animal Group & Ranking Tiers
ANIMAL_GROUPS_CONFIG = {
    "dolphin": {
        "tier": "smartest",
        "tier_name": "Thông Thái (Xuất Sắc)",
        "badge_color": "#0284c7",
        "bg_color": "#e0f2fe",
        "border_color": "#7dd3fc",
        "default_symbol": "🐬",
        "default_name": "Cá heo thông thái",
        "options": [
            {"symbol": "🐬", "name": "Cá heo thông thái"},
            {"symbol": "🦉", "name": "Cú mèo thông thái"},
            {"symbol": "🦅", "name": "Đại bàng tinh anh"},
            {"symbol": "🐳", "name": "Cá voi uyên bác"},
        ]
    },
    "monkey": {
        "tier": "better",
        "tier_name": "Vượt Trội (Khá Giỏi)",
        "badge_color": "#059669",
        "bg_color": "#ecfdf5",
        "border_color": "#a7f3d0",
        "default_symbol": "🐵",
        "default_name": "Khỉ nhanh nhẹn",
        "options": [
            {"symbol": "🐵", "name": "Khỉ nhanh nhẹn"},
            {"symbol": "🦊", "name": "Cáo lanh lợi"},
            {"symbol": "🦁", "name": "Sư tử dũng cảm"},
            {"symbol": "🐆", "name": "Báo đốm tốc độ"},
        ]
    },
    "orange_cat": {
        "tier": "ordinary",
        "tier_name": "Tiêu Chuẩn (Đạt Yêu Cầu)",
        "badge_color": "#c2410c",
        "bg_color": "#fff7ed",
        "border_color": "#fed7aa",
        "default_symbol": "🐱",
        "default_name": "Mèo cam chăm chỉ",
        "options": [
            {"symbol": "🐱", "name": "Mèo cam chăm chỉ"},
            {"symbol": "🐶", "name": "Cún con trung thành"},
            {"symbol": "🐼", "name": "Gấu trúc cần cù"},
            {"symbol": "🐰", "name": "Thỏ trắng nhanh nhẹn"},
        ]
    },
    "turtle_snail": {
        "tier": "improvement",
        "tier_name": "Cần Cố Gắng (Cần Rèn Luyện Thêm)",
        "badge_color": "#be185d",
        "bg_color": "#fdf2f8",
        "border_color": "#fbcfe8",
        "default_symbol": "🐢",
        "default_name": "Rùa kiên trì",
        "options": [
            {"symbol": "🐢", "name": "Rùa kiên trì"},
            {"symbol": "🐌", "name": "Ốc sên nỗ lực"},
            {"symbol": "🦥", "name": "Lười thong thả"},
            {"symbol": "🦔", "name": "Nhím cẩn thận"},
            {"symbol": "🐜", "name": "Kiến nhẫn nại"},
        ]
    }
}

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
        password TEXT DEFAULT '1234',
        animal_group TEXT DEFAULT 'orange_cat',
        animal_symbol TEXT DEFAULT '🐱',
        animal_title TEXT DEFAULT 'Mèo cam chăm chỉ',
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

    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stt INTEGER UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT DEFAULT '',
        category TEXT DEFAULT 'Truyện hay',
        shelf_code TEXT DEFAULT 'K1',
        contributed_by TEXT DEFAULT 'Thư viện lớp',
        condition TEXT DEFAULT 'Tốt',
        status TEXT DEFAULT 'available', -- 'available', 'borrowed'
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        borrow_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        return_date TEXT DEFAULT NULL,
        status TEXT DEFAULT 'borrowed', -- 'borrowed', 'returned', 'overdue'
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_race (
        student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
        completed INTEGER DEFAULT 0,
        avatar TEXT DEFAULT '🐶',
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Ensure password and animal group columns exist on students table
    cursor.execute("PRAGMA table_info(students)")
    st_cols = [col[1] for col in cursor.fetchall()]
    if "password" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN password TEXT DEFAULT '1234'")
    if "animal_group" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN animal_group TEXT DEFAULT 'orange_cat'")
    if "animal_symbol" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN animal_symbol TEXT DEFAULT '🐱'")
    if "animal_title" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN animal_title TEXT DEFAULT 'Mèo cam chăm chỉ'")

    # Initial seed distribution for animal groups
    initial_groups = {
        # Smartest / Dolphin tier
        "HS01": ("dolphin", "🐬", "Cá heo thông thái"),
        "HS06": ("dolphin", "🐬", "Cá heo thông thái"),
        "HS11": ("dolphin", "🦉", "Cú mèo thông thái"),
        "HS15": ("dolphin", "🦅", "Đại bàng tinh anh"),
        "HS21": ("dolphin", "🐬", "Cá heo thông thái"),
        # Better than ordinary / Monkey tier
        "HS02": ("monkey", "🐵", "Khỉ nhanh nhẹn"),
        "HS07": ("monkey", "🦊", "Cáo lanh lợi"),
        "HS10": ("monkey", "🐵", "Khỉ nhanh nhẹn"),
        "HS14": ("monkey", "🦁", "Sư tử dũng cảm"),
        "HS18": ("monkey", "🐵", "Khỉ nhanh nhẹn"),
        "HS26": ("monkey", "🐆", "Báo đốm tốc độ"),
        "HS29": ("monkey", "🐵", "Khỉ nhanh nhẹn"),
        # Need improvement / Turtle/Snail tier
        "HS22": ("turtle_snail", "🐢", "Rùa kiên trì"),
        "HS23": ("turtle_snail", "🐌", "Ốc sên nỗ lực"),
        "HS24": ("turtle_snail", "🐢", "Rùa kiên trì"),
        "HS27": ("turtle_snail", "🐌", "Ốc sên nỗ lực"),
        "HS28": ("turtle_snail", "🦥", "Lười thong thả"),
    }
    for code, (grp, sym, ttl) in initial_groups.items():
        cursor.execute("""
            UPDATE students
            SET animal_group = ?, animal_symbol = ?, animal_title = ?
            WHERE code = ? AND (animal_group IS NULL OR animal_group = 'orange_cat')
        """, (grp, sym, ttl, code))

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

    # Seed 75 Books from data/books_seed.json
    cursor.execute("SELECT COUNT(*) FROM books")
    book_count = cursor.fetchone()[0]
    if book_count == 0:
        seed_path = os.path.join(DB_DIR, "books_seed.json")
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as bf:
                seed_books = json.load(bf)
                for b in seed_books:
                    cursor.execute("""
                        INSERT INTO books (stt, code, title, author, category, shelf_code, contributed_by, condition, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        b["stt"], b["code"], b["title"], b.get("author", ""),
                        b.get("category", "Truyện hay"), b.get("shelf_code", "K1"),
                        b.get("contributed_by", "Thư viện lớp"), b.get("condition", "Tốt"),
                        b.get("status", "available")
                    ))

    # Seed Reading Race entries for all students
    cursor.execute("SELECT COUNT(*) FROM reading_race")
    race_count = cursor.fetchone()[0]
    if race_count == 0:
        cursor.execute("SELECT id, order_num FROM students ORDER BY order_num ASC")
        all_st = cursor.fetchall()
        pet_avatars = ['🐶', '🐱', '🦊', '🐰', '🐼', '🦁', '🐯', '🐨', '🦄', '🐸',
                       '🐵', '🐻', '🐧', '🐤', '🦉', '🐺', '🐗', '🐴', '🐝', '🐙',
                       '🦋', '🐢', '🐬', '🐳', '🦖', '🦔', '🐿️', '🦩', '🦚']
        for i, s in enumerate(all_st):
            av = pet_avatars[i % len(pet_avatars)]
            cursor.execute("INSERT INTO reading_race (student_id, completed, avatar) VALUES (?, 0, ?)", (s[0], av))

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
    clean = str(code).strip().upper()
    match = re.search(r"HS\d+", clean)
    if match:
        clean = match.group(0)
    cursor.execute("SELECT * FROM students WHERE code = ? AND is_active = 1", (clean,))
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

def update_student_password(student_id_or_code, new_password):
    conn = get_db()
    cursor = conn.cursor()
    clean_pass = str(new_password).strip() if new_password else "1234"
    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("UPDATE students SET password = ? WHERE id = ?", (clean_pass, int(val)))
    else:
        cursor.execute("UPDATE students SET password = ? WHERE code = ?", (clean_pass, val.upper()))
    conn.commit()
    conn.close()
    return True

def reset_all_student_passwords(default_pass="1234"):
    """
    Resets all active students' passwords back to default (default: '1234').
    Ensures every device's code is synchronized and matches the default.
    """
    conn = get_db()
    cursor = conn.cursor()
    clean_pass = str(default_pass).strip() if default_pass else "1234"
    cursor.execute("UPDATE students SET password = ? WHERE is_active = 1", (clean_pass,))
    conn.commit()
    conn.close()
    return True

def get_student_passwords():
    """
    Returns a dictionary mapping student code -> password and student id -> password
    for rapid cross-device synchronization.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, code, password FROM students WHERE is_active = 1")
    rows = cursor.fetchall()
    conn.close()
    res = {}
    for r in rows:
        pwd = r["password"] or "1234"
        res[r["code"]] = pwd
        res[str(r["id"])] = pwd
    return res

def verify_student_password(student_id_or_code, input_password):
    conn = get_db()
    cursor = conn.cursor()
    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("SELECT password FROM students WHERE id = ?", (int(val),))
    else:
        cursor.execute("SELECT password FROM students WHERE code = ?", (val.upper(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    saved = row["password"] if row["password"] is not None else "1234"
    return str(input_password).strip() == str(saved).strip()

def get_animal_groups_config():
    """Returns the teacher animal group ranking tiers configuration."""
    return ANIMAL_GROUPS_CONFIG

def update_student_animal_group(student_id_or_code, group_key, symbol=None, title=None):
    """
    Teacher-only: Updates a student's assigned animal ranking group and icon symbol.
    """
    conn = get_db()
    cursor = conn.cursor()
    clean_group = str(group_key or "orange_cat").strip().lower()
    if clean_group not in ANIMAL_GROUPS_CONFIG:
        clean_group = "orange_cat"
    cfg = ANIMAL_GROUPS_CONFIG[clean_group]
    clean_symbol = symbol or cfg["default_symbol"]
    clean_title = title or cfg["default_name"]

    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("""
            UPDATE students 
            SET animal_group = ?, animal_symbol = ?, animal_title = ? 
            WHERE id = ?
        """, (clean_group, clean_symbol, clean_title, int(val)))
    else:
        cursor.execute("""
            UPDATE students 
            SET animal_group = ?, animal_symbol = ?, animal_title = ? 
            WHERE code = ?
        """, (clean_group, clean_symbol, clean_title, val.upper()))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "student_id": student_id_or_code,
        "animal_group": clean_group,
        "animal_symbol": clean_symbol,
        "animal_title": clean_title,
        "tier_name": cfg["tier_name"],
        "badge_color": cfg["badge_color"],
        "bg_color": cfg["bg_color"],
        "border_color": cfg["border_color"]
    }

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
                SET full_name = ?, gender = ?, order_num = ?, is_active = 1, class_name = 'Lớp 3A7', password = '1234'
                WHERE id = ?
            """, (name, gender, order_num, row[0]))
        else:
            cursor.execute("""
                INSERT INTO students (code, full_name, gender, order_num, class_name, is_active, password)
                VALUES (?, ?, ?, ?, 'Lớp 3A7', 1, '1234')
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
        "submit_count": attempt_num,
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
            "animal_group": st.get("animal_group", "orange_cat"),
            "animal_symbol": st.get("animal_symbol", "🐱"),
            "animal_title": st.get("animal_title", "Mèo cam chăm chỉ"),
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

# =====================================================================
# LIBRARY & READING RACE MODULE ("ĐƯỜNG ĐUA ĐỌC SÁCH 3A7")
# =====================================================================

def get_books(query="", category=""):
    conn = get_db()
    cursor = conn.cursor()
    sql = "SELECT * FROM books WHERE 1=1"
    params = []
    if category and category != "all":
        sql += " AND category = ?"
        params.append(category)
    if query:
        q = f"%{query.strip()}%"
        sql += " AND (title LIKE ? OR author LIKE ? OR contributed_by LIKE ? OR code LIKE ?)"
        params.extend([q, q, q, q])
    sql += " ORDER BY stt ASC"
    cursor.execute(sql, params)
    books = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return books

def get_book_by_id(book_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_book_by_code(code_or_stt):
    conn = get_db()
    cursor = conn.cursor()
    code_str = str(code_or_stt).strip()
    cursor.execute("SELECT * FROM books WHERE code = ? OR stt = ?", (code_str.upper(), code_str))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_book(title, author="", category="Truyện hay", shelf_code="K1", contributed_by="Thư viện lớp", condition="Tốt"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(stt) FROM books")
    max_stt = cursor.fetchone()[0] or 0
    next_stt = max_stt + 1
    code = f"SACH{next_stt:03d}"
    cursor.execute("""
        INSERT INTO books (stt, code, title, author, category, shelf_code, contributed_by, condition, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available')
    """, (next_stt, code, title.strip(), author.strip(), category.strip(), shelf_code.strip(), contributed_by.strip(), condition.strip()))
    book_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
    new_book = dict(cursor.fetchone())
    conn.close()
    return new_book

def update_book(book_id, data):
    conn = get_db()
    cursor = conn.cursor()
    bid = book_id
    if isinstance(book_id, str) and not book_id.isdigit():
        cursor.execute("SELECT id FROM books WHERE code = ?", (book_id.strip().upper(),))
        brow = cursor.fetchone()
        if brow:
            bid = brow["id"]
    fields = []
    params = []
    for k in ["title", "author", "category", "shelf_code", "contributed_by", "condition", "status"]:
        if k in data:
            fields.append(f"{k} = ?")
            params.append(data[k])
    if fields:
        params.append(bid)
        cursor.execute(f"UPDATE books SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
    cursor.execute("SELECT * FROM books WHERE id = ?", (bid,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_book(book_id):
    conn = get_db()
    cursor = conn.cursor()
    bid = book_id
    if isinstance(book_id, str) and not book_id.isdigit():
        cursor.execute("SELECT id FROM books WHERE code = ?", (book_id.strip().upper(),))
        brow = cursor.fetchone()
        if brow:
            bid = brow["id"]
    cursor.execute("DELETE FROM books WHERE id = ?", (bid,))
    conn.commit()
    conn.close()
    return True

def borrow_book(student_id_or_code, book_id_or_code, due_days=14, notes=""):
    conn = get_db()
    cursor = conn.cursor()

    # Find student
    s_val = str(student_id_or_code).strip()
    cursor.execute("SELECT * FROM students WHERE id = ? OR code = ?", (s_val, s_val.upper()))
    student = cursor.fetchone()
    if not student:
        conn.close()
        raise ValueError(f"Không tìm thấy học sinh: {student_id_or_code}")

    # Find book
    b_val = str(book_id_or_code).strip()
    cursor.execute("SELECT * FROM books WHERE id = ? OR code = ? OR stt = ?", (b_val, b_val.upper(), b_val))
    book = cursor.fetchone()
    if not book:
        conn.close()
        raise ValueError(f"Không tìm thấy sách: {book_id_or_code}")

    if book["status"] == "borrowed":
        conn.close()
        raise ValueError(f"Cuốn sách '{book['title']}' hiện đang được mượn, chưa trả về thư viện!")

    now = datetime.now()
    due = datetime.fromtimestamp(now.timestamp() + due_days * 86400)
    borrow_date_str = now.strftime("%Y-%m-%d %H:%M:%S")
    due_date_str = due.strftime("%Y-%m-%d %H:%M:%S")

    # Insert loan
    cursor.execute("""
        INSERT INTO book_loans (book_id, student_id, borrow_date, due_date, status, notes)
        VALUES (?, ?, ?, ?, 'borrowed', ?)
    """, (book["id"], student["id"], borrow_date_str, due_date_str, notes))
    loan_id = cursor.lastrowid

    # Update book status
    cursor.execute("UPDATE books SET status = 'borrowed' WHERE id = ?", (book["id"],))

    conn.commit()
    conn.close()

    return {
        "id": loan_id,
        "book_id": book["id"],
        "book_title": book["title"],
        "book_code": book["code"],
        "student_id": student["id"],
        "student_code": student["code"],
        "student_name": student["full_name"],
        "borrow_date": borrow_date_str,
        "due_date": due_date_str,
        "status": "borrowed",
        "notes": notes
    }

def return_book(book_id_or_code, notes=""):
    conn = get_db()
    cursor = conn.cursor()

    b_val = str(book_id_or_code).strip()
    cursor.execute("SELECT * FROM books WHERE id = ? OR code = ? OR stt = ?", (b_val, b_val.upper(), b_val))
    book = cursor.fetchone()
    if not book:
        conn.close()
        raise ValueError(f"Không tìm thấy sách: {book_id_or_code}")

    # Find active loan
    cursor.execute("""
        SELECT l.*, s.full_name as student_name, s.code as student_code
        FROM book_loans l
        JOIN students s ON l.student_id = s.id
        WHERE l.book_id = ? AND l.status = 'borrowed'
        ORDER BY l.id DESC LIMIT 1
    """, (book["id"],))
    loan = cursor.fetchone()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if loan:
        cursor.execute("""
            UPDATE book_loans
            SET status = 'returned', return_date = ?, notes = CASE WHEN ? != '' THEN ? ELSE notes END
            WHERE id = ?
        """, (now_str, notes, notes, loan["id"]))

    cursor.execute("UPDATE books SET status = 'available' WHERE id = ?", (book["id"],))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "book_id": book["id"],
        "book_title": book["title"],
        "book_code": book["code"],
        "student_id": loan["student_id"] if loan else None,
        "student_name": loan["student_name"] if loan else "Chưa rõ",
        "return_date": now_str
    }

def get_active_loans():
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        SELECT l.id, l.book_id, b.title as book_title, b.code as book_code, b.stt as book_stt,
               l.student_id, s.full_name as student_name, s.code as student_code,
               l.borrow_date, l.due_date, l.status, l.notes,
               CASE WHEN l.due_date < ? THEN 1 ELSE 0 END as is_overdue
        FROM book_loans l
        JOIN books b ON l.book_id = b.id
        JOIN students s ON l.student_id = s.id
        WHERE l.status = 'borrowed'
        ORDER BY l.borrow_date DESC
    """, (now_str,))
    loans = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return loans

def get_reading_race():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.id as student_id, s.code, s.full_name as name, s.order_num,
               COALESCE(r.completed, 0) as completed,
               COALESCE(r.avatar, '🐶') as avatar,
               r.last_updated
        FROM students s
        LEFT JOIN reading_race r ON s.id = r.student_id
        WHERE s.is_active = 1
        ORDER BY completed DESC, s.order_num ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Assign ranks with ties
    ranked = []
    current_rank = 1
    for i, row in enumerate(rows):
        if i > 0 and row["completed"] < rows[i - 1]["completed"]:
            current_rank = i + 1
        row_copy = dict(row)
        row_copy["rank"] = current_rank
        row_copy["percentage"] = min(100.0, round((row["completed"] / 33.0) * 100, 1))
        ranked.append(row_copy)
    return ranked

def update_reading_race(student_id, delta=1, set_completed=None, avatar=None):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Ensure record exists
    cursor.execute("SELECT completed, avatar FROM reading_race WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO reading_race (student_id, completed, avatar, last_updated) VALUES (?, 0, '🐶', ?)", (student_id, now_str))
        curr_completed = 0
        curr_avatar = '🐶'
    else:
        curr_completed = row["completed"]
        curr_avatar = row["avatar"]

    if set_completed is not None:
        new_completed = max(0, int(set_completed))
    else:
        new_completed = max(0, curr_completed + delta)

    new_avatar = avatar if avatar else curr_avatar

    cursor.execute("""
        UPDATE reading_race
        SET completed = ?, avatar = ?, last_updated = ?
        WHERE student_id = ?
    """, (new_completed, new_avatar, now_str, student_id))

    conn.commit()
    conn.close()
    return get_reading_race()

def get_library_stats():
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT COUNT(*) FROM books")
    total_books = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM book_loans WHERE status = 'borrowed'")
    borrowed_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM students WHERE is_active = 1")
    readers_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM book_loans WHERE status = 'borrowed' AND due_date < ?", (now_str,))
    overdue_count = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(completed) FROM reading_race")
    total_read = cursor.fetchone()[0] or 0

    # Category counts
    cursor.execute("SELECT category, COUNT(*) as cnt FROM books GROUP BY category")
    categories = {r["category"]: r["cnt"] for r in cursor.fetchall()}

    conn.close()

    return {
        "totalBooks": total_books,
        "borrowedCount": borrowed_count,
        "readersCount": readers_count,
        "overdueCount": overdue_count,
        "totalCompletedReadings": total_read,
        "categories": categories
    }

def get_student_reading_summary(student_id_or_code):
    """
    Returns reading race metrics, active loans, and assignment completion
    specifically tailored for the student portal view.
    """
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("SELECT id, code, full_name, order_num FROM students WHERE id = ?", (int(val),))
    else:
        cursor.execute("SELECT id, code, full_name, order_num FROM students WHERE code = ?", (val.upper(),))
    st = cursor.fetchone()
    if not st:
        conn.close()
        return None
    sid = st["id"]

    # Race entry & rank
    all_race = get_reading_race()
    my_race = next((r for r in all_race if r["student_id"] == sid), None)
    if not my_race:
        my_race = {
            "student_id": sid,
            "code": st["code"],
            "name": st["full_name"],
            "order_num": st["order_num"],
            "completed": 0,
            "avatar": "🐶",
            "rank": len(all_race) + 1,
            "percentage": 0.0
        }

    # Active loans for this student
    cursor.execute("""
        SELECT l.id, l.book_id, b.title as book_title, b.code as book_code, b.stt as book_stt,
               l.borrow_date, l.due_date, l.notes,
               CASE WHEN l.due_date < ? THEN 1 ELSE 0 END as is_overdue
        FROM book_loans l
        JOIN books b ON l.book_id = b.id
        WHERE l.student_id = ? AND l.status = 'borrowed'
        ORDER BY l.borrow_date DESC
    """, (now_str, sid))
    active_loans = [dict(r) for r in cursor.fetchall()]

    # Assignment counts
    cursor.execute("SELECT COUNT(*) FROM assignments WHERE is_active = 1")
    total_assignments = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(DISTINCT assignment_id) FROM submission_events
        WHERE student_id = ? AND event_type IN ('submit', 'resubmit')
    """, (sid,))
    submitted_assignments = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(DISTINCT assignment_id) FROM submission_events
        WHERE student_id = ? AND event_type = 'grade' AND (status = 'Đã đạt' OR (score IS NOT NULL AND score >= 8.0))
    """, (sid,))
    passed_assignments = cursor.fetchone()[0]

    conn.close()

    my_race["target"] = 33

    return {
        "student": dict(st),
        "race": my_race,
        "active_loans": active_loans,
        "stats": {
            "total_assignments": total_assignments,
            "submitted_assignments": submitted_assignments,
            "passed_assignments": passed_assignments,
            "completed_books": my_race["completed"],
            "target_books": 33,
            "milestone_15": 15,
            "percentage": my_race["percentage"],
            "rank": my_race["rank"]
        }
    }

def parse_excel_books(file_bytes_or_path):
    """
    Parses an .xlsx file using only Python's standard library (zipfile, xml.etree).
    Zero external dependencies (no openpyxl or pandas required).
    Returns list of book dictionaries:
    [{ 'title': ..., 'author': ..., 'category': ..., 'shelf_code': ..., 'contributed_by': ..., 'condition': ... }]
    """
    if isinstance(file_bytes_or_path, (bytes, bytearray)):
        zfile = zipfile.ZipFile(io.BytesIO(file_bytes_or_path))
    else:
        zfile = zipfile.ZipFile(file_bytes_or_path)

    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    strings = []
    if "xl/sharedStrings.xml" in zfile.namelist():
        tree = ET.fromstring(zfile.read("xl/sharedStrings.xml"))
        for si in tree.findall(f".//{ns}si"):
            t = "".join(elem.text for elem in si.findall(f".//{ns}t") if elem.text)
            strings.append(t)

    sheet_names = [n for n in zfile.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")]
    if not sheet_names:
        return []

    sheet_tree = ET.fromstring(zfile.read(sheet_names[0]))

    rows_data = []
    for r in sheet_tree.findall(f".//{ns}row"):
        cells = {}
        for c in r.findall(f".//{ns}c"):
            r_ref = c.get("r", "")
            col = "".join(ch for ch in r_ref if ch.isalpha())
            t_type = c.get("t")
            v = c.find(f"{ns}v")
            is_node = c.find(f"{ns}is")
            val = ""
            if is_node is not None:
                val = "".join(elem.text for elem in is_node.findall(f"{ns}t") if elem.text)
            elif v is not None and v.text:
                if t_type == "s":
                    idx = int(v.text)
                    val = strings[idx] if idx < len(strings) else ""
                else:
                    val = v.text
            cells[col] = val.strip()
        if cells:
            rows_data.append(cells)

    # Detect header row
    header_idx = -1
    col_map = {}
    for i, row in enumerate(rows_data[:6]):
        combined = " ".join(row.values()).lower()
        if "tên sách" in combined or "tác giả" in combined or "thể loại" in combined:
            header_idx = i
            for col, val in row.items():
                vl = val.lower()
                if "tên" in vl or "tựa" in vl or "tiêu đề" in vl: col_map["title"] = col
                elif "tác giả" in vl or "biên soạn" in vl: col_map["author"] = col
                elif "thể loại" in vl: col_map["category"] = col
                elif "kệ" in vl or "vị trí" in vl: col_map["shelf_code"] = col
                elif "đóng góp" in vl or "người" in vl: col_map["contributed_by"] = col
                elif "tình trạng" in vl or "hiện trạng" in vl: col_map["condition"] = col
            break

    if "title" not in col_map:
        col_map = {
            "title": "B",
            "author": "C",
            "category": "D",
            "shelf_code": "E",
            "contributed_by": "F",
            "condition": "G"
        }
        if header_idx == -1:
            header_idx = 0

    books = []
    for row in rows_data[header_idx + 1:]:
        title = row.get(col_map.get("title", "B"), "").strip()
        if not title:
            # Maybe title was in col A if there was no STT column
            title = row.get("A", "").strip()
            if not title or title.isdigit():
                continue
        books.append({
            "title": title,
            "author": row.get(col_map.get("author", "C"), "").strip(),
            "category": row.get(col_map.get("category", "D"), "").strip() or "Truyện hay",
            "shelf_code": row.get(col_map.get("shelf_code", "E"), "").strip() or "K1",
            "contributed_by": row.get(col_map.get("contributed_by", "F"), "").strip() or "Thư viện lớp",
            "condition": row.get(col_map.get("condition", "G"), "").strip() or "Tốt"
        })
    return books

def import_books_from_rows(books_data, replace=False):
    """
    Inserts a list of book objects into the books table.
    If replace=True, deletes existing books and active loans, resets STT from 1.
    """
    conn = get_db()
    cursor = conn.cursor()

    if replace:
        cursor.execute("DELETE FROM book_loans")
        cursor.execute("DELETE FROM books")
        start_stt = 1
    else:
        cursor.execute("SELECT COALESCE(MAX(stt), 0) FROM books")
        start_stt = cursor.fetchone()[0] + 1

    inserted = []
    current_stt = start_stt
    for b in books_data:
        title = b.get("title", "").strip()
        if not title:
            continue
        code = f"SACH{current_stt:03d}"
        author = b.get("author", "").strip()
        cat = b.get("category", "Truyện hay").strip() or "Truyện hay"
        shelf = b.get("shelf_code", "K1").strip() or "K1"
        contrib = b.get("contributed_by", "Thư viện lớp").strip() or "Thư viện lớp"
        cond = b.get("condition", "Tốt").strip() or "Tốt"

        cursor.execute("""
            INSERT INTO books (stt, code, title, author, category, shelf_code, contributed_by, condition, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available')
        """, (current_stt, code, title, author, cat, shelf, contrib, cond))
        b_id = cursor.lastrowid
        inserted.append({
            "id": b_id,
            "stt": current_stt,
            "code": code,
            "title": title,
            "author": author,
            "category": cat,
            "shelf_code": shelf,
            "contributed_by": contrib,
            "condition": cond,
            "status": "available"
        })
        current_stt += 1

    conn.commit()
    conn.close()
    return inserted

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
