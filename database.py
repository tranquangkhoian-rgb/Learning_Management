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

# Teacher Animal Group & Mascot Tiers (Clean, friendly names without embarrassing words)
ANIMAL_GROUPS_CONFIG = {
    "dolphin": {
        "tier": "dolphin",
        "tier_name": "🐬",
        "badge_color": "#0284c7",
        "bg_color": "#e0f2fe",
        "border_color": "#7dd3fc",
        "default_symbol": "🐬",
        "default_name": "🐬",
        "options": [
            {"symbol": "🐬", "name": "🐬"},
            {"symbol": "🦉", "name": "🦉"},
            {"symbol": "🦅", "name": "🦅"},
            {"symbol": "🐳", "name": "🐳"},
        ]
    },
    "monkey": {
        "tier": "monkey",
        "tier_name": "🐵",
        "badge_color": "#059669",
        "bg_color": "#ecfdf5",
        "border_color": "#a7f3d0",
        "default_symbol": "🐵",
        "default_name": "🐵",
        "options": [
            {"symbol": "🐵", "name": "🐵"},
            {"symbol": "🦊", "name": "🦊"},
            {"symbol": "🦁", "name": "🦁"},
            {"symbol": "🐆", "name": "🐆"},
        ]
    },
    "orange_cat": {
        "tier": "orange_cat",
        "tier_name": "🐱",
        "badge_color": "#c2410c",
        "bg_color": "#fff7ed",
        "border_color": "#fed7aa",
        "default_symbol": "🐱",
        "default_name": "🐱",
        "options": [
            {"symbol": "🐱", "name": "🐱"},
            {"symbol": "🐶", "name": "🐶"},
            {"symbol": "🐼", "name": "🐼"},
            {"symbol": "🐰", "name": "🐰"},
        ]
    },
    "turtle_snail": {
        "tier": "turtle_snail",
        "tier_name": "🐢",
        "badge_color": "#be185d",
        "bg_color": "#fdf2f8",
        "border_color": "#fbcfe8",
        "default_symbol": "🐢",
        "default_name": "🐢",
        "options": [
            {"symbol": "🐢", "name": "🐢"},
            {"symbol": "🐌", "name": "🐌"},
            {"symbol": "🦥", "name": "🦥"},
            {"symbol": "🦔", "name": "🦔"},
            {"symbol": "🐜", "name": "🐜"},
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
        animal_title TEXT DEFAULT '🐱',
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
        questions TEXT DEFAULT '[]',
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
        question_details TEXT DEFAULT '{}',
        operator TEXT DEFAULT 'Học sinh',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT '⭐',
        image TEXT DEFAULT '',
        motto TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'Thành viên',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, student_id)
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
        cursor.execute("ALTER TABLE students ADD COLUMN animal_title TEXT DEFAULT '🐱'")
    if "subject_animals" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN subject_animals TEXT DEFAULT '{}'")
    if "group_name" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN group_name TEXT DEFAULT 'Nhóm 1'")
    if "group_color" not in st_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN group_color TEXT DEFAULT '#3B82F6'")

    # Ensure questions and goals columns exist on assignments table
    cursor.execute("PRAGMA table_info(assignments)")
    asg_cols = [col[1] for col in cursor.fetchall()]
    if "questions" not in asg_cols:
        cursor.execute("ALTER TABLE assignments ADD COLUMN questions TEXT DEFAULT '[]'")
    if "goals" not in asg_cols:
        cursor.execute("ALTER TABLE assignments ADD COLUMN goals TEXT DEFAULT ''")

    # Ensure max_capacity column exists on teams table
    cursor.execute("PRAGMA table_info(teams)")
    teams_cols = [col[1] for col in cursor.fetchall()]
    if "max_capacity" not in teams_cols:
        cursor.execute("ALTER TABLE teams ADD COLUMN max_capacity INTEGER DEFAULT 0")

    # Ensure question_details, spelling_errors, spelling_error_types, writing_rubrics exist on submission_events table
    cursor.execute("PRAGMA table_info(submission_events)")
    sub_cols = [col[1] for col in cursor.fetchall()]
    if "question_details" not in sub_cols:
        cursor.execute("ALTER TABLE submission_events ADD COLUMN question_details TEXT DEFAULT '{}'")
    if "spelling_errors" not in sub_cols:
        cursor.execute("ALTER TABLE submission_events ADD COLUMN spelling_errors INTEGER DEFAULT 0")
    if "spelling_error_types" not in sub_cols:
        cursor.execute("ALTER TABLE submission_events ADD COLUMN spelling_error_types TEXT DEFAULT '[]'")
    if "writing_rubrics" not in sub_cols:
        cursor.execute("ALTER TABLE submission_events ADD COLUMN writing_rubrics TEXT DEFAULT '{}'")

    # Ensure questions_data and subject_type columns exist on assignments table
    if "questions_data" not in asg_cols:
        cursor.execute("ALTER TABLE assignments ADD COLUMN questions_data TEXT DEFAULT '[]'")
    if "subject_type" not in asg_cols:
        cursor.execute("ALTER TABLE assignments ADD COLUMN subject_type TEXT DEFAULT 'toan'")

    # Ensure remediation_plans table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS remediation_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
        target_code TEXT NOT NULL,
        target_name TEXT DEFAULT '',
        skill_name TEXT DEFAULT '',
        group_name TEXT NOT NULL,
        student_ids TEXT NOT NULL,
        supplementary_task TEXT DEFAULT '',
        start_date TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        reassessments TEXT DEFAULT '[]',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Ensure all example homework assignments and sample events are purged (start clean)
    cursor.execute("""
        DELETE FROM submission_events 
        WHERE assignment_id IN (1, 2) 
           OR assignment_id IN (SELECT id FROM assignments WHERE title LIKE '%Phép nhân%' OR title LIKE '%Mùa thu yêu thương%')
    """)
    cursor.execute("""
        DELETE FROM assignments 
        WHERE id IN (1, 2) 
           OR title LIKE '%Phép nhân%' 
           OR title LIKE '%Mùa thu yêu thương%'
    """)

    # Initial seed distribution for animal groups (Clean, friendly names without embarrassing words)
    initial_groups = {
        # Dolphin tier
        "HS01": ("dolphin", "🐬", "🐬"),
        "HS06": ("dolphin", "🐬", "🐬"),
        "HS11": ("dolphin", "🦉", "🦉"),
        "HS15": ("dolphin", "🦅", "🦅"),
        "HS21": ("dolphin", "🐬", "🐬"),
        # Monkey tier
        "HS02": ("monkey", "🐵", "🐵"),
        "HS07": ("monkey", "🦊", "🦊"),
        "HS10": ("monkey", "🐵", "🐵"),
        "HS14": ("monkey", "🦁", "🦁"),
        "HS18": ("monkey", "🐵", "🐵"),
        "HS26": ("monkey", "🐆", "🐆"),
        "HS29": ("monkey", "🐵", "🐵"),
        # Turtle / Snail tier
        "HS22": ("turtle_snail", "🐢", "🐢"),
        "HS23": ("turtle_snail", "🐌", "🐌"),
        "HS24": ("turtle_snail", "🐢", "🐢"),
        "HS27": ("turtle_snail", "🐌", "🐌"),
        "HS28": ("turtle_snail", "🦥", "🦥"),
    }
    for code, (grp, sym, ttl) in initial_groups.items():
        cursor.execute("""
            UPDATE students
            SET animal_group = ?, animal_symbol = ?, animal_title = ?
            WHERE code = ?
        """, (grp, sym, sym, code))

    # Clean all animal_title to be strictly the icon symbol without any words
    cursor.execute("UPDATE students SET animal_title = animal_symbol")

    # Initial seed distribution for color groups (divided by different colors)
    color_group_seeds = [
        # Nhóm Đỏ (HS01..HS07)
        ("HS01", "Nhóm Đỏ", "#EF4444"),
        ("HS02", "Nhóm Đỏ", "#EF4444"),
        ("HS03", "Nhóm Đỏ", "#EF4444"),
        ("HS04", "Nhóm Đỏ", "#EF4444"),
        ("HS05", "Nhóm Đỏ", "#EF4444"),
        ("HS06", "Nhóm Đỏ", "#EF4444"),
        ("HS07", "Nhóm Đỏ", "#EF4444"),
        # Nhóm Xanh Dương (HS08..HS14)
        ("HS08", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS09", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS10", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS11", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS12", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS13", "Nhóm Xanh Dương", "#3B82F6"),
        ("HS14", "Nhóm Xanh Dương", "#3B82F6"),
        # Nhóm Xanh Lá (HS15..HS21)
        ("HS15", "Nhóm Xanh Lá", "#10B981"),
        ("HS16", "Nhóm Xanh Lá", "#10B981"),
        ("HS17", "Nhóm Xanh Lá", "#10B981"),
        ("HS18", "Nhóm Xanh Lá", "#10B981"),
        ("HS19", "Nhóm Xanh Lá", "#10B981"),
        ("HS20", "Nhóm Xanh Lá", "#10B981"),
        ("HS21", "Nhóm Xanh Lá", "#10B981"),
        # Nhóm Vàng (HS22..HS29)
        ("HS22", "Nhóm Vàng", "#F59E0B"),
        ("HS23", "Nhóm Vàng", "#F59E0B"),
        ("HS24", "Nhóm Vàng", "#F59E0B"),
        ("HS25", "Nhóm Vàng", "#F59E0B"),
        ("HS26", "Nhóm Vàng", "#F59E0B"),
        ("HS27", "Nhóm Vàng", "#F59E0B"),
        ("HS28", "Nhóm Vàng", "#F59E0B"),
        ("HS29", "Nhóm Vàng", "#F59E0B"),
    ]
    for c_code, c_gname, c_gcolor in color_group_seeds:
        cursor.execute("UPDATE students SET group_name = ?, group_color = ? WHERE code = ?", (c_gname, c_gcolor, c_code))

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
def _format_student_row(row_dict):
    if not row_dict:
        return row_dict
    raw_subj = row_dict.get("subject_animals")
    if isinstance(raw_subj, str):
        try:
            row_dict["subject_animals"] = json.loads(raw_subj) if raw_subj else {}
        except Exception:
            row_dict["subject_animals"] = {}
    elif not isinstance(raw_subj, dict):
        row_dict["subject_animals"] = {}
    return row_dict

def get_students(include_inactive=False):
    conn = get_db()
    cursor = conn.cursor()
    if include_inactive:
        cursor.execute("SELECT * FROM students ORDER BY order_num ASC, code ASC")
    else:
        cursor.execute("SELECT * FROM students WHERE is_active = 1 ORDER BY order_num ASC, code ASC")
    rows = [_format_student_row(dict(r)) for r in cursor.fetchall()]
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
    return _format_student_row(dict(row)) if row else None

def get_student_by_id(student_id):
    conn = get_db()
    cursor = conn.cursor()
    val = str(student_id).strip()
    if val.isdigit():
        cursor.execute("SELECT * FROM students WHERE id = ?", (int(val),))
    else:
        cursor.execute("SELECT * FROM students WHERE code = ?", (val.upper(),))
    row = cursor.fetchone()
    conn.close()
    return _format_student_row(dict(row)) if row else None

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

def update_student_color_group(student_id_or_code, group_name, group_color):
    """
    Teacher-only: Updates a student's assigned color group (e.g. 'Nhóm Đỏ', '#EF4444').
    """
    conn = get_db()
    cursor = conn.cursor()
    clean_name = str(group_name or "Nhóm 1").strip()
    clean_color = str(group_color or "#3B82F6").strip()
    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("UPDATE students SET group_name = ?, group_color = ? WHERE id = ?", (clean_name, clean_color, int(val)))
    else:
        cursor.execute("UPDATE students SET group_name = ?, group_color = ? WHERE code = ?", (clean_name, clean_color, val.upper()))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "student_id": student_id_or_code,
        "group_name": clean_name,
        "group_color": clean_color
    }

def update_student_subject_animal(student_id_or_code, subject, group_key, symbol=None, title=None):
    """
    Teacher-only: Updates a student's assigned animal mascot for a specific subject (e.g. 'Toán', 'Tiếng Việt').
    Stored in students.subject_animals JSON: {"Toán": {"group": "dolphin", "symbol": "🐬", "title": "🐬"}}.
    """
    conn = get_db()
    cursor = conn.cursor()
    val = str(student_id_or_code).strip()
    if val.isdigit():
        cursor.execute("SELECT id, subject_animals FROM students WHERE id = ?", (int(val),))
    else:
        cursor.execute("SELECT id, subject_animals FROM students WHERE code = ?", (val.upper(),))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": f"Không tìm thấy học sinh: {student_id_or_code}"}

    st_id = row[0]
    raw = row[1]
    curr_map = {}
    if raw:
        try:
            curr_map = json.loads(raw)
        except Exception:
            curr_map = {}

    clean_subj = str(subject or "Toán").strip()
    clean_group = str(group_key or "orange_cat").strip().lower()
    if clean_group not in ANIMAL_GROUPS_CONFIG:
        clean_group = "orange_cat"
    cfg = ANIMAL_GROUPS_CONFIG[clean_group]
    clean_symbol = symbol or cfg["default_symbol"]
    clean_title = title or cfg["default_name"]

    curr_map[clean_subj] = {
        "group": clean_group,
        "symbol": clean_symbol,
        "title": clean_title,
        "tier_name": cfg["tier_name"],
        "badge_color": cfg["badge_color"],
        "bg_color": cfg["bg_color"],
        "border_color": cfg["border_color"]
    }

    new_json = json.dumps(curr_map, ensure_ascii=False)
    cursor.execute("""
        UPDATE students
        SET subject_animals = ?, animal_group = ?, animal_symbol = ?, animal_title = ?
        WHERE id = ?
    """, (new_json, clean_group, clean_symbol, clean_title, st_id))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "student_id": st_id,
        "subject": clean_subj,
        "animal": curr_map[clean_subj],
        "subject_animals": curr_map
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
def _format_assignment_row(row_dict):
    if not row_dict:
        return row_dict
    raw_q = row_dict.get("questions")
    if isinstance(raw_q, str):
        try:
            row_dict["questions"] = json.loads(raw_q)
        except Exception:
            row_dict["questions"] = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]
    elif not isinstance(raw_q, list):
        row_dict["questions"] = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]
    row_dict["goals"] = row_dict.get("goals") or ""
    row_dict["subject_type"] = row_dict.get("subject_type") or "toan"

    raw_qd = row_dict.get("questions_data")
    if isinstance(raw_qd, str):
        try:
            row_dict["questions_data"] = json.loads(raw_qd)
        except Exception:
            row_dict["questions_data"] = []
    elif not isinstance(raw_qd, list):
        row_dict["questions_data"] = []

    if not row_dict["questions_data"] and row_dict.get("questions"):
        # Auto-synthesize question items with MT and skill
        synthesized = []
        q_count = len(row_dict["questions"])
        per_score = round(float(row_dict.get("max_score") or 10.0) / max(1, q_count), 2)
        for i, q in enumerate(row_dict["questions"]):
            mt_idx = 1 if i < 3 else (2 if i < 5 else 3)
            synthesized.append({
                "num": i + 1,
                "label": f"C{i + 1}",
                "name": str(q),
                "target": f"MT{mt_idx}",
                "target_name": f"Mục tiêu {mt_idx}",
                "skill": f"Kĩ năng C{i + 1}",
                "max_score": per_score
            })
        row_dict["questions_data"] = synthesized

    return row_dict

