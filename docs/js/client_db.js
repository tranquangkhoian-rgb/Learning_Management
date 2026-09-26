/**
 * ClientDB - Pure Client-Side Database & Business Engine for LMS Cô Linh
 * Enables 100% offline & GitHub Pages static hosting with zero backend server.
 * Uses localStorage for persistent storage and direct Google Sheets webhook sync.
 */

const DEFAULT_STUDENTS_3A7 = [
  { id: 1, code: "HS01", full_name: "Vỹ An", gender: "Nữ", order_num: 1, class_name: "Lớp 3A7" },
  { id: 2, code: "HS02", full_name: "Tuệ An", gender: "Nữ", order_num: 2, class_name: "Lớp 3A7" },
  { id: 3, code: "HS03", full_name: "Lam Anh", gender: "Nữ", order_num: 3, class_name: "Lớp 3A7" },
  { id: 4, code: "HS04", full_name: "Minh Anh", gender: "Nữ", order_num: 4, class_name: "Lớp 3A7" },
  { id: 5, code: "HS05", full_name: "Hoàng Ân", gender: "Nam", order_num: 5, class_name: "Lớp 3A7" },
  { id: 6, code: "HS06", full_name: "Gia Bảo", gender: "Nam", order_num: 6, class_name: "Lớp 3A7" },
  { id: 7, code: "HS07", full_name: "Lan Chi", gender: "Nữ", order_num: 7, class_name: "Lớp 3A7" },
  { id: 8, code: "HS08", full_name: "Thiên Di", gender: "Nữ", order_num: 8, class_name: "Lớp 3A7" },
  { id: 9, code: "HS09", full_name: "Hải Đăng", gender: "Nam", order_num: 9, class_name: "Lớp 3A7" },
  { id: 10, code: "HS10", full_name: "Minh Hoàng", gender: "Nam", order_num: 10, class_name: "Lớp 3A7" },
  { id: 11, code: "HS11", full_name: "Phúc Hưng", gender: "Nam", order_num: 11, class_name: "Lớp 3A7" },
  { id: 12, code: "HS12", full_name: "Gia Hào", gender: "Nam", order_num: 12, class_name: "Lớp 3A7" },
  { id: 13, code: "HS13", full_name: "An Khang", gender: "Nam", order_num: 13, class_name: "Lớp 3A7" },
  { id: 14, code: "HS14", full_name: "Đăng Khang", gender: "Nam", order_num: 14, class_name: "Lớp 3A7" },
  { id: 15, code: "HS15", full_name: "Chí Khôi", gender: "Nam", order_num: 15, class_name: "Lớp 3A7" },
  { id: 16, code: "HS16", full_name: "Phương Lâm", gender: "Nữ", order_num: 16, class_name: "Lớp 3A7" },
  { id: 17, code: "HS17", full_name: "Phúc Lâm", gender: "Nam", order_num: 17, class_name: "Lớp 3A7" },
  { id: 18, code: "HS18", full_name: "Tuệ Linh", gender: "Nữ", order_num: 18, class_name: "Lớp 3A7" },
  { id: 19, code: "HS19", full_name: "Hà Linh", gender: "Nữ", order_num: 19, class_name: "Lớp 3A7" },
  { id: 20, code: "HS20", full_name: "Hà My", gender: "Nữ", order_num: 20, class_name: "Lớp 3A7" },
  { id: 21, code: "HS21", full_name: "Thiện Nhân", gender: "Nam", order_num: 21, class_name: "Lớp 3A7" },
  { id: 22, code: "HS22", full_name: "Mộc Nhi", gender: "Nữ", order_num: 22, class_name: "Lớp 3A7" },
  { id: 23, code: "HS23", full_name: "Hạ Nhiên", gender: "Nữ", order_num: 23, class_name: "Lớp 3A7" },
  { id: 24, code: "HS24", full_name: "Thanh Phương", gender: "Nữ", order_num: 24, class_name: "Lớp 3A7" },
  { id: 25, code: "HS25", full_name: "Minh Phương", gender: "Nữ", order_num: 25, class_name: "Lớp 3A7" },
  { id: 26, code: "HS26", full_name: "Gia Phát", gender: "Nam", order_num: 26, class_name: "Lớp 3A7" },
  { id: 27, code: "HS27", full_name: "Minh Tân", gender: "Nam", order_num: 27, class_name: "Lớp 3A7" },
  { id: 28, code: "HS28", full_name: "Minh Thư", gender: "Nữ", order_num: 28, class_name: "Lớp 3A7" },
  { id: 29, code: "HS29", full_name: "Tấn Tài", gender: "Nam", order_num: 29, class_name: "Lớp 3A7" }
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

  // --- Student CRUD ---
  getStudents() {
    try {
      const raw = JSON.parse(localStorage.getItem("lms_students"));
      const list = (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_STUDENTS_3A7;
      return list.map((s, idx) => {
        if (!s.order_num) s.order_num = idx + 1;
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
      class_name: this.getSettings().class_name || "Lớp 3A7"
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
      event: newEvent
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
