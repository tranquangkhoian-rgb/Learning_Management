/**
 * Application Logic for LMS - Cô Linh
 * Quản lý Nộp bài & Điểm số bằng QR Code (Lớp 30 học sinh)
 */

class LMSApp {
  constructor() {
    this.students = [];
    this.assignments = [];
    this.currentAssignmentId = null;
    this.settings = {};
    this.isTeacherLocked = false;
    this.kioskScanner = null;
    this.gradeScanner = null;
    this.activeTrackingFilter = "ALL";
    this.trackingMatrix = [];
    this.currentlyGradingStudent = null;
    this.selectedGradeStatus = "Đã đạt";
    this.cameraFacing = "environment";
  }

  async init() {
    console.log("Initializing LMS App...");
    await this.loadSettings();
    await this.loadStudents();
    await this.loadAssignments();

    // Render A4 Printable Sheet of 30 QR cards
    this.renderA4PrintSheet();

    // Init UI dropdowns and listeners
    this.populateDropdowns();

    // Load initial views
    if (this.assignments.length > 0) {
      this.currentAssignmentId = this.assignments[0].id;
      this.loadTrackingMatrix();
    }
    this.loadAnalytics();
    this.loadStudentProfile();

    // Keyboard listener for barcode scanner gun (e.g. USB/Bluetooth scanner typing "HS01" + Enter)
    this.initBarcodeGunListener();
  }

  // --- Settings & APIs ---
  async loadSettings() {
    try {
      const res = await fetch("/api/settings");
      this.settings = await res.json();
      document.getElementById("header-class-title").innerText = `${this.settings.class_name || "Lớp 3A7"} • ${this.settings.teacher_name || "Cô Linh"}`;
      document.getElementById("header-school-name").innerText = `${this.settings.school_name || "Trường Tiểu Học Ánh Dương"} • Hệ Thống Nộp Bài & Điểm Số`;
      document.getElementById("print-sheet-class").innerText = `${(this.settings.class_name || "LỚP 3A7").toUpperCase()} • GVCN: ${(this.settings.teacher_name || "CÔ LINH").toUpperCase()}`;
      
      // Populate settings form
      document.getElementById("setting-sheet-url").value = this.settings.google_sheet_url || "";
      document.getElementById("setting-class-name").value = this.settings.class_name || "Lớp 3A7";
      document.getElementById("setting-teacher-name").value = this.settings.teacher_name || "Cô Linh";
      document.getElementById("setting-school-name").value = this.settings.school_name || "Trường Tiểu Học Ánh Dương";
      document.getElementById("setting-teacher-pin").value = this.settings.teacher_pin || "1234";
    } catch (e) {
      console.error("Error loading settings", e);
    }
  }

