import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Student, Assignment, SubmissionEvent, Settings, TrackingRow, AnalyticsData } from "./types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "learning.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!global.__db) {
    global.__db = new Database(DB_PATH);
    global.__db.pragma("foreign_keys = ON");
    global.__db.pragma("journal_mode = WAL");
    initDb(global.__db);
  }

  return global.__db;
}

function initDb(db: Database.Database) {
  db.exec(`
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
      event_type TEXT NOT NULL, -- 'submit', 'grade', 'resubmit'
      attempt_number INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      is_late INTEGER DEFAULT 0,
      score REAL DEFAULT NULL,
      status TEXT DEFAULT 'Đã nộp',
      teacher_note TEXT DEFAULT '',
      operator TEXT DEFAULT 'Học sinh',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Default settings
  const defaultSettings: Record<string, string> = {
    teacher_name: "Cô Linh",
    class_name: "Lớp 3A7",
    teacher_pin: "1234",
    school_name: "Trường Tiểu Học Ánh Dương",
    google_sheet_url: "",
    auto_sync_sheets: "true",
  };

  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertSetting.run(key, val);
  }
  db.prepare("UPDATE settings SET value = 'Lớp 3A7' WHERE key = 'class_name' AND value = 'Lớp 3A'").run();

  // Seed 29 students of Lớp 3A7 from 3a7.xlsx
  const countRow = db.prepare("SELECT COUNT(*) as count FROM students").get() as { count: number };
  if (countRow.count === 0 || countRow.count === 30) {
    db.prepare("DELETE FROM submission_events").run();
    db.prepare("DELETE FROM students").run();

    const seedStudents = [
      ["HS01", "Vỹ An", "Nữ", 1],
      ["HS02", "Tuệ An", "Nữ", 2],
      ["HS03", "Lam Anh", "Nữ", 3],
      ["HS04", "Minh Anh", "Nữ", 4],
      ["HS05", "Hoàng Ân", "Nam", 5],
      ["HS06", "Gia Bảo", "Nam", 6],
      ["HS07", "Lan Chi", "Nữ", 7],
      ["HS08", "Thiên Di", "Nữ", 8],
      ["HS09", "Hải Đăng", "Nam", 9],
      ["HS10", "Minh Hoàng", "Nam", 10],
      ["HS11", "Phúc Hưng", "Nam", 11],
      ["HS12", "Gia Hào", "Nam", 12],
      ["HS13", "An Khang", "Nam", 13],
      ["HS14", "Đăng Khang", "Nam", 14],
      ["HS15", "Chí Khôi", "Nam", 15],
      ["HS16", "Phương Lâm", "Nữ", 16],
      ["HS17", "Phúc Lâm", "Nam", 17],
      ["HS18", "Tuệ Linh", "Nữ", 18],
      ["HS19", "Hà Linh", "Nữ", 19],
      ["HS20", "Hà My", "Nữ", 20],
      ["HS21", "Thiện Nhân", "Nam", 21],
      ["HS22", "Mộc Nhi", "Nữ", 22],
      ["HS23", "Hạ Nhiên", "Nữ", 23],
      ["HS24", "Thanh Phương", "Nữ", 24],
      ["HS25", "Minh Phương", "Nữ", 25],
      ["HS26", "Gia Phát", "Nam", 26],
      ["HS27", "Minh Tân", "Nam", 27],
      ["HS28", "Minh Thư", "Nữ", 28],
      ["HS29", "Tấn Tài", "Nam", 29],
    ];

    const insertStudent = db.prepare(
      "INSERT INTO students (code, full_name, gender, order_num, class_name) VALUES (?, ?, ?, ?, 'Lớp 3A7')"
    );
    const insertMany = db.transaction((list) => {
      for (const st of list) insertStudent.run(...st);
    });
    insertMany(seedStudents);
  }

  // Seed sample assignments if none exist
  const asgnCount = db.prepare("SELECT COUNT(*) as count FROM assignments").get() as { count: number };
  if (asgnCount.count === 0) {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const dueToday = `${todayStr} 23:59:59`;

    const yesterday = new Date(now.getTime() - 86400000);
    const yestStr = yesterday.toISOString().split("T")[0];
    const dueYesterday = `${yestStr} 17:00:00`;

    const insAsg = db.prepare(`
      INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const r1 = insAsg.run(
      "Phiếu bài tập Toán: Phép nhân và phép chia trong phạm vi 1000",
      "Toán",
      todayStr,
      dueToday,
      10.0,
      "Học sinh hoàn thành các bài tập trong phiếu và nộp vở tại góc nộp bài."
    );
    const asgn1 = r1.lastInsertRowid;

    insAsg.run(
      "Chính tả & Luyện từ và câu: Mùa thu yêu thương",
      "Tiếng Việt",
      yestStr,
      dueYesterday,
      10.0,
      "Viết bài chính tả sạch đẹp, rèn chữ giữ vở."
    );

    // Initial audit events to demonstrate progress & retry
    const insEvent = db.prepare(`
      INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insEvent.run(1, asgn1, "submit", 1, `${todayStr} 08:30:00`, 0, null, "Đã nộp", "", "Học sinh");
    insEvent.run(1, asgn1, "grade", 1, `${todayStr} 09:15:00`, 0, 10.0, "Đã đạt", "Bài làm rất sạch đẹp và chuẩn xác!", "Cô Linh");

    insEvent.run(2, asgn1, "submit", 1, `${todayStr} 08:35:00`, 0, null, "Đã nộp", "", "Học sinh");
    insEvent.run(2, asgn1, "grade", 1, `${todayStr} 09:20:00`, 0, 6.0, "Cần sửa", "Em xem lại câu 3 tính nhầm phép chia nhé.", "Cô Linh");
    insEvent.run(2, asgn1, "submit", 2, `${todayStr} 10:10:00`, 0, null, "Đã nộp lại", "", "Học sinh");
    insEvent.run(2, asgn1, "grade", 2, `${todayStr} 10:30:00`, 0, 9.5, "Đã đạt", "Đã sửa chính xác câu 3, rất tiến bộ!", "Cô Linh");
  }
}

// --- Settings ---
export function getSettings(): Settings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings as unknown as Settings;
}

export function updateSettings(data: Partial<Settings>): Settings {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) upsert.run(key, String(val));
  }
  return getSettings();
}

// --- Students ---
export function getStudents(includeInactive = false): Student[] {
  const db = getDb();
  if (includeInactive) {
    return db.prepare("SELECT * FROM students ORDER BY order_num ASC, code ASC").all() as Student[];
  }
  return db.prepare("SELECT * FROM students WHERE is_active = 1 ORDER BY order_num ASC, code ASC").all() as Student[];
}

export function getStudentById(id: number): Student | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM students WHERE id = ?").get(id) as Student) || null;
}

export function getStudentByCode(code: string): Student | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM students WHERE code = ? AND is_active = 1").get(code.trim().toUpperCase()) as Student) || null;
}

export function addStudent(code: string, fullName: string, gender = "Nam", className = "Lớp 3A7") {
  const db = getDb();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM students").get() as { next_order: number };
  const res = db.prepare(`
    INSERT INTO students (code, full_name, gender, order_num, class_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(code.trim().toUpperCase(), fullName.trim(), gender, maxOrder.next_order, className);
  return getStudentById(Number(res.lastInsertRowid));
}

// --- Assignments ---
export function getAssignments(includeInactive = false): Assignment[] {
  const db = getDb();
  if (includeInactive) {
    return db.prepare("SELECT * FROM assignments ORDER BY id DESC").all() as Assignment[];
  }
  return db.prepare("SELECT * FROM assignments WHERE is_active = 1 ORDER BY id DESC").all() as Assignment[];
}

export function getAssignmentById(id: number): Assignment | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM assignments WHERE id = ?").get(id) as Assignment) || null;
}

export function addAssignment(title: string, subject: string, assignedDate: string, dueDate: string, maxScore = 10.0, notes = "") {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO assignments (title, subject, assigned_date, due_date, max_score, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title.trim(), subject.trim(), assignedDate, dueDate, maxScore, notes.trim());
  return getAssignmentById(Number(res.lastInsertRowid));
}

// --- Submissions & Grading ---
export function recordSubmission(studentCodeOrId: string | number, assignmentId: number, operator = "Học sinh") {
  const db = getDb();
  const student = typeof studentCodeOrId === "number" || !isNaN(Number(studentCodeOrId))
    ? getStudentById(Number(studentCodeOrId))
    : getStudentByCode(String(studentCodeOrId));

  if (!student) return { success: false, error: `Không tìm thấy học sinh với mã '${studentCodeOrId}'!` };
  const assignment = getAssignmentById(assignmentId);
  if (!assignment) return { success: false, error: "Không tìm thấy bài tập đã chọn!" };

  const prevCount = db.prepare(`
    SELECT COUNT(*) as count FROM submission_events
    WHERE student_id = ? AND assignment_id = ? AND event_type IN ('submit', 'resubmit')
  `).get(student.id, assignment.id) as { count: number };

  const attemptNum = prevCount.count + 1;
  const now = new Date();
  const nowStr = now.toISOString().replace("T", " ").substring(0, 19);

  let isLate = 0;
  try {
    const due = new Date(assignment.due_date.replace(" ", "T"));
    if (now > due) isLate = 1;
  } catch {
    isLate = 0;
  }

  const eventType = attemptNum === 1 ? "submit" : "resubmit";
  const statusLabel = attemptNum > 1 ? "Đã nộp lại" : "Đã nộp";

  const res = db.prepare(`
    INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '', ?)
  `).run(student.id, assignment.id, eventType, attemptNum, nowStr, isLate, statusLabel, operator);

  return {
    success: true,
    event_id: res.lastInsertRowid,
    student,
    assignment,
    attempt_number: attemptNum,
    is_late: isLate === 1,
    status: statusLabel,
    submitted_at: nowStr,
  };
}

export function recordGrading(studentId: number, assignmentId: number, score: number | string | null, status: string, teacherNote = "", operator = "Cô Linh") {
  const db = getDb();
  const student = getStudentById(studentId);
  const assignment = getAssignmentById(assignmentId);
  if (!student || !assignment) return { success: false, error: "Học sinh hoặc bài tập không hợp lệ!" };

  const curAttempt = db.prepare(`
    SELECT COALESCE(MAX(attempt_number), 1) as attempt FROM submission_events
    WHERE student_id = ? AND assignment_id = ?
  `).get(student.id, assignment.id) as { attempt: number };

  const attemptNum = curAttempt.attempt;
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
  const scoreVal = score !== null && score !== undefined && String(score).trim() !== "" ? Number(score) : null;

  const validStatuses = ["Đã đạt", "Cần sửa", "Cần nộp lại", "Chưa hoàn thành"];
  const finalStatus = validStatuses.includes(status) ? status : "Đã đạt";

  const res = db.prepare(`
    INSERT INTO submission_events (student_id, assignment_id, event_type, attempt_number, timestamp, is_late, score, status, teacher_note, operator)
    VALUES (?, ?, 'grade', ?, ?, 0, ?, ?, ?, ?)
  `).run(student.id, assignment.id, attemptNum, nowStr, scoreVal, finalStatus, teacherNote.trim(), operator);

  return {
    success: true,
    event_id: res.lastInsertRowid,
    student,
    assignment,
    attempt_number: attemptNum,
    score: scoreVal,
    status: finalStatus,
    teacher_note: teacherNote,
    graded_at: nowStr,
  };
}

export function getSubmissionHistory(studentId: number, assignmentId: number): SubmissionEvent[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM submission_events
    WHERE student_id = ? AND assignment_id = ?
    ORDER BY id ASC
  `).all(studentId, assignmentId) as SubmissionEvent[];
}

// --- Tracking Matrix (Mục 6) ---
export function getAssignmentTrackingMatrix(assignmentId: number) {
  const db = getDb();
  const assignment = getAssignmentById(assignmentId);
  if (!assignment) return null;

  const students = getStudents();
  const events = db.prepare(`
    SELECT * FROM submission_events
    WHERE assignment_id = ?
    ORDER BY student_id ASC, id ASC
  `).all(assignmentId) as SubmissionEvent[];

  const eventsByStudent: Record<number, SubmissionEvent[]> = {};
  for (const ev of events) {
    if (!eventsByStudent[ev.student_id]) eventsByStudent[ev.student_id] = [];
    eventsByStudent[ev.student_id].push(ev);
  }

  const matrix: TrackingRow[] = [];
  for (const st of students) {
    const sEvents = eventsByStudent[st.id] || [];
    const submitEvents = sEvents.filter(e => e.event_type === "submit" || e.event_type === "resubmit");
    const gradeEvents = sEvents.filter(e => e.event_type === "grade");

    const submitCount = submitEvents.length;
    const retryCount = gradeEvents.filter(e => e.status === "Cần sửa" || e.status === "Cần nộp lại").length;

    const scores = gradeEvents.map(e => e.score).filter(s => s !== null) as number[];
    const firstScore = scores.length > 0 ? scores[0] : null;
    const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;

    let latestNote = "";
    for (let i = gradeEvents.length - 1; i >= 0; i--) {
      if (gradeEvents[i].teacher_note) {
        latestNote = gradeEvents[i].teacher_note;
        break;
      }
    }

    const latestSubmitTime = submitEvents.length > 0 ? submitEvents[submitEvents.length - 1].timestamp : "";
    const isLatestLate = submitEvents.length > 0 ? submitEvents[submitEvents.length - 1].is_late === 1 : false;

    let currentStatus = "Chưa nộp";
    let colorGroup: "green" | "yellow" | "orange" | "red" | "blue" = "red";

    if (submitCount === 0) {
      currentStatus = "Chưa nộp";
      colorGroup = "red";
    } else {
      const lastEvent = sEvents[sEvents.length - 1];
      if (lastEvent.event_type === "submit" || lastEvent.event_type === "resubmit") {
        if (submitCount > 1) {
          currentStatus = "Đã nộp lại";
          colorGroup = "blue";
        } else {
          currentStatus = isLatestLate ? "Nộp trễ" : "Đã nộp đúng hạn";
          colorGroup = isLatestLate ? "orange" : "blue";
        }
      } else {
        if (lastEvent.status === "Đã đạt") {
          currentStatus = "Đã hoàn thành";
          colorGroup = "green";
        } else if (lastEvent.status === "Cần sửa" || lastEvent.status === "Cần nộp lại") {
          currentStatus = "Đang cần sửa";
          colorGroup = "yellow";
        } else {
          currentStatus = "Chưa đạt yêu cầu";
          colorGroup = "red";
        }
      }
    }

    matrix.push({
      stt: st.order_num,
      student_id: st.id,
      code: st.code,
      full_name: st.full_name,
      gender: st.gender,
      current_status: currentStatus,
      color_group: colorGroup,
      latest_submit_time: latestSubmitTime,
      is_late: isLatestLate,
      submit_count: submitCount,
      retry_count: retryCount,
      first_score: firstScore,
      latest_score: latestScore,
      teacher_note: latestNote,
      history: sEvents,
    });
  }

  return { assignment, matrix };
}

// --- Analytics (Mục 7) ---
export function getComprehensiveAnalytics(): AnalyticsData {
  const db = getDb();
  const students = getStudents();
  const assignments = getAssignments();
  const allEvents = db.prepare("SELECT * FROM submission_events ORDER BY id ASC").all() as SubmissionEvent[];

  const totalAssignmentsCount = assignments.length;
  const studentStats = [];

  for (const st of students) {
    const stEvents = allEvents.filter(e => e.student_id === st.id);
    const submittedAsgIds = new Set(stEvents.filter(e => e.event_type.includes("submit")).map(e => e.assignment_id));
    const numSubmitted = submittedAsgIds.size;
    const numMissing = Math.max(0, totalAssignmentsCount - numSubmitted);

    const onTimeCount = stEvents.filter(e => e.event_type.includes("submit") && e.is_late === 0).length;
    const lateCount = stEvents.filter(e => e.event_type.includes("submit") && e.is_late === 1).length;

    const retryEvents = stEvents.filter(e => e.event_type === "grade" && (e.status === "Cần sửa" || e.status === "Cần nộp lại"));
    const asgRequiringRetry = new Set(retryEvents.map(e => e.assignment_id));
    const totalRetryCount = stEvents.filter(e => e.event_type === "resubmit").length;

    const completedAsgIds = new Set(stEvents.filter(e => e.event_type === "grade" && e.status === "Đã đạt").map(e => e.assignment_id));
    const numCompleted = completedAsgIds.size;
    const numUncompleted = Math.max(0, totalAssignmentsCount - numCompleted);

    const scoresByAsg: Record<number, number> = {};
    const firstScores: Record<number, number> = {};
    for (const e of stEvents) {
      if (e.event_type === "grade" && e.score !== null) {
        if (!firstScores[e.assignment_id]) firstScores[e.assignment_id] = e.score;
        scoresByAsg[e.assignment_id] = e.score;
      }
    }

    const scoreVals = Object.values(scoresByAsg);
    const avgScore = scoreVals.length > 0 ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10 : null;

    let improvedCount = 0;
    for (const aid of Object.keys(scoresByAsg).map(Number)) {
      if (firstScores[aid] && scoresByAsg[aid] > firstScores[aid]) improvedCount++;
    }

    const missingAssignments = assignments.filter(a => !submittedAsgIds.has(a.id)).map(a => a.title);
    const needFixAssignments = assignments.filter(a => asgRequiringRetry.has(a.id) && !completedAsgIds.has(a.id)).map(a => a.title);

    studentStats.push({
      student_id: st.id,
      code: st.code,
      full_name: st.full_name,
      total_assigned: totalAssignmentsCount,
      num_submitted: numSubmitted,
      num_missing: numMissing,
      on_time_count: onTimeCount,
      late_count: lateCount,
      asg_requiring_retry_count: asgRequiringRetry.size,
      total_resubmit_count: totalRetryCount,
      num_completed: numCompleted,
      num_uncompleted: numUncompleted,
      avg_score: avgScore,
      improved_count: improvedCount,
      missing_assignments: missingAssignments,
      need_fix_assignments: needFixAssignments,
    });
  }

  const totalStudentsCount = students.length;
  const assignmentStats = [];

  for (const asg of assignments) {
    const asgEvents = allEvents.filter(e => e.assignment_id === asg.id);
    const submittedStudents = new Set(asgEvents.filter(e => e.event_type.includes("submit")).map(e => e.student_id));
    const onTimeStudents = new Set(asgEvents.filter(e => e.event_type.includes("submit") && e.is_late === 0).map(e => e.student_id));
    const lateStudents = new Set(asgEvents.filter(e => e.event_type.includes("submit") && e.is_late === 1).map(e => e.student_id));
    const needFixStudents = new Set(asgEvents.filter(e => e.event_type === "grade" && (e.status === "Cần sửa" || e.status === "Cần nộp lại")).map(e => e.student_id));
    const resubmittedStudents = new Set(asgEvents.filter(e => e.event_type === "resubmit").map(e => e.student_id));
    const completedStudents = new Set(asgEvents.filter(e => e.event_type === "grade" && e.status === "Đã đạt").map(e => e.student_id));

    const latestScores: Record<number, number> = {};
    for (const e of asgEvents) {
      if (e.event_type === "grade" && e.score !== null) latestScores[e.student_id] = e.score;
    }
    const scoreVals = Object.values(latestScores);
    const asgAvgScore = scoreVals.length > 0 ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10 : null;

    assignmentStats.push({
      assignment_id: asg.id,
      title: asg.title,
      subject: asg.subject,
      due_date: asg.due_date,
      total_students: totalStudentsCount,
      num_submitted: submittedStudents.size,
      num_missing: Math.max(0, totalStudentsCount - submittedStudents.size),
      num_on_time: onTimeStudents.size,
      num_late: lateStudents.size,
      num_need_fix: needFixStudents.size,
      num_resubmitted: resubmittedStudents.size,
      num_completed: completedStudents.size,
      class_avg_score: asgAvgScore,
    });
  }

  const topOnTime = [...studentStats].sort((a, b) => b.on_time_count - a.on_time_count).slice(0, 5);
  const topMissing = [...studentStats].filter(s => s.num_missing > 0).sort((a, b) => b.num_missing - a.num_missing).slice(0, 5);
  const topLate = [...studentStats].filter(s => s.late_count > 0).sort((a, b) => b.late_count - a.late_count).slice(0, 5);
  const topRetry = [...studentStats].filter(s => s.total_resubmit_count > 0).sort((a, b) => b.total_resubmit_count - a.total_resubmit_count).slice(0, 5);
  const topImproved = [...studentStats].filter(s => s.improved_count > 0).sort((a, b) => b.improved_count - a.improved_count).slice(0, 5);

  const totalSlots = totalStudentsCount * totalAssignmentsCount || 1;
  const totalCompletedSlots = studentStats.reduce((acc, s) => acc + s.num_completed, 0);
  const classCompletionRate = Math.round((totalCompletedSlots / totalSlots) * 1000) / 10;

  return {
    student_stats: studentStats,
    assignment_stats: assignmentStats,
    whole_class: {
      total_students: totalStudentsCount,
      total_assignments: totalAssignmentsCount,
      class_completion_rate: classCompletionRate,
      top_on_time: topOnTime,
      top_missing: topMissing,
      top_late: topLate,
      top_retry: topRetry,
      top_improved: topImproved,
    },
  };
}

// --- Student Profile (Mục 8) ---
export function getStudentProfile(studentId: number) {
  const student = getStudentById(studentId);
  if (!student) return null;

  const db = getDb();
  const assignments = getAssignments();
  const events = db.prepare(`
    SELECT * FROM submission_events
    WHERE student_id = ?
    ORDER BY assignment_id ASC, id ASC
  `).all(studentId) as SubmissionEvent[];

  const eventsByAsg: Record<number, SubmissionEvent[]> = {};
  for (const ev of events) {
    if (!eventsByAsg[ev.assignment_id]) eventsByAsg[ev.assignment_id] = [];
    eventsByAsg[ev.assignment_id].push(ev);
  }

  const assignmentDetails = [];
  for (const asg of assignments) {
    const aEvents = eventsByAsg[asg.id] || [];
    const submits = aEvents.filter(e => e.event_type.includes("submit"));
    const grades = aEvents.filter(e => e.event_type === "grade");

    const submitCount = submits.length;
    const retryCount = grades.filter(e => e.status === "Cần sửa" || e.status === "Cần nộp lại").length;
    const scores = grades.map(e => e.score).filter(s => s !== null) as number[];
    const firstScore = scores.length > 0 ? scores[0] : null;
    const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;

    let latestNote = "";
    for (let i = grades.length - 1; i >= 0; i--) {
      if (grades[i].teacher_note) {
        latestNote = grades[i].teacher_note;
        break;
      }
    }

    let status = "Chưa nộp";
    let color = "red";
    if (submitCount > 0) {
      const last = aEvents[aEvents.length - 1];
      if (last.event_type === "grade") {
        status = last.status;
        color = status === "Đã đạt" ? "green" : (status.includes("sửa") ? "yellow" : "red");
      } else {
        status = submitCount > 1 ? "Đã nộp lại" : (submits[submits.length - 1].is_late ? "Nộp trễ" : "Đã nộp đúng hạn");
        color = submits[submits.length - 1].is_late ? "orange" : "blue";
      }
    }

    assignmentDetails.push({
      assignment_id: asg.id,
      title: asg.title,
      subject: asg.subject,
      due_date: asg.due_date,
      submit_count: submitCount,
      retry_count: retryCount,
      first_score: firstScore,
      latest_score: latestScore,
      status,
      color,
      teacher_note: latestNote,
      events: aEvents,
    });
  }

  return { student, assignments: assignmentDetails };
}
