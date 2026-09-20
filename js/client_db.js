/**
 * ClientDB - Pure Client-Side Database & Business Engine for LMS Cô Linh
 * Enables 100% offline & GitHub Pages static hosting with zero backend server.
 * Uses localStorage for persistent storage and direct Google Sheets webhook sync.
 */

const DEFAULT_STUDENTS_3A7 = [
  { id: 1, code: "HS01", full_name: "Vỹ An", order_num: 1, class_name: "Lớp 3A7" },
  { id: 2, code: "HS02", full_name: "Tuệ An", order_num: 2, class_name: "Lớp 3A7" },
  { id: 3, code: "HS03", full_name: "Lam Anh", order_num: 3, class_name: "Lớp 3A7" },
  { id: 4, code: "HS04", full_name: "Minh Anh", order_num: 4, class_name: "Lớp 3A7" },
  { id: 5, code: "HS05", full_name: "Hoàng Ân", order_num: 5, class_name: "Lớp 3A7" },
  { id: 6, code: "HS06", full_name: "Gia Bảo", order_num: 6, class_name: "Lớp 3A7" },
  { id: 7, code: "HS07", full_name: "Lan Chi", order_num: 7, class_name: "Lớp 3A7" },
  { id: 8, code: "HS08", full_name: "Thiên Di", order_num: 8, class_name: "Lớp 3A7" },
  { id: 9, code: "HS09", full_name: "Hải Đăng", order_num: 9, class_name: "Lớp 3A7" },
  { id: 10, code: "HS10", full_name: "Minh Hoàng", order_num: 10, class_name: "Lớp 3A7" },
  { id: 11, code: "HS11", full_name: "Phúc Hưng", order_num: 11, class_name: "Lớp 3A7" },
  { id: 12, code: "HS12", full_name: "Gia Hào", order_num: 12, class_name: "Lớp 3A7" },
  { id: 13, code: "HS13", full_name: "An Khang", order_num: 13, class_name: "Lớp 3A7" },
  { id: 14, code: "HS14", full_name: "Đăng Khang", order_num: 14, class_name: "Lớp 3A7" },
  { id: 15, code: "HS15", full_name: "Chí Khôi", order_num: 15, class_name: "Lớp 3A7" },
  { id: 16, code: "HS16", full_name: "Phương Lâm", order_num: 16, class_name: "Lớp 3A7" },
  { id: 17, code: "HS17", full_name: "Phúc Lâm", order_num: 17, class_name: "Lớp 3A7" },
  { id: 18, code: "HS18", full_name: "Tuệ Linh", order_num: 18, class_name: "Lớp 3A7" },
  { id: 19, code: "HS19", full_name: "Hà Linh", order_num: 19, class_name: "Lớp 3A7" },
  { id: 20, code: "HS20", full_name: "Hà My", order_num: 20, class_name: "Lớp 3A7" },
  { id: 21, code: "HS21", full_name: "Thiện Nhân", order_num: 21, class_name: "Lớp 3A7" },
  { id: 22, code: "HS22", full_name: "Mộc Nhi", order_num: 22, class_name: "Lớp 3A7" },
  { id: 23, code: "HS23", full_name: "Hạ Nhiên", order_num: 23, class_name: "Lớp 3A7" },
  { id: 24, code: "HS24", full_name: "Thanh Phương", order_num: 24, class_name: "Lớp 3A7" },
  { id: 25, code: "HS25", full_name: "Minh Phương", order_num: 25, class_name: "Lớp 3A7" },
  { id: 26, code: "HS26", full_name: "Gia Phát", order_num: 26, class_name: "Lớp 3A7" },
  { id: 27, code: "HS27", full_name: "Minh Tân", order_num: 27, class_name: "Lớp 3A7" },
  { id: 28, code: "HS28", full_name: "Minh Thư", order_num: 28, class_name: "Lớp 3A7" },
  { id: 29, code: "HS29", full_name: "Tấn Tài", order_num: 29, class_name: "Lớp 3A7" }
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
    description: "Viết bài chính tả trang 45 và hoàn thành 3 bài tập từ ngữ về mùa thu.",
    assigned_date: "2026-09-18",
    due_date: "2026-09-20 17:00:00",
    max_score: 10.0,
    created_at: "2026-09-18 08:00:00"
  },
  {
    id: 2,
    title: "Toán: Bảng nhân 7 và bài toán giải bằng hai phép tính",
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

  getStudents() {
    try {
      return JSON.parse(localStorage.getItem("lms_students")) || DEFAULT_STUDENTS_3A7;
    } catch {
      return DEFAULT_STUDENTS_3A7;
    }
  }

  getAssignments() {
    try {
      return JSON.parse(localStorage.getItem("lms_assignments")) || DEFAULT_ASSIGNMENTS;
    } catch {
      return DEFAULT_ASSIGNMENTS;
    }
  }

  createAssignment(title, description, assignedDate, dueDate, maxScore = 10) {
    const list = this.getAssignments();
    const newId = list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1;
    const item = {
      id: newId,
      title: title.trim(),
      description: description ? description.trim() : "",
      assigned_date: assignedDate,
      due_date: dueDate.length <= 10 ? `${dueDate} 23:59:59` : dueDate,
      max_score: parseFloat(maxScore) || 10,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19)
    };
    list.unshift(item);
    localStorage.setItem("lms_assignments", JSON.stringify(list));
    return item;
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

  // Format timestamp helper
  nowStr() {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  // Record student submission
  recordSubmission(studentCode, assignmentId, operator = "Học sinh") {
    const students = this.getStudents();
    const st = students.find(s => s.code.toUpperCase() === studentCode.trim().toUpperCase());
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
      status: status,
      score: null,
      score_change_delta: null,
      is_late: isLate,
      teacher_note: null,
      operator: operator,
      timestamp: timestamp
    };
    events.push(newEvent);
    this.saveEvents(events);

    // Sync to Google Sheet if configured
    this.asyncSyncSheet({
      action: "SUBMIT",
      student_code: st.code,
      student_name: st.full_name,
      assignment_title: asg.title,
      attempt_number: attemptNumber,
      status: status,
      is_late: isLate,
      timestamp: timestamp,
      operator: operator
    });

    return {
      success: true,
      student: st,
      assignment: asg,
      attempt_number: attemptNumber,
      status: status,
      is_late: isLate,
      timestamp: timestamp
    };
  }

  // Record teacher grading
  recordGrading(studentId, assignmentId, score, status, teacherNote, operator = "Cô Linh") {
    const students = this.getStudents();
    const st = students.find(s => s.id == studentId);
    if (!st) return { error: "Không tìm thấy học sinh!" };

    const assignments = this.getAssignments();
    const asg = assignments.find(a => a.id == assignmentId);
    if (!asg) return { error: "Không tìm thấy bài tập!" };

    const events = this.getEvents();
    const pastGrades = events.filter(e => e.student_id == studentId && e.assignment_id == assignmentId && e.event_type.startsWith("GRADE_"));
    const lastGrade = pastGrades.length > 0 ? pastGrades[pastGrades.length - 1] : null;

    const attemptNumber = pastGrades.length + 1;
    const prevScore = lastGrade && lastGrade.score !== null ? lastGrade.score : null;
    const scoreVal = score !== null && score !== "" ? parseFloat(score) : null;
    const delta = prevScore !== null && scoreVal !== null ? Math.round((scoreVal - prevScore) * 10) / 10 : null;
    const timestamp = this.nowStr();

    const newEvent = {
      id: Date.now(),
      student_id: st.id,
      assignment_id: asg.id,
      event_type: `GRADE_ATTEMPT_${attemptNumber}`,
      attempt_number: attemptNumber,
      status: status,
      score: scoreVal,
      score_change_delta: delta,
      is_late: false,
      teacher_note: teacherNote ? teacherNote.trim() : null,
      operator: operator,
      timestamp: timestamp
    };
    events.push(newEvent);
    this.saveEvents(events);

    // Sync to Google Sheet
    this.asyncSyncSheet({
      action: "GRADE",
      student_code: st.code,
      student_name: st.full_name,
      assignment_title: asg.title,
      attempt_number: attemptNumber,
      score: scoreVal,
      score_change_delta: delta,
      status: status,
      teacher_note: teacherNote,
      timestamp: timestamp,
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

  // 11-column Tracking Matrix
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
      const retryCount = submitCount > 1 ? submitCount - 1 : 0;
      const isLate = submits.length > 0 ? submits[0].is_late : false;
      const firstSubmitTime = submits.length > 0 ? submits[0].timestamp : null;
      const latestSubmitTime = submits.length > 0 ? submits[submits.length - 1].timestamp : null;

      let status = "Chưa nộp";
      let latestScore = null;
      let teacherNote = null;
      let delta = null;

      if (grades.length > 0) {
        const lastGrade = grades[grades.length - 1];
        status = lastGrade.status;
        latestScore = lastGrade.score;
        teacherNote = lastGrade.teacher_note;
        delta = lastGrade.score_change_delta;
      } else if (submits.length > 0) {
        status = submits[submits.length - 1].status;
      }

      return {
        order_num: st.order_num || (idx + 1),
        student_id: st.id,
        code: st.code,
        full_name: st.full_name,
        submit_count: submitCount,
        is_late: isLate,
        first_submit_time: firstSubmitTime,
        latest_submit_time: latestSubmitTime,
        status: status,
        latest_score: latestScore,
        retry_count: retryCount,
        teacher_note: teacherNote,
        score_change_delta: delta
      };
    });

    const totalStudents = students.length;
    const submittedCount = rows.filter(r => r.submit_count > 0).length;
    const gradedCount = rows.filter(r => r.latest_score !== null).length;
    const passedCount = rows.filter(r => r.status === "Đã đạt").length;
    const needFixCount = rows.filter(r => r.status === "Cần sửa").length;
    const needResubmitCount = rows.filter(r => r.status === "Cần nộp lại").length;
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

  // 3-Way Analytics
  getAnalytics() {
    const students = this.getStudents();
    const assignments = this.getAssignments();
    const allEvents = this.getEvents();

    // Assignment Stats
    const asgStats = assignments.map(a => {
      const matrix = this.getTrackingMatrix(a.id);
      return {
        id: a.id,
        title: a.title,
        assigned_date: a.assigned_date,
        due_date: a.due_date,
        summary: matrix ? matrix.summary : {}
      };
    });

    // Student Stats
    const studentStats = students.map(st => {
      const stEvents = allEvents.filter(e => e.student_id === st.id);
      const grades = stEvents.filter(e => e.event_type.startsWith("GRADE_") && e.score !== null);
      const submits = stEvents.filter(e => e.event_type.startsWith("SUBMIT_"));
      const avgScore = grades.length > 0 ? Math.round((grades.reduce((a, b) => a + b.score, 0) / grades.length) * 10) / 10 : null;
      return {
        id: st.id,
        code: st.code,
        full_name: st.full_name,
        order_num: st.order_num,
        total_submissions: submits.length,
        graded_count: grades.length,
        avg_score: avgScore
      };
    });

    // Whole Class Summary
    const totalAssignments = assignments.length;
    const totalExpectedSubmissions = students.length * totalAssignments;
    const totalActualSubmissions = asgStats.reduce((acc, a) => acc + (a.summary.submitted_count || 0), 0);
    const completionRate = totalExpectedSubmissions > 0 ? Math.round((totalActualSubmissions / totalExpectedSubmissions) * 1000) / 10 : 0;

    return {
      whole_class: {
        total_students: students.length,
        total_assignments: totalAssignments,
        total_submissions: totalActualSubmissions,
        class_completion_rate: completionRate
      },
      assignment_stats: asgStats,
      student_stats: studentStats
    };
  }

  // Student Profile
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

      return {
        assignment_id: asg.id,
        assignment_title: asg.title,
        due_date: asg.due_date,
        submit_count: submits.length,
        latest_status: lastGrade ? lastGrade.status : (submits.length > 0 ? submits[submits.length - 1].status : "Chưa nộp"),
        latest_score: lastGrade ? lastGrade.score : null,
        teacher_note: lastGrade ? lastGrade.teacher_note : null,
        score_change_delta: lastGrade ? lastGrade.score_change_delta : null,
        is_late: submits.length > 0 ? submits[0].is_late : false,
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

  // Submission History
  getSubmissionHistory(studentId, assignmentId) {
    const events = this.getEvents().filter(e => e.student_id == studentId && e.assignment_id == assignmentId);
    return events;
  }

  // Async Google Sheet sync
  asyncSyncSheet(payload) {
    const settings = this.getSettings();
    const sheetUrl = (settings.google_sheet_url || "").trim();
    if (!sheetUrl || settings.auto_sync_sheets !== "true") return;

    try {
      fetch(sheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(err => console.warn("[GoogleSheet Sync Warn]:", err));
    } catch (e) {
      console.warn("[GoogleSheet Sync Error]:", e);
    }
  }
}

window.ClientDB = new ClientDBEngine();