  async saveSettings() {
    const payload = {
      google_sheet_url: document.getElementById("setting-sheet-url").value.trim(),
      class_name: document.getElementById("setting-class-name").value.trim(),
      teacher_name: document.getElementById("setting-teacher-name").value.trim(),
      school_name: document.getElementById("setting-school-name").value.trim(),
      teacher_pin: document.getElementById("setting-teacher-pin").value.trim()
    };
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      this.settings = await res.json();
      alert("✅ Đã lưu cài đặt thành công!");
      await this.loadSettings();
    } catch (e) {
      alert("Lỗi khi lưu cài đặt: " + e.message);
    }
  }

  async testGoogleSheetConnection() {
    const url = document.getElementById("setting-sheet-url").value.trim();
    const resultBox = document.getElementById("sheet-test-result");
    if (!url) {
      alert("Vui lòng nhập đường dẫn Google Sheets Web App trước!");
      return;
    }
    resultBox.innerHTML = "<span style='color: var(--primary);'>⏳ Đang gửi dữ liệu kiểm tra...</span>";
    try {
      const res = await fetch("/api/test-google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        resultBox.innerHTML = "<span style='color: var(--status-green); font-weight: 700;'>✅ Kết nối thành công! Đã gửi dòng dữ liệu kiểm tra lên Google Sheet.</span>";
      } else {
        resultBox.innerHTML = `<span style='color: var(--status-red); font-weight: 700;'>❌ Kết nối thất bại: ${data.error}</span>`;
      }
    } catch (e) {
      resultBox.innerHTML = `<span style='color: var(--status-red); font-weight: 700;'>❌ Lỗi: ${e.message}</span>`;
    }
  }

  // --- Students & Assignments ---
  async loadStudents() {
    try {
      const res = await fetch("/api/students");
      this.students = await res.json();
      document.getElementById("stat-total-students").innerText = this.students.length;
      this.renderQuickStudentButtons();
    } catch (e) {
      console.error("Error loading students", e);
    }
  }

  async loadAssignments() {
    try {
      const res = await fetch("/api/assignments");
      this.assignments = await res.json();
      document.getElementById("stat-total-assignments").innerText = this.assignments.length;
      this.populateDropdowns();
    } catch (e) {
      console.error("Error loading assignments", e);
    }
  }

  populateDropdowns() {
    const kioskSelect = document.getElementById("kiosk-assignment-select");
    const gradeSelect = document.getElementById("grade-assignment-select");
    const trackingSelect = document.getElementById("tracking-assignment-select");
    const profileSelect = document.getElementById("profile-student-select");

    const asgOptions = this.assignments.map(a => 
      `<option value="${a.id}">[${a.subject}] ${a.title} (Hạn: ${a.due_date})</option>`
    ).join("");

    kioskSelect.innerHTML = asgOptions;
    gradeSelect.innerHTML = asgOptions;
    trackingSelect.innerHTML = asgOptions;

    if (this.currentAssignmentId) {
      kioskSelect.value = this.currentAssignmentId;
      gradeSelect.value = this.currentAssignmentId;
      trackingSelect.value = this.currentAssignmentId;
    }

    this.updateKioskDueHint();

    profileSelect.innerHTML = this.students.map(s => 
      `<option value="${s.id}">${s.order_num}. ${s.full_name} (${s.code})</option>`
    ).join("");
  }

  updateKioskDueHint() {
    const aid = document.getElementById("kiosk-assignment-select").value;
    const asg = this.assignments.find(a => a.id == aid);
    const hint = document.getElementById("kiosk-due-hint");
    if (asg) {
      const now = new Date();
      const due = new Date(asg.due_date.replace(" ", "T"));
      const isPast = now > due;
      hint.innerHTML = `⏰ Hạn nộp: <strong>${asg.due_date}</strong> ${isPast ? '<span class="badge badge-orange">Đã quá hạn (Nộp trễ)</span>' : '<span class="badge badge-green">Đang trong hạn nộp</span>'}`;
    } else {
      hint.innerHTML = "";
    }
  }

  onKioskAssignmentChange() {
    this.currentAssignmentId = document.getElementById("kiosk-assignment-select").value;
    this.updateKioskDueHint();
  }

  onGradeAssignmentChange() {
    this.currentAssignmentId = document.getElementById("grade-assignment-select").value;
    if (this.currentlyGradingStudent) {
      this.openGradingForStudent(this.currentlyGradingStudent);
    }
  }

  // --- Tab Navigation & Kiosk Lockdown ---
  switchTab(paneId) {
    if (this.isTeacherLocked && paneId !== "pane-kiosk") {
      this.openPinModal(() => this.switchTab(paneId));
      return;
    }

    // Deactivate cameras when leaving tab
    if (paneId !== "pane-kiosk" && this.kioskScanner) {
      this.kioskScanner.stop();
    }
    if (paneId !== "pane-grade" && this.gradeScanner) {
      this.gradeScanner.stop();
    }

    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

    const target = document.getElementById(paneId);
    if (target) target.classList.add("active");

    const tabBtn = Array.from(document.querySelectorAll(".nav-tab")).find(b => b.getAttribute("onclick").includes(paneId));
    if (tabBtn) tabBtn.classList.add("active");

    if (paneId === "pane-kiosk") {
      this.startKioskCamera();
    } else if (paneId === "pane-grade") {
      this.startGradeCamera();
    } else if (paneId === "pane-tracking") {
      this.loadTrackingMatrix();
    } else if (paneId === "pane-analytics") {
      this.loadAnalytics();
    } else if (paneId === "pane-students") {
      this.loadStudentProfile();
    }
  }

  enterKioskMode() {
    this.isTeacherLocked = true;
    document.getElementById("teacher-nav").style.display = "none";
    document.getElementById("btn-switch-kiosk").style.display = "none";
    document.getElementById("btn-lock-mode").innerText = "🔒 Mở Khóa Giáo Viên";
    this.switchTab("pane-kiosk");
  }

  toggleLock() {
    if (this.isTeacherLocked) {
      this.openPinModal(() => {
        this.isTeacherLocked = false;
        document.getElementById("teacher-nav").style.display = "block";
        document.getElementById("btn-switch-kiosk").style.display = "inline-flex";
        document.getElementById("btn-lock-mode").innerText = "🔒 Khóa Kiosk";
      });
    } else {
      this.enterKioskMode();
    }
  }

  openPinModal(callback) {
    this.pinCallback = callback;
    document.getElementById("pin-modal").style.display = "flex";
    document.getElementById("pin-input").value = "";
    document.getElementById("pin-error").style.display = "none";
    setTimeout(() => document.getElementById("pin-input").focus(), 100);
  }

  closePinModal() {
    document.getElementById("pin-modal").style.display = "none";
    this.pinCallback = null;
  }

  verifyPin() {
    const input = document.getElementById("pin-input").value.trim();
    const correctPin = this.settings.teacher_pin || "1234";
    if (input === correctPin) {
      const cb = this.pinCallback;
      this.closePinModal();
      if (cb) cb();
    } else {
      document.getElementById("pin-error").style.display = "block";
      document.getElementById("pin-input").value = "";
      document.getElementById("pin-input").focus();
    }
  }

  // --- KIOSK SUBMISSION ENGINE ---
  async startKioskCamera() {
    const video = document.getElementById("kiosk-video");
    if (!this.kioskScanner) {
      this.kioskScanner = new QRCameraScanner(video, (code) => this.handleKioskScan(code), {
        facingMode: this.cameraFacing
      });
    }
    try {
      await this.kioskScanner.start();
    } catch (e) {
      console.warn("Could not start kiosk camera:", e);
    }
  }

  switchCameraFacing() {
    this.cameraFacing = this.cameraFacing === "environment" ? "user" : "environment";
    if (this.kioskScanner) {
      this.kioskScanner.stop();
      this.kioskScanner = null;
      this.startKioskCamera();
    }
  }

  toggleKioskQuickPicker() {
    const picker = document.getElementById("kiosk-quick-picker");
    picker.style.display = picker.style.display === "none" ? "block" : "none";
  }

  renderQuickStudentButtons() {
    const kioskBox = document.getElementById("kiosk-student-buttons");
    const gradeBox = document.getElementById("grade-student-list");

    const html = this.students.map(s => `
      <button class="quick-student-btn" onclick="app.handleKioskScan('${s.code}')">
        <strong>${s.order_num}.</strong> ${s.full_name}
      </button>
    `).join("");

    kioskBox.innerHTML = html;

    const gradeHtml = this.students.map(s => `
      <button class="quick-student-btn" onclick="app.openGradingForStudentById(${s.id})">
        <strong>${s.order_num}.</strong> ${s.full_name} (${s.code})
      </button>
    `).join("");

    gradeBox.innerHTML = gradeHtml;
  }

  async handleKioskScan(code) {
    const asgId = document.getElementById("kiosk-assignment-select").value;
    if (!asgId) {
      alert("Vui lòng chọn bài tập trước khi nộp!");
      return;
    }

    try {
      const res = await fetch("/api/scan-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_code: code,
          assignment_id: asgId,
          operator: "Học sinh"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (this.kioskScanner) this.kioskScanner.playErrorBeep();
        alert(data.error || "Mã QR không hợp lệ!");
        return;
      }

      // Success! Play sound & Show Celebration Modal
      if (this.kioskScanner) this.kioskScanner.playSuccessBeep();
      this.showCelebrationModal(data);

      // Refresh tracking matrix in background
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi kết nối máy chủ: " + e.message);
    }
  }

  showCelebrationModal(data) {
    const modal = document.getElementById("kiosk-celebrate-modal");
    const nameEl = document.getElementById("kiosk-celebrate-name");
    const detailEl = document.getElementById("kiosk-celebrate-detail");
    const attemptEl = document.getElementById("kiosk-celebrate-attempt");
    const deadlineEl = document.getElementById("kiosk-celebrate-deadline");
    const countEl = document.getElementById("kiosk-countdown");

    nameEl.innerText = `${data.student.order_num}. ${data.student.full_name}`;
    detailEl.innerText = data.attempt_number > 1 
      ? `Đã ghi nhận Nộp Lại bài tập "${data.assignment.title}"!`
      : `Đã ghi nhận nộp bài tập "${data.assignment.title}" thành công!`;

    attemptEl.innerText = `Lần nộp: ${data.attempt_number}`;
    attemptEl.className = data.attempt_number > 1 ? "badge badge-blue" : "badge badge-green";

    if (data.is_late) {
      deadlineEl.innerText = "⏰ Nộp trễ hạn";
      deadlineEl.className = "badge badge-orange";
    } else {
      deadlineEl.innerText = "⭐ Đúng hạn";
      deadlineEl.className = "badge badge-green";
    }

    modal.style.display = "flex";

    // Auto close countdown
    let secondsLeft = 2;
    countEl.innerText = secondsLeft;
    const interval = setInterval(() => {
      secondsLeft--;
      countEl.innerText = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        modal.style.display = "none";
      }
    }, 1000);
  }

  // --- FAST GRADING ENGINE (MỤC 4 & 5) ---
  async startGradeCamera() {
    const video = document.getElementById("grade-video");
    if (!this.gradeScanner) {
      this.gradeScanner = new QRCameraScanner(video, (code) => this.handleGradeScan(code), {
        facingMode: "environment"
      });
    }
    try {
      await this.gradeScanner.start();
    } catch (e) {
      console.warn("Could not start grade camera:", e);
    }
  }

  stopGradeCamera() {
    if (this.gradeScanner) {
      this.gradeScanner.stop();
      this.gradeScanner = null;
    }
  }

  handleGradeScan(code) {
    const st = this.students.find(s => s.code.toUpperCase() === code.trim().toUpperCase());
    if (!st) {
      if (this.gradeScanner) this.gradeScanner.playErrorBeep();
      alert(`Không tìm thấy học sinh với mã "${code}"!`);
      return;
    }
    if (this.gradeScanner) this.gradeScanner.playSuccessBeep();
    this.openGradingForStudent(st);
  }

  openGradingForStudentById(studentId) {
    const st = this.students.find(s => s.id == studentId);
    if (st) this.openGradingForStudent(st);
  }

  async openGradingForStudent(st) {
    this.currentlyGradingStudent = st;
    const asgId = document.getElementById("grade-assignment-select").value;

    document.getElementById("grade-placeholder").style.display = "none";
    document.getElementById("grade-input-box").style.display = "block";

    document.getElementById("grade-st-name").innerText = `${st.order_num}. ${st.full_name}`;
    document.getElementById("grade-st-info").innerText = `Mã: ${st.code} • Lớp: ${st.class_name}`;

    // Reset inputs
    document.getElementById("grade-score-input").value = "";
    document.getElementById("grade-note-input").value = "";
    this.selectGradeStatus(document.querySelector(".grade-status-option[data-status='Đã đạt']"), "Đã đạt");

    // Fetch previous history
    try {
      const res = await fetch(`/api/history?student_id=${st.id}&assignment_id=${asgId}`);
      const history = await res.json();
      const historyBox = document.getElementById("grade-prev-history");
      const historyContent = document.getElementById("grade-prev-history-content");

      if (history.length > 0) {
        historyBox.style.display = "block";
        historyContent.innerHTML = history.map(ev => {
          if (ev.event_type === "submit" || ev.event_type === "resubmit") {
            return `<div>📥 <strong>Lần ${ev.attempt_number} nộp:</strong> ${ev.timestamp} (${ev.is_late ? "Trễ hạn" : "Đúng hạn"})</div>`;
          } else {
            return `<div>✏️ <strong>Lần ${ev.attempt_number} chấm:</strong> Điểm: ${ev.score ?? "-"} | Trạng thái: ${ev.status} | Nhận xét: "${ev.teacher_note || "Không"}"</div>`;
          }
        }).join("");

        const latestSubmit = [...history].reverse().find(e => e.event_type.includes("submit"));
        const attemptNum = latestSubmit ? latestSubmit.attempt_number : 1;
        document.getElementById("grade-attempt-badge").innerText = `Lần nộp: ${attemptNum}`;
      } else {
        historyBox.style.display = "none";
        document.getElementById("grade-attempt-badge").innerText = "Chưa có lượt quét nộp";
      }
    } catch (e) {
      console.warn(e);
    }

    document.getElementById("grade-score-input").focus();
  }

  setQuickScore(val) {
    document.getElementById("grade-score-input").value = val;
    if (val >= 8) {
      this.selectGradeStatus(document.querySelector(".grade-status-option[data-status='Đã đạt']"), "Đã đạt");
    } else if (val >= 5) {
      this.selectGradeStatus(document.querySelector(".grade-status-option[data-status='Cần sửa']"), "Cần sửa");
    } else {
      this.selectGradeStatus(document.querySelector(".grade-status-option[data-status='Cần nộp lại']"), "Cần nộp lại");
    }
  }

  selectGradeStatus(el, status) {
    this.selectedGradeStatus = status;
    document.querySelectorAll(".grade-status-option").forEach(opt => opt.classList.remove("selected"));
    if (el) el.classList.add("selected");
  }

  addQuickNote(note) {
    const input = document.getElementById("grade-note-input");
    if (input.value) {
      input.value += " " + note;
    } else {
      input.value = note;
    }
  }

  cancelGrading() {
    this.currentlyGradingStudent = null;
    document.getElementById("grade-input-box").style.display = "none";
    document.getElementById("grade-placeholder").style.display = "block";
  }

  async submitGrading() {
    if (!this.currentlyGradingStudent) return;
    const asgId = document.getElementById("grade-assignment-select").value;
    const score = document.getElementById("grade-score-input").value;
    const status = this.selectedGradeStatus;
    const note = document.getElementById("grade-note-input").value;

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: this.currentlyGradingStudent.id,
          assignment_id: asgId,
          score: score,
          status: status,
          teacher_note: note,
          operator: this.settings.teacher_name || "Cô Linh"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Lỗi khi lưu điểm!");
        return;
      }

      alert(`✅ Đã lưu điểm cho học sinh ${this.currentlyGradingStudent.full_name} (${status})!`);
      this.cancelGrading();
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi khi kết nối: " + e.message);
    }
  }

  // --- SECTION 6: TRACKING MATRIX TABLE ---
  async loadTrackingMatrix() {
    const asgId = document.getElementById("tracking-assignment-select").value;
    if (!asgId) return;

    try {
      const res = await fetch(`/api/tracking/${asgId}`);
      const data = await res.json();
      this.trackingMatrix = data.matrix || [];
      this.filterTrackingTable();
    } catch (e) {
      console.error("Error loading tracking matrix", e);
    }
  }

  setTrackingFilter(filter, el) {
    this.activeTrackingFilter = filter;
    document.querySelectorAll("#tracking-filter-bar .filter-pill").forEach(p => p.classList.remove("active"));
    if (el) el.classList.add("active");
    this.filterTrackingTable();
  }

  filterTrackingTable() {
    const search = document.getElementById("tracking-search-input").value.toLowerCase().trim();
    const tbody = document.getElementById("tracking-table-body");

    const filtered = this.trackingMatrix.filter(row => {
      // Search filter
      const matchSearch = row.full_name.toLowerCase().includes(search) || row.code.toLowerCase().includes(search);
      if (!matchSearch) return false;

      // Status Filter
      if (this.activeTrackingFilter === "ALL") return true;
      if (this.activeTrackingFilter === "CHUA_NOP") return row.submit_count === 0;
      if (this.activeTrackingFilter === "DUNG_HAN") return row.submit_count > 0 && !row.is_late && row.current_status !== "Nộp trễ";
      if (this.activeTrackingFilter === "NOP_TRE") return row.is_late || row.current_status === "Nộp trễ";
      if (this.activeTrackingFilter === "CAN_SUA") return row.current_status.includes("sửa");
      if (this.activeTrackingFilter === "DA_NOP_LAI") return row.submit_count > 1;
      if (this.activeTrackingFilter === "HOAN_THANH") return row.current_status === "Đã hoàn thành";
      return true;
    });

    tbody.innerHTML = filtered.map(row => {
      const statusBadge = `<span class="badge badge-${row.color_group}">${row.current_status}</span>`;
      const deadlineBadge = row.submit_count === 0 ? "-" : (row.is_late ? '<span class="badge badge-orange">Trễ hạn</span>' : '<span class="badge badge-green">Đúng hạn</span>');
      
      const firstScoreStr = row.first_score !== null ? `<span class="score-pill score-high">${row.first_score}</span>` : "-";
      const latestScoreStr = row.latest_score !== null ? `<span class="score-pill score-high">${row.latest_score}</span>` : "-";

      return `
        <tr>
          <td><strong>${row.stt}</strong></td>
          <td><code>${row.code}</code></td>
          <td><strong>${row.full_name}</strong></td>
          <td>${statusBadge}</td>
          <td>${row.latest_submit_time ? row.latest_submit_time.split(" ")[1] : "-"}</td>
          <td>${deadlineBadge}</td>
          <td style="text-align: center;"><strong>${row.submit_count}</strong></td>
          <td style="text-align: center; color: ${row.retry_count > 0 ? '#B45309' : 'inherit'};"><strong>${row.retry_count}</strong></td>
          <td style="text-align: center;">${firstScoreStr}</td>
          <td style="text-align: center;">${latestScoreStr}</td>
          <td style="font-size: 12px; max-width: 180px;">${row.teacher_note || '<span style="color:var(--text-muted);">-</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.viewStudentHistory(${row.student_id}, '${row.full_name}')">
              📜 Xem
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async viewStudentHistory(studentId, studentName) {
    const asgId = document.getElementById("tracking-assignment-select").value;
    try {
      const res = await fetch(`/api/history?student_id=${studentId}&assignment_id=${asgId}`);
      const history = await res.json();

      const modal = document.getElementById("history-modal");
      document.getElementById("history-modal-title").innerText = `Lịch Sử Nộp & Chấm: ${studentName}`;
      const content = document.getElementById("history-modal-content");

      if (history.length === 0) {
        content.innerHTML = "<p style='color: var(--text-muted); text-align: center; padding: 20px;'>Chưa có dữ liệu nộp hoặc chấm bài nào.</p>";
      } else {
        content.innerHTML = `
          <div class="timeline">
            ${history.map(ev => {
              const isSubmit = ev.event_type.includes("submit");
              return `
                <div class="timeline-item">
                  <div class="timeline-dot" style="background: ${isSubmit ? 'var(--primary)' : 'var(--status-green)'};"></div>
                  <div class="timeline-content">
                    <div class="timeline-time">${ev.timestamp} • Thao tác bởi: <strong>${ev.operator}</strong></div>
                    <div style="font-weight: 700; margin-bottom: 2px;">
                      ${isSubmit ? `📥 Nộp bài (Lần ${ev.attempt_number}) - ${ev.is_late ? '<span style="color:var(--status-orange);">Trễ hạn</span>' : '<span style="color:var(--status-green);">Đúng hạn</span>'}` : `✏️ Giáo viên chấm điểm (Lần ${ev.attempt_number})`}
                    </div>
                    ${ev.score !== null ? `<div>Điểm: <strong style="color:var(--primary); font-size:15px;">${ev.score}</strong> | Trạng thái: <strong>${ev.status}</strong></div>` : `<div>Trạng thái: <strong>${ev.status}</strong></div>`}
                    ${ev.teacher_note ? `<div style="font-style: italic; margin-top: 4px; color:#475569;">Nhận xét: "${ev.teacher_note}"</div>` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }
      modal.style.display = "flex";
    } catch (e) {
      alert("Lỗi khi tải lịch sử: " + e.message);
    }
  }

  closeHistoryModal() {
    document.getElementById("history-modal").style.display = "none";
  }

  exportCurrentAssignmentCSV() {
    const asgId = document.getElementById("tracking-assignment-select").value;
    if (!asgId) return;
    window.location.href = `/api/export-csv?assignment_id=${asgId}`;
  }

  // --- SECTION 7: 3-WAY ANALYTICS ---
  async loadAnalytics() {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      const whole = data.whole_class;

      document.getElementById("stat-completion-rate").innerText = `${whole.class_completion_rate}%`;

      // Top Lists
      const formatTopList = (list, valKey, label) => {
        if (!list || list.length === 0) return "<li style='color:var(--text-muted);'>Chưa có dữ liệu</li>";
        return list.slice(0, 5).map(s => `
          <li>
            <span><strong>${s.code}</strong> - ${s.full_name}</span>
            <span style="font-weight: 700;">${s[valKey]} ${label}</span>
          </li>
        `).join("");
      };

      document.getElementById("analytics-top-on-time").innerHTML = formatTopList(whole.top_on_time, "on_time_count", "bài đúng hạn");
      document.getElementById("analytics-top-missing").innerHTML = formatTopList(whole.top_missing, "num_missing", "bài chưa nộp");
      document.getElementById("analytics-top-late").innerHTML = formatTopList(whole.top_late, "late_count", "lần nộp trễ");
      document.getElementById("analytics-top-improved").innerHTML = formatTopList(whole.top_improved, "improved_count", "bài tiến bộ");

      // Table 1: By Student
      const studentTbody = document.getElementById("analytics-student-tbody");
      studentTbody.innerHTML = data.student_stats.map(s => `
        <tr>
          <td><code>${s.code}</code></td>
          <td><strong>${s.full_name}</strong></td>
          <td style="text-align: center;">${s.num_submitted}/${s.total_assigned}</td>
          <td style="text-align: center; color: ${s.num_missing > 0 ? '#B91C1C' : 'inherit'};"><strong>${s.num_missing}</strong></td>
          <td style="text-align: center; color: #047857;"><strong>${s.on_time_count}</strong></td>
          <td style="text-align: center; color: #B45309;">${s.late_count}</td>
          <td style="text-align: center;">${s.asg_requiring_retry_count}</td>
          <td style="text-align: center;"><span class="badge badge-green">${s.num_completed}</span></td>
          <td style="text-align: center; font-weight: 800; color: var(--primary);">${s.avg_score ?? "-"}</td>
          <td style="text-align: center;">${s.improved_count > 0 ? `👏 +${s.improved_count} bài` : "-"}</td>
        </tr>
      `).join("");

      // Table 2: By Assignment
      const asgTbody = document.getElementById("analytics-assignment-tbody");
      asgTbody.innerHTML = data.assignment_stats.map(a => `
        <tr>
          <td><strong>${a.title}</strong></td>
          <td><span class="badge badge-blue">${a.subject}</span></td>
          <td>${a.due_date}</td>
          <td style="text-align: center;">${a.num_submitted}/${a.total_students}</td>
          <td style="text-align: center; color: #B91C1C;"><strong>${a.num_missing}</strong></td>
          <td style="text-align: center; color: #047857;">${a.num_on_time}</td>
          <td style="text-align: center; color: #B45309;">${a.num_late}</td>
          <td style="text-align: center;">${a.num_need_fix}</td>
          <td style="text-align: center;">${a.num_resubmitted}</td>
          <td style="text-align: center;"><span class="badge badge-green">${a.num_completed}</span></td>
          <td style="text-align: center; font-weight: 800; color: var(--primary);">${a.class_avg_score ?? "-"}</td>
        </tr>
      `).join("");

    } catch (e) {
      console.error("Error loading analytics", e);
    }
  }

  showAnalyticsSubTab(view) {
    if (view === "student") {
      document.getElementById("analytics-student-view").style.display = "block";
      document.getElementById("analytics-assignment-view").style.display = "none";
      document.getElementById("btn-sub-student").classList.add("active");
      document.getElementById("btn-sub-assignment").classList.remove("active");
    } else {
      document.getElementById("analytics-student-view").style.display = "none";
      document.getElementById("analytics-assignment-view").style.display = "block";
      document.getElementById("btn-sub-student").classList.remove("active");
      document.getElementById("btn-sub-assignment").classList.add("active");
    }
  }

  // --- SECTION 8: STUDENT PROFILE ---
  async loadStudentProfile() {
    const sid = document.getElementById("profile-student-select").value;
    if (!sid) return;

    try {
      const res = await fetch(`/api/student-profile/${sid}`);
      const data = await res.json();
      if (!data) return;

      const st = data.student;
      document.getElementById("student-profile-content").style.display = "block";
      document.getElementById("prof-name").innerText = `${st.order_num}. ${st.full_name}`;
      document.getElementById("prof-meta").innerText = `Mã: ${st.code} • ${st.class_name} • Giới tính: ${st.gender}`;
      document.getElementById("prof-avatar-letter").innerText = st.full_name.split(" ").pop().charAt(0);

      const tbody = document.getElementById("prof-assignments-tbody");
      tbody.innerHTML = data.assignments.map(a => `
        <tr>
          <td><strong>${a.title}</strong></td>
          <td><span class="badge badge-blue">${a.subject}</span></td>
          <td>${a.due_date}</td>
          <td><span class="badge badge-${a.color}">${a.status}</span></td>
          <td style="text-align: center;">${a.submit_count}</td>
          <td style="text-align: center;">${a.retry_count}</td>
          <td style="text-align: center;">${a.first_score ?? "-"}</td>
          <td style="text-align: center; font-weight: 700; color: var(--primary);">${a.latest_score ?? "-"}</td>
          <td style="font-size: 12px;">${a.teacher_note || "-"}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.viewStudentHistory(${st.id}, '${st.full_name}')">
              📜 Xem
            </button>
          </td>
        </tr>
      `).join("");
    } catch (e) {
      console.error("Error loading student profile", e);
    }
  }

  // --- SECTION 1 & REQUEST 4: A4 PRINTABLE QR SHEET ---
  renderA4PrintSheet() {
    const grid = document.getElementById("qr-mini-grid");
    grid.innerHTML = "";

    this.students.forEach(st => {
      const card = document.createElement("div");
      card.className = "qr-card-mini";

      const canvasBox = document.createElement("div");
      canvasBox.className = "qr-canvas-box";

      // Render crisp, scannable QR code with 4-module quiet zone
      if (window.QRCode && window.QRCode.generateSVG) {
        canvasBox.innerHTML = window.QRCode.generateSVG(st.code, { margin: 4 });
      } else {
        canvasBox.innerHTML = `<img src="/api/qr?text=${encodeURIComponent(st.code)}" alt="${st.code}" />`;
      }

      const infoBox = document.createElement("div");
      infoBox.className = "qr-info";
      infoBox.innerHTML = `
        <div class="qr-class">${st.class_name}</div>
        <div class="qr-name">${st.order_num}. ${st.full_name}</div>
        <div class="qr-code-label">MÃ: ${st.code}</div>
      `;

      card.appendChild(canvasBox);
      card.appendChild(infoBox);
      grid.appendChild(card);
    });
  }

  // --- NEW ASSIGNMENT MODAL ---
  openNewAssignmentModal() {
    document.getElementById("new-assignment-modal").style.display = "flex";
    const now = new Date();
    document.getElementById("new-asg-assigned").value = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 86400000);
    document.getElementById("new-asg-due").value = tomorrow.toISOString().slice(0, 16);
  }

  closeNewAssignmentModal() {
    document.getElementById("new-assignment-modal").style.display = "none";
  }

  async createAssignment() {
    const title = document.getElementById("new-asg-title").value.trim();
    const subject = document.getElementById("new-asg-subject").value;
    const assigned_date = document.getElementById("new-asg-assigned").value;
    const due_date = document.getElementById("new-asg-due").value.replace("T", " ");
    const max_score = document.getElementById("new-asg-maxscore").value;
    const notes = document.getElementById("new-asg-notes").value;

    if (!title || !due_date) {
      alert("Vui lòng nhập Tên bài tập và Hạn nộp!");
      return;
    }

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, assigned_date, due_date, max_score, notes })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi khi tạo bài tập!");
        return;
      }
      alert(`✅ Đã tạo bài tập mới: "${title}"!`);
      this.closeNewAssignmentModal();
      await this.loadAssignments();
      this.currentAssignmentId = data.id;
      this.populateDropdowns();
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  // Barcode Scanner Gun Buffer (Keyboard Wedge)
  initBarcodeGunListener() {
    let buffer = "";
    let lastKeyTime = Date.now();

    window.addEventListener("keydown", (e) => {
      // Don't intercept when user is typing in form inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        return;
      }

      const charTime = Date.now();
      if (charTime - lastKeyTime > 150) {
        buffer = ""; // Timeout, new scan
      }
      lastKeyTime = charTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          console.log("[Barcode Gun Scanned]:", scannedCode);
          const activePane = document.querySelector(".tab-pane.active");
          if (activePane && activePane.id === "pane-grade") {
            this.handleGradeScan(scannedCode);
          } else {
            this.handleKioskScan(scannedCode);
          }
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    });
  }
}

// Global App Instance
const app = new LMSApp();
window.app = app;
window.addEventListener("DOMContentLoaded", () => app.init());