def get_assignments(include_inactive=False):
    conn = get_db()
    cursor = conn.cursor()
    if include_inactive:
        cursor.execute("SELECT * FROM assignments ORDER BY id DESC")
    else:
        cursor.execute("SELECT * FROM assignments WHERE is_active = 1 ORDER BY id DESC")
    rows = [_format_assignment_row(dict(r)) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_assignment_by_id(assignment_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
    row = cursor.fetchone()
    conn.close()
    return _format_assignment_row(dict(row)) if row else None

def add_assignment(title, subject, assigned_date, due_date, max_score=10.0, notes="", questions=None, goals="", questions_data=None, subject_type="toan"):
    conn = get_db()
    cursor = conn.cursor()

    qd_list = []
    if questions_data is not None:
        if isinstance(questions_data, list):
            qd_list = questions_data
        elif isinstance(questions_data, str):
            try:
                qd_list = json.loads(questions_data)
            except Exception:
                qd_list = []

    if questions is None:
        if qd_list:
            q_list = [q.get("name", f"Câu {i+1}") for i, q in enumerate(qd_list)]
        else:
            q_list = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]
    elif isinstance(questions, list):
        q_list = questions
    elif isinstance(questions, str):
        try:
            q_list = json.loads(questions)
        except Exception:
            q_list = [q.strip() for q in questions.split(",") if q.strip()]
    else:
        q_list = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]

    if not qd_list and q_list:
        per_score = round(float(max_score or 10.0) / max(1, len(q_list)), 2)
        for i, q in enumerate(q_list):
            mt_idx = 1 if i < 3 else (2 if i < 5 else 3)
            qd_list.append({
                "num": i + 1,
                "label": f"C{i + 1}",
                "name": str(q),
                "target": f"MT{mt_idx}",
                "target_name": f"Mục tiêu {mt_idx}",
                "skill": f"Kĩ năng C{i + 1}",
                "max_score": per_score
            })

    if qd_list:
        for i, item in enumerate(qd_list):
            if "num" not in item:
                item["num"] = i + 1
            if "label" not in item:
                item["label"] = f"C{item['num']}"
            if "target" not in item:
                item["target"] = "MT1"
            if "target_name" not in item:
                item["target_name"] = f"Mục tiêu {item['target']}"
        calc_max = sum(float(q.get("max_score", 0)) for q in qd_list)
        if calc_max > 0:
            max_score = round(calc_max, 2)

    q_str = json.dumps(q_list, ensure_ascii=False)
    qd_str = json.dumps(qd_list, ensure_ascii=False)

    cursor.execute("""
        INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes, questions, goals, questions_data, subject_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (title.strip(), subject.strip(), assigned_date, due_date, float(max_score), notes.strip(), q_str, (goals or "").strip(), qd_str, subject_type))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_assignment_by_id(new_id)

def update_assignment(assignment_id, title, subject, assigned_date, due_date, max_score, notes, questions=None, goals=None, questions_data=None, subject_type=None):
    conn = get_db()
    cursor = conn.cursor()

    qd_list = None
    if questions_data is not None:
        if isinstance(questions_data, list):
            qd_list = questions_data
        elif isinstance(questions_data, str):
            try:
                qd_list = json.loads(questions_data)
            except Exception:
                qd_list = []

    q_str = None
    if questions is not None:
        if isinstance(questions, list):
            q_list = questions
        elif isinstance(questions, str):
            try:
                q_list = json.loads(questions)
            except Exception:
                q_list = [q.strip() for q in questions.split(",") if q.strip()]
        else:
            q_list = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]
        q_str = json.dumps(q_list, ensure_ascii=False)

    if qd_list is not None:
        for i, item in enumerate(qd_list):
            if "num" not in item:
                item["num"] = i + 1
            if "label" not in item:
                item["label"] = f"C{item['num']}"
            if "target" not in item:
                item["target"] = "MT1"
            if "target_name" not in item:
                item["target_name"] = f"Mục tiêu {item['target']}"
        calc_max = sum(float(q.get("max_score", 0)) for q in qd_list)
        if calc_max > 0:
            max_score = round(calc_max, 2)
        qd_str = json.dumps(qd_list, ensure_ascii=False)
    else:
        qd_str = None

    # Fetch existing
    cursor.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
    cur_row = cursor.fetchone()
    if not cur_row:
        conn.close()
        return None

    cur_asg = dict(cur_row)
    final_title = title.strip() if title is not None else cur_asg["title"]
    final_subject = subject.strip() if subject is not None else cur_asg["subject"]
    final_assigned = assigned_date if assigned_date is not None else cur_asg["assigned_date"]
    final_due = due_date if due_date is not None else cur_asg["due_date"]
    final_score = float(max_score) if max_score is not None else cur_asg["max_score"]
    final_notes = notes.strip() if notes is not None else cur_asg["notes"]
    final_q = q_str if q_str is not None else cur_asg.get("questions", "[]")
    final_goals = goals.strip() if goals is not None else cur_asg.get("goals", "")
    final_qd = qd_str if qd_str is not None else cur_asg.get("questions_data", "[]")
    final_stype = subject_type if subject_type is not None else cur_asg.get("subject_type", "toan")

    cursor.execute("""
        UPDATE assignments
        SET title = ?, subject = ?, assigned_date = ?, due_date = ?, max_score = ?, notes = ?, questions = ?, goals = ?, questions_data = ?, subject_type = ?
        WHERE id = ?
    """, (final_title, final_subject, final_assigned, final_due, final_score, final_notes, final_q, final_goals, final_qd, final_stype, assignment_id))

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

def record_grading(student_id, assignment_id, score=None, status=None, teacher_note="", operator="Cô Linh", question_details=None, animal_group=None, animal_symbol=None, animal_title=None, spelling_errors=0, spelling_error_types=None, writing_rubrics=None):
    """
    Teacher grades a student's work.
    Saves a new 'grade' event without overwriting previous attempts.
    Supports storing question breakdown details, spelling errors, writing rubrics, and updating student's animal mascot.
    """
    conn = get_db()
    cursor = conn.cursor()

    student = get_student_by_id(student_id)
    assignment = get_assignment_by_id(assignment_id)
    if not student or not assignment:
        conn.close()
        return {"success": False, "error": "Học sinh hoặc bài tập không hợp lệ!"}

    # If teacher customized student's animal group during grading, update it immediately (both global and subject-specific)
    if animal_group and str(animal_group).strip():
        try:
            update_student_animal_group(student["id"], animal_group, animal_symbol, animal_title)
            if assignment.get("subject"):
                update_student_subject_animal(student["id"], assignment["subject"], animal_group, animal_symbol, animal_title)
            student = get_student_by_id(student["id"])
        except Exception as e:
            print("Error updating student animal group during grading:", e)

    # Find the current attempt number (based on latest submit)
    cursor.execute("""
        SELECT COALESCE(MAX(attempt_number), 1) FROM submission_events
        WHERE student_id = ? AND assignment_id = ?
    """, (student["id"], assignment["id"]))
    attempt_num = cursor.fetchone()[0]

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Process question_details and auto-calculate score if question breakdown is provided
    q_details_str = "{}"
    calc_score = None
    if question_details is not None:
        if isinstance(question_details, (dict, list)):
            if isinstance(question_details, list):
                q_list = question_details
                tot = sum(float(q.get("score", 0.0)) for q in q_list)
                max_tot = sum(float(q.get("max_score", 1.0)) for q in q_list) or float(assignment.get("max_score", 10.0))
                pct = round((tot / max_tot) * 100, 1) if max_tot > 0 else 0.0
                question_details = {
                    "questions": q_list,
                    "total_score": round(tot, 2),
                    "max_score": round(max_tot, 2),
                    "percentage": pct
                }
                calc_score = round(tot, 2)
            elif isinstance(question_details, dict) and "questions" in question_details:
                q_list = question_details["questions"]
                tot = sum(float(q.get("score", 0.0)) for q in q_list)
                max_tot = float(question_details.get("max_score") or sum(float(q.get("max_score", 1.0)) for q in q_list) or assignment.get("max_score", 10.0))
                pct = round((tot / max_tot) * 100, 1) if max_tot > 0 else 0.0
                question_details["total_score"] = round(tot, 2)
                question_details["max_score"] = round(max_tot, 2)
                question_details["percentage"] = pct
                calc_score = round(tot, 2)
            q_details_str = json.dumps(question_details, ensure_ascii=False)
        elif isinstance(question_details, str):
            q_details_str = question_details
            try:
                parsed_q = json.loads(question_details)
                if isinstance(parsed_q, dict) and "total_score" in parsed_q:
                    calc_score = float(parsed_q["total_score"])
            except Exception:
                pass

    if score is not None and str(score).strip() != "":
        score_val = float(score)
    elif calc_score is not None:
        score_val = calc_score
    else:
        score_val = None

    asg_max = float(assignment.get("max_score") or 10.0)

    # Valid statuses: 'Đã đạt', 'Cần sửa', 'Cần nộp lại', 'Chưa hoàn thành'
    valid_statuses = ['Đã đạt', 'Cần sửa', 'Cần nộp lại', 'Chưa hoàn thành']
    if not status or status not in valid_statuses:
        if score_val is not None and asg_max > 0:
            status = 'Đã đạt' if (score_val / asg_max) >= 0.7 else 'Cần sửa'
        else:
            status = 'Đã đạt'

    sp_errors_val = int(spelling_errors or 0)
    sp_types_str = json.dumps(spelling_error_types if isinstance(spelling_error_types, list) else [], ensure_ascii=False)
    rubrics_str = json.dumps(writing_rubrics if isinstance(writing_rubrics, dict) else {}, ensure_ascii=False)

    cursor.execute("""
        INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, question_details, spelling_errors, spelling_error_types, writing_rubrics, operator)
        VALUES (?, ?, 'grade', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (student["id"], assignment["id"], attempt_num, now_str, score_val, status, teacher_note.strip(), q_details_str, sp_errors_val, sp_types_str, rubrics_str, operator))
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
        "question_details": q_details_str,
        "spelling_errors": sp_errors_val,
        "spelling_error_types": sp_types_str,
        "writing_rubrics": rubrics_str,
        "animal_group": student.get("animal_group"),
        "graded_at": now_str
    }

def record_grading_batch(student_ids, assignment_id, score=None, status=None, teacher_note="", operator="Cô Linh", question_details=None, animal_group=None, animal_symbol=None, animal_title=None, spelling_errors=0, spelling_error_types=None, writing_rubrics=None):
    """
    Teacher grades multiple students in a single batch operation.
    Iterates over student_ids (numeric IDs or string codes) and records grading for each student.
    Returns summary and list of individual grading results.
    """
    if not student_ids or not isinstance(student_ids, (list, tuple, set)):
        return {"success": False, "error": "Danh sách học sinh không hợp lệ!", "results": []}

    results = []
    errors = []
    for sid in student_ids:
        try:
            res = record_grading(sid, assignment_id, score, status, teacher_note, operator=operator, question_details=question_details, animal_group=animal_group, animal_symbol=animal_symbol, animal_title=animal_title, spelling_errors=spelling_errors, spelling_error_types=spelling_error_types, writing_rubrics=writing_rubrics)
            if res.get("success"):
                results.append(res)
            else:
                errors.append({"student_id": sid, "error": res.get("error")})
        except Exception as e:
            errors.append({"student_id": sid, "error": str(e)})

    return {
        "success": len(results) > 0,
        "count": len(results),
        "total_requested": len(student_ids),
        "results": results,
        "errors": errors
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

# --- 3-Tier Pedagogical Analysis & Matrix Heatmap ---
def get_assignment_analysis(assignment_id):
    """
    3-Tier Pedagogical Analysis for an assignment:
    - Tier 1 (Toàn bài): submission/grading metrics, average score, %, passing rate, score distributions
    - Tier 2 (Theo Mục Tiêu - MT): target mastery percentage, pass/fail status, list of students failing each MT
    - Tier 3 (Theo Từng Câu): success rate per question, error causes breakdown, list of students who failed each question with specific causes
    - Heatmap Matrix: 29 students x questions with status (correct/incorrect/need_fix/pending), scores, cause, and bottom summary row.
    """
    conn = get_db()
    cursor = conn.cursor()
    assignment = get_assignment_by_id(assignment_id)
    if not assignment:
        conn.close()
        return None

    students = get_students(include_inactive=False)
    questions_data = assignment.get("questions_data") or []
    if not questions_data and assignment.get("questions"):
        # Synthesize questions_data if not yet present
        per_score = round(float(assignment.get("max_score", 10.0)) / max(1, len(assignment["questions"])), 2)
        for i, q in enumerate(assignment["questions"]):
            mt_idx = 1 if i < 3 else (2 if i < 5 else 3)
            questions_data.append({
                "num": i + 1,
                "label": f"C{i + 1}",
                "name": str(q),
                "target": f"MT{mt_idx}",
                "target_name": f"Mục tiêu {mt_idx}",
                "skill": f"Kĩ năng C{i + 1}",
                "max_score": per_score
            })

    for i, q in enumerate(questions_data):
        if "num" not in q:
            q["num"] = i + 1
        if "label" not in q:
            q["label"] = f"C{q['num']}"
        if "target" not in q:
            q["target"] = "MT1"
        if "target_name" not in q:
            q["target_name"] = f"Mục tiêu {q['target']}"

    # Fetch latest grade event for each student in this assignment
    cursor.execute("""
        SELECT se.*, s.code, s.full_name, s.gender, s.group_name, s.group_color, s.order_num
        FROM submission_events se
        JOIN students s ON se.student_id = s.id
        WHERE se.assignment_id = ? AND se.event_type = 'grade'
        AND se.id = (
            SELECT MAX(id) FROM submission_events 
            WHERE student_id = se.student_id AND assignment_id = ? AND event_type = 'grade'
        )
    """, (assignment_id, assignment_id))
    grade_rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    grades_by_student = {r["student_id"]: r for r in grade_rows}

    # Prepare Tier 1 metrics
    total_students = len(students)
    graded_count = len(grade_rows)
    asg_max = float(assignment.get("max_score") or 10.0)

    scores = [r["score"] for r in grade_rows if r["score"] is not None]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    avg_percentage = round((avg_score / asg_max) * 100, 1) if asg_max > 0 else 0.0

    passed_count = sum(1 for s in scores if (s / asg_max) >= 0.7)
    failed_count = graded_count - passed_count
    pass_rate = round((passed_count / max(1, graded_count)) * 100, 1) if graded_count > 0 else 0.0

    score_dist = {
        "gioi": sum(1 for s in scores if (s / asg_max) >= 0.85),
        "kha": sum(1 for s in scores if 0.70 <= (s / asg_max) < 0.85),
        "can_co_gang": sum(1 for s in scores if (s / asg_max) < 0.70)
    }

    tier1 = {
        "total_students": total_students,
        "graded_count": graded_count,
        "average_score": avg_score,
        "max_score": asg_max,
        "average_percentage": avg_percentage,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "pass_rate": pass_rate,
        "score_distribution": score_dist
    }

    # Group questions by target (MT)
    targets_map = {}
    for q in questions_data:
        t_code = q.get("target") or "MT1"
        if t_code not in targets_map:
            targets_map[t_code] = {
                "code": t_code,
                "name": q.get("target_name") or f"Mục tiêu {t_code}",
                "questions": [],
                "skills": set(),
                "max_score": 0.0
            }
        targets_map[t_code]["questions"].append(q["num"])
        if q.get("skill"):
            targets_map[t_code]["skills"].add(q["skill"])
        targets_map[t_code]["max_score"] += float(q.get("max_score", 1.0))

    # Evaluate student question responses
    student_q_evals = {}
    for r in grade_rows:
        sid = r["student_id"]
        raw_qd = r.get("question_details") or "{}"
        parsed_qd = {}
        if isinstance(raw_qd, str):
            try:
                parsed_qd = json.loads(raw_qd)
            except Exception:
                parsed_qd = {}
        elif isinstance(raw_qd, dict):
            parsed_qd = raw_qd

        q_list = parsed_qd.get("questions") if isinstance(parsed_qd, dict) else []
        eval_map = {}
        if isinstance(q_list, list):
            for item in q_list:
                num = item.get("num")
                if num is not None:
                    eval_map[num] = item

        student_q_evals[sid] = eval_map

    # Process Tier 3: Theo từng câu
    tier3_questions = []
    for q in questions_data:
        q_num = q["num"]
        q_label = q.get("label", f"C{q_num}")
        q_max = float(q.get("max_score", 1.0))
        t_code = q.get("target", "MT1")
        t_name = q.get("target_name", "")
        skill = q.get("skill", "")

        correct_c = 0
        incorrect_c = 0
        need_fix_c = 0
        causes_map = {}
        failed_studs = []

        for st in students:
            sid = st["id"]
            if sid not in grades_by_student:
                continue
            ev = student_q_evals.get(sid, {}).get(q_num)
            if not ev:
                st_score = grades_by_student[sid].get("score") or 0.0
                if (st_score / asg_max) >= 0.7:
                    q_st = "correct"
                    q_sc = q_max
                    cause = ""
                else:
                    q_st = "incorrect"
                    q_sc = 0.0
                    cause = "Chưa hiểu bản chất"
            else:
                q_st = ev.get("status", "correct")
                q_sc = float(ev.get("score", q_max if q_st == "correct" else 0.0))
                cause = ev.get("cause", "")

            if q_st == "correct":
                correct_c += 1
            elif q_st == "need_fix":
                need_fix_c += 1
                if cause:
                    causes_map[cause] = causes_map.get(cause, 0) + 1
                failed_studs.append({
                    "student_id": sid,
                    "code": st["code"],
                    "full_name": st["full_name"],
                    "status": "need_fix",
                    "score": q_sc,
                    "max_score": q_max,
                    "cause": cause or "Cần hoàn thiện"
                })
            else:
                incorrect_c += 1
                if cause:
                    causes_map[cause] = causes_map.get(cause, 0) + 1
                failed_studs.append({
                    "student_id": sid,
                    "code": st["code"],
                    "full_name": st["full_name"],
                    "status": "incorrect",
                    "score": q_sc,
                    "max_score": q_max,
                    "cause": cause or "Sai"
                })

        evaluated_total = correct_c + incorrect_c + need_fix_c
        pct = round((correct_c / max(1, evaluated_total)) * 100, 1) if evaluated_total > 0 else 0.0

        tier3_questions.append({
            "num": q_num,
            "label": q_label,
            "name": q.get("name", f"Câu {q_num}"),
            "target": t_code,
            "target_name": t_name,
            "skill": skill,
            "max_score": q_max,
            "total_evaluated": evaluated_total,
            "correct_count": correct_c,
            "incorrect_count": incorrect_c,
            "need_fix_count": need_fix_c,
            "correct_percentage": pct,
            "is_passed": pct >= 70.0,
            "causes_summary": causes_map,
            "failed_students": failed_studs
        })

    # Process Tier 2: Theo mục tiêu (MT)
    tier2_targets = []
    for t_code, t_info in targets_map.items():
        t_qnums = t_info["questions"]
        t_max = t_info["max_score"]
        t_name = t_info["name"]
        skills_str = ", ".join(sorted(list(t_info["skills"])))

        total_pts_possible = 0.0
        total_pts_earned = 0.0
        failed_studs = []

        for st in students:
            sid = st["id"]
            if sid not in grades_by_student:
                continue
            st_t_earned = 0.0
            st_causes = []

            for q_num in t_qnums:
                ev = student_q_evals.get(sid, {}).get(q_num)
                q_def = next((x for x in questions_data if x["num"] == q_num), None)
                q_m = float(q_def.get("max_score", 1.0)) if q_def else 1.0

                if ev:
                    sc = float(ev.get("score", q_m if ev.get("status") == "correct" else 0.0))
                    if ev.get("cause"):
                        st_causes.append(ev.get("cause"))
                else:
                    st_score = grades_by_student[sid].get("score") or 0.0
                    sc = q_m if (st_score / asg_max) >= 0.7 else 0.0

                st_t_earned += sc

            total_pts_possible += t_max
            total_pts_earned += st_t_earned
            st_pct = round((st_t_earned / max(0.1, t_max)) * 100, 1)

            if st_pct < 70.0:
                failed_studs.append({
                    "student_id": sid,
                    "code": st["code"],
                    "full_name": st["full_name"],
                    "group_name": st.get("group_name", "Nhóm 1"),
                    "group_color": st.get("group_color", "#3B82F6"),
                    "score": round(st_t_earned, 2),
                    "max_score": round(t_max, 2),
                    "percentage": st_pct,
                    "causes": list(set(st_causes))
                })

        t_overall_pct = round((total_pts_earned / max(0.1, total_pts_possible)) * 100, 1) if total_pts_possible > 0 else 0.0

        tier2_targets.append({
            "target_code": t_code,
            "target_name": t_name,
            "skills": skills_str,
            "question_nums": t_qnums,
            "max_score": round(t_max, 2),
            "total_students": graded_count,
            "failed_count": len(failed_studs),
            "percentage": t_overall_pct,
            "is_passed": t_overall_pct >= 70.0,
            "failed_students": failed_studs
        })

    # Prepare Heatmap Matrix (29 HS x Questions)
    heatmap_matrix = []
    for st in students:
        sid = st["id"]
        gr = grades_by_student.get(sid)
        eval_map = student_q_evals.get(sid, {})

        q_cells = []
        for q in questions_data:
            q_num = q["num"]
            q_max = float(q.get("max_score", 1.0))
            if not gr:
                q_cells.append({
                    "num": q_num,
                    "label": q.get("label", f"C{q_num}"),
                    "status": "pending",
                    "score": None,
                    "max_score": q_max,
                    "cause": ""
                })
            else:
                ev = eval_map.get(q_num)
                if ev:
                    q_cells.append({
                        "num": q_num,
                        "label": q.get("label", f"C{q_num}"),
                        "status": ev.get("status", "correct"),
                        "score": ev.get("score"),
                        "max_score": q_max,
                        "cause": ev.get("cause", "")
                    })
                else:
                    is_ok = (gr.get("score", 0) / asg_max) >= 0.7
                    q_cells.append({
                        "num": q_num,
                        "label": q.get("label", f"C{q_num}"),
                        "status": "correct" if is_ok else "incorrect",
                        "score": q_max if is_ok else 0.0,
                        "max_score": q_max,
                        "cause": "" if is_ok else "Chưa hiểu bản chất"
                    })

        st_sc = gr.get("score") if gr else None
        st_pct = round((st_sc / asg_max) * 100, 1) if (gr and st_sc is not None and asg_max > 0) else None
        st_status = gr.get("status") if gr else "Chưa nộp"

        heatmap_matrix.append({
            "stt": st["order_num"],
            "student_id": sid,
            "code": st["code"],
            "full_name": st["full_name"],
            "gender": st["gender"],
            "group_name": st.get("group_name", "Nhóm 1"),
            "group_color": st.get("group_color", "#3B82F6"),
            "is_graded": gr is not None,
            "score": st_sc,
            "max_score": asg_max,
            "percentage": st_pct,
            "status": st_status,
            "questions": q_cells
        })

    # Bottom summary row for Heatmap
    bottom_summary = []
    for q_item in tier3_questions:
        bottom_summary.append({
            "num": q_item["num"],
            "label": q_item["label"],
            "correct_percentage": q_item["correct_percentage"],
            "is_passed": q_item["is_passed"]
        })

    return {
        "assignment": assignment,
        "tier1": tier1,
        "tier2": tier2_targets,
        "tier3": tier3_questions,
        "heatmap": {
            "matrix": heatmap_matrix,
            "summary_row": bottom_summary
        }
    }

# --- Bottleneck Detection & Clustering ---
def get_learning_bottlenecks(assignment_id=None):
    """
    Identifies learning bottlenecks where success rate < 70% or where error clusters exist.
    Groups students requiring intervention and suggests remediation groups.
    """
    assignments_to_check = []
    if assignment_id:
        asg = get_assignment_by_id(assignment_id)
        if asg:
            assignments_to_check.append(asg)
    else:
        assignments_to_check = get_assignments()

    bottlenecks = []
    for asg in assignments_to_check:
        aid = asg["id"]
        analysis = get_assignment_analysis(aid)
        if not analysis:
            continue

        for t in analysis["tier2"]:
            if len(t["failed_students"]) > 0 or not t["is_passed"]:
                cause_counts = {}
                for fs in t["failed_students"]:
                    for c in fs.get("causes", []):
                        cause_counts[c] = cause_counts.get(c, 0) + 1

                sorted_causes = sorted(cause_counts.items(), key=lambda x: x[1], reverse=True)

                bottlenecks.append({
                    "id": f"bn_{aid}_{t['target_code']}",
                    "assignment_id": aid,
                    "assignment_title": asg["title"],
                    "subject": asg["subject"],
                    "target_code": t["target_code"],
                    "target_name": t["target_name"],
                    "skills": t["skills"],
                    "percentage": t["percentage"],
                    "is_passed": t["is_passed"],
                    "failed_count": len(t["failed_students"]),
                    "total_students": t["total_students"],
                    "dominant_causes": sorted_causes,
                    "students": t["failed_students"]
                })

    return bottlenecks

# --- Remediation Plans & Historical Reassessments ---
def create_remediation_plan(assignment_id, target_code, target_name, skill_name, group_name, student_ids, supplementary_task="", start_date="", notes=""):
    """
    Creates a temporary intervention / remediation group for students struggling with a bottleneck.
    """
    conn = get_db()
    cursor = conn.cursor()
    if not start_date:
        start_date = datetime.now().strftime("%Y-%m-%d")

    sids_list = student_ids if isinstance(student_ids, list) else []
    if isinstance(student_ids, str):
        try:
            sids_list = json.loads(student_ids)
        except Exception:
            sids_list = [int(s.strip()) for s in student_ids.split(",") if s.strip().isdigit()]

    sids_str = json.dumps(sids_list)
    cursor.execute("""
        INSERT INTO remediation_plans (assignment_id, target_code, target_name, skill_name, group_name, student_ids, supplementary_task, start_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    """, (assignment_id, str(target_code).strip(), str(target_name).strip(), str(skill_name).strip(), str(group_name).strip(), sids_str, str(supplementary_task).strip(), start_date, str(notes).strip()))
    plan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_remediation_plan_by_id(plan_id)

def get_remediation_plan_by_id(plan_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM remediation_plans WHERE id = ?", (plan_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    p = dict(row)
    try:
        p["student_ids"] = json.loads(p.get("student_ids") or "[]")
    except Exception:
        p["student_ids"] = []
    try:
        p["reassessments"] = json.loads(p.get("reassessments") or "[]")
    except Exception:
        p["reassessments"] = []

    students_map = {s["id"]: s for s in get_students()}
    p["students"] = [students_map[sid] for sid in p["student_ids"] if sid in students_map]
    return p

def get_remediation_plans(assignment_id=None, status=None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM remediation_plans WHERE 1=1"
    params = []
    if assignment_id:
        query += " AND assignment_id = ?"
        params.append(assignment_id)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY id DESC"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    students_map = {s["id"]: s for s in get_students()}
    plans = []
    for r in rows:
        try:
            r["student_ids"] = json.loads(r.get("student_ids") or "[]")
        except Exception:
            r["student_ids"] = []
        try:
            r["reassessments"] = json.loads(r.get("reassessments") or "[]")
        except Exception:
            r["reassessments"] = []
        r["students"] = [students_map[sid] for sid in r["student_ids"] if sid in students_map]
        plans.append(r)
    return plans

def record_reassessment(plan_id, student_id, score, max_score=10.0, status='Đã đạt', note='', operator='Cô Linh'):
    """
    Teacher re-evaluates a student after remediation.
    Strictly preserves historical evidence (Never overwrites earlier evaluations).
    Logs timeline: Lần 1: 50% -> Lần 2 (Sau rèn): 85% ĐÃ ĐẠT.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM remediation_plans WHERE id = ?", (plan_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": "Kế hoạch rèn không tồn tại!"}

    plan = dict(row)
    try:
        reassessments = json.loads(plan.get("reassessments") or "[]")
    except Exception:
        reassessments = []

    st_id = int(student_id)
    score_f = float(score)
    max_score_f = float(max_score) if max_score and float(max_score) > 0 else 10.0
    pct = round((score_f / max_score_f) * 100, 1)

    prev_count = sum(1 for ra in reassessments if ra.get("student_id") == st_id)

    new_entry = {
        "attempt": prev_count + 1,
        "student_id": st_id,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "score": score_f,
        "max_score": max_score_f,
        "percentage": pct,
        "status": status,
        "note": note.strip(),
        "operator": operator
    }
    reassessments.append(new_entry)
    reassessments_str = json.dumps(reassessments, ensure_ascii=False)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE remediation_plans
        SET reassessments = ?, updated_at = ?
        WHERE id = ?
    """, (reassessments_str, now_str, plan_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "plan_id": plan_id,
        "reassessment": new_entry,
        "plan": get_remediation_plan_by_id(plan_id)
    }

# --- Spelling Statistics & Student Growth ---
def get_spelling_statistics(student_id=None):
    """
    Aggregates spelling errors for a student or entire class:
    - Total spelling errors across assignments
    - Breakdown of error types: Âm đầu / Vần / Dấu thanh / Viết hoa / Dấu câu / Trình bày / Chưa hoàn thành
    - Common repeated error patterns (e.g., tr/ch: 5 lần, viết hoa: 3 lần)
    """
    conn = get_db()
    cursor = conn.cursor()
    query = """
        SELECT se.*, s.code, s.full_name
        FROM submission_events se
        JOIN students s ON se.student_id = s.id
        WHERE se.event_type = 'grade' AND (se.spelling_errors > 0 OR (se.spelling_error_types IS NOT NULL AND se.spelling_error_types != '[]' AND se.spelling_error_types != ''))
    """
    params = []
    if student_id:
        query += " AND se.student_id = ?"
        params.append(int(student_id))
    query += " ORDER BY se.id ASC"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_errors = sum(r.get("spelling_errors", 0) for r in rows)
    type_counts = {}
    word_patterns = {}

    for r in rows:
        raw_types = r.get("spelling_error_types") or "[]"
        parsed_types = []
        if isinstance(raw_types, str):
            try:
                parsed_types = json.loads(raw_types)
            except Exception:
                parsed_types = []
        elif isinstance(raw_types, list):
            parsed_types = raw_types

        for t in parsed_types:
            if isinstance(t, dict):
                cat = t.get("category", "Khác")
                word = t.get("pattern") or t.get("word")
            else:
                cat = str(t)
                word = None
            type_counts[cat] = type_counts.get(cat, 0) + 1
            if word:
                word_patterns[word] = word_patterns.get(word, 0) + 1

    return {
        "student_id": student_id,
        "total_errors": total_errors,
        "error_types": type_counts,
        "repeated_patterns": sorted(word_patterns.items(), key=lambda x: x[1], reverse=True),
        "total_graded_spelling_events": len(rows)
    }

def get_student_growth_profile(student_id):
    """
    Consolidates a student's full historical growth:
    - All submissions and scores
    - Remediation history (before vs after intervention)
    - Spelling error trends
    """
    student = get_student_by_id(student_id)
    if not student:
        return None

    all_plans = get_remediation_plans()
    student_remediations = []
    for p in all_plans:
        if student["id"] in p.get("student_ids", []):
            st_reassessments = [ra for ra in p.get("reassessments", []) if ra.get("student_id") == int(student["id"])]
            student_remediations.append({
                "plan_id": p["id"],
                "target_code": p["target_code"],
                "target_name": p["target_name"],
                "group_name": p["group_name"],
                "start_date": p["start_date"],
                "reassessments": st_reassessments
            })

    spelling_stats = get_spelling_statistics(student_id)

    assignments = get_assignments()
    timeline = []
    for asg in assignments:
        history = get_submission_history(student_id, asg["id"])
        if history:
            timeline.append({
                "assignment_id": asg["id"],
                "assignment_title": asg["title"],
                "subject": asg["subject"],
                "max_score": asg["max_score"],
                "history": history
            })

    return {
        "student": student,
        "timeline": timeline,
        "remediations": student_remediations,
        "spelling": spelling_stats
    }

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

        # Determine animal mascot: check subject-specific animal first, fallback to base animal
        subj = assignment.get("subject", "Toán")
        subj_animal = (st.get("subject_animals") or {}).get(subj)
        if subj_animal and isinstance(subj_animal, dict):
            anim_group = subj_animal.get("group", st.get("animal_group", "orange_cat"))
            anim_symbol = subj_animal.get("symbol", st.get("animal_symbol", "🐱"))
            anim_title = subj_animal.get("title", anim_symbol)
        else:
            anim_group = st.get("animal_group", "orange_cat")
            anim_symbol = st.get("animal_symbol", "🐱")
            anim_title = st.get("animal_title", anim_symbol)

        matrix.append({
            "stt": st["order_num"],
            "student_id": st["id"],
            "code": st["code"],
            "full_name": st["full_name"],
            "gender": st["gender"],
            "group_name": st.get("group_name", "Nhóm 1"),
            "group_color": st.get("group_color", "#3B82F6"),
            "animal_group": anim_group,
            "animal_symbol": anim_symbol,
            "animal_title": anim_title,
            "subject_animals": st.get("subject_animals", {}),
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
# --- Team Management Engine ---
def get_teams():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM teams ORDER BY id ASC")
    team_rows = [dict(r) for r in cursor.fetchall()]
    for t in team_rows:
        cursor.execute("""
            SELECT s.id, s.code, s.full_name, s.gender, s.animal_group, s.animal_symbol, s.animal_title, tm.role
            FROM team_members tm
            JOIN students s ON tm.student_id = s.id
            WHERE tm.team_id = ?
            ORDER BY s.order_num ASC, s.id ASC
        """, (t["id"],))
        t["members"] = [dict(m) for m in cursor.fetchall()]
        t["member_count"] = len(t["members"])
    conn.close()
    return team_rows

def get_team_by_id(team_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    team = dict(row)
    cursor.execute("""
        SELECT s.id, s.code, s.full_name, s.gender, s.animal_group, s.animal_symbol, s.animal_title, tm.role
        FROM team_members tm
        JOIN students s ON tm.student_id = s.id
        WHERE tm.team_id = ?
        ORDER BY s.order_num ASC, s.id ASC
    """, (team["id"],))
    team["members"] = [dict(m) for m in cursor.fetchall()]
    team["member_count"] = len(team["members"])
    conn.close()
    return team

def _resolve_student_id(cursor, sid_or_code):
    if isinstance(sid_or_code, int) or (isinstance(sid_or_code, str) and sid_or_code.isdigit()):
        cursor.execute("SELECT id FROM students WHERE id = ?", (int(sid_or_code),))
        row = cursor.fetchone()
        if row:
            return row[0]
    cursor.execute("SELECT id FROM students WHERE code = ?", (str(sid_or_code).strip().upper(),))
    row = cursor.fetchone()
    return row[0] if row else None

def create_team(name, color="#3B82F6", icon="⭐", image="", motto="", member_ids=None, max_capacity=0):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO teams (name, color, icon, image, motto, max_capacity)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name.strip(), color.strip() if color else "#3B82F6", icon.strip() if icon else "⭐", (image or "").strip(), (motto or "").strip(), int(max_capacity or 0)))
    team_id = cursor.lastrowid
    if member_ids and isinstance(member_ids, list):
        for sid in member_ids:
            real_sid = _resolve_student_id(cursor, sid)
            if real_sid:
                cursor.execute("""
                    INSERT OR IGNORE INTO team_members (team_id, student_id)
                    VALUES (?, ?)
                """, (team_id, real_sid))
    conn.commit()
    conn.close()
    return get_team_by_id(team_id)

def update_team(team_id, name, color="#3B82F6", icon="⭐", image="", motto="", member_ids=None, max_capacity=None):
    conn = get_db()
    cursor = conn.cursor()
    if max_capacity is not None:
        cursor.execute("""
            UPDATE teams
            SET name = ?, color = ?, icon = ?, image = ?, motto = ?, max_capacity = ?
            WHERE id = ?
        """, (name.strip(), color.strip() if color else "#3B82F6", icon.strip() if icon else "⭐", (image or "").strip(), (motto or "").strip(), int(max_capacity or 0), int(team_id)))
    else:
        cursor.execute("""
            UPDATE teams
            SET name = ?, color = ?, icon = ?, image = ?, motto = ?
            WHERE id = ?
        """, (name.strip(), color.strip() if color else "#3B82F6", icon.strip() if icon else "⭐", (image or "").strip(), (motto or "").strip(), int(team_id)))
    if member_ids is not None and isinstance(member_ids, list):
        cursor.execute("DELETE FROM team_members WHERE team_id = ?", (int(team_id),))
        for sid in member_ids:
            real_sid = _resolve_student_id(cursor, sid)
            if real_sid:
                cursor.execute("""
                    INSERT OR IGNORE INTO team_members (team_id, student_id)
                    VALUES (?, ?)
                """, (int(team_id), real_sid))
    conn.commit()
    conn.close()
    return get_team_by_id(team_id)

def delete_team(team_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM team_members WHERE team_id = ?", (int(team_id),))
    cursor.execute("DELETE FROM teams WHERE id = ?", (int(team_id),))
    conn.commit()
    conn.close()
    return True

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
