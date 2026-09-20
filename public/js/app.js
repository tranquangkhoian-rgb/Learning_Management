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
    this.studentLoginScanner = null;
    this.activeTrackingFilter = "ALL";
    this.trackingMatrix = [];
    this.currentlyGradingStudent = null;
    this.selectedGradeStatus = "Đã đạt";
    this.cameraFacing = "environment";
    this.serverAvailable = true;
    this.currentUserRole = null;
    this.currentStudent = null;
    this.kioskEnteredFromLogin = false;
  }

  async checkServer() {
    try {
      const res = await fetch("/api/settings", { method: "GET" });
      this.serverAvailable = res.ok;
    } catch {
      this.serverAvailable = false;
    }
    console.log(`[LMS Mode]: ${this.serverAvailable ? "Local Server (SQLite)" : "Static Client Mode (GitHub Pages / Offline)"}`);
  }

  async init() {
    console.log("Initializing LMS App...");
    await this.checkServer();
    await this.loadSettings();
    await this.loadStudents();
    await this.loadAssignments();

    // Render A4 Printable Sheet of 29 QR cards
    this.renderA4PrintSheet();

    // Render quick student login chips
    this.renderLoginStudentPicker();

    // Init UI dropdowns and listeners
    this.populateDropdowns();

    // Load initial views
    if (this.assignments.length > 0) {
      this.currentAssignmentId = this.assignments[0].id;
      this.loadTrackingMatrix();
    }
    this.loadAnalytics();
    this.loadStudentProfile();

    // Check authentication session
    await this.checkAuthSession();

    // Keyboard listener for barcode scanner gun (e.g. USB/Bluetooth scanner typing "HS01" + Enter)
    this.initBarcodeGunListener();
  }

  // --- Settings & APIs ---
  async loadSettings() {
    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/settings");
        if (res.ok) this.settings = await res.json();
        else this.settings = window.ClientDB.getSettings();
      } else {
        this.settings = window.ClientDB.getSettings();
      }
    } catch {
      this.settings = window.ClientDB.getSettings();
    }
    document.getElementById("header-class-title").innerText = `${this.settings.class_name || "Lớp 3A7"} • ${this.settings.teacher_name || "Cô Linh"}`;
    document.getElementById("header-school-name").innerText = `${this.settings.school_name || "Trường Tiểu Học Ánh Dương"} • Hệ Thống Nộp Bài & Điểm Số`;
    document.getElementById("print-sheet-class").innerText = `${(this.settings.class_name || "LỚP 3A7").toUpperCase()} • GVCN: ${(this.settings.teacher_name || "CÔ LINH").toUpperCase()}`;
    
    // Populate settings form
    document.getElementById("setting-sheet-url").value = this.settings.google_sheet_url || "";
    document.getElementById("setting-class-name").value = this.settings.class_name || "Lớp 3A7";
    document.getElementById("setting-teacher-name").value = this.settings.teacher_name || "Cô Linh";
    document.getElementById("setting-school-name").value = this.settings.school_name || "Trường Tiểu Học Ánh Dương";
    document.getElementById("setting-teacher-pin").value = this.settings.teacher_pin || "1234";
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
      if (this.serverAvailable) {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) this.settings = await res.json();
        else this.settings = window.ClientDB.saveSettings(payload).settings;
      } else {
        this.settings = window.ClientDB.saveSettings(payload).settings;
      }
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
      if (this.serverAvailable) {
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
      } else {
        // Direct browser ping in client-only mode
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "TEST",
            class_name: this.settings.class_name,
            teacher_name: this.settings.teacher_name,
            timestamp: new Date().toISOString()
          })
        });
        resultBox.innerHTML = "<span style='color: var(--status-green); font-weight: 700;'>✅ Đã gửi tín hiệu kiểm tra trực tiếp từ trình duyệt lên Google Sheet!</span>";
      }
    } catch (e) {
      resultBox.innerHTML = `<span style='color: var(--status-red); font-weight: 700;'>❌ Lỗi: ${e.message}</span>`;
    }
  }

  // --- Students & Assignments ---
  async loadStudents() {
    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/students");
        if (res.ok) this.students = await res.json();
        else this.students = window.ClientDB.getStudents();
      } else {
        this.students = window.ClientDB.getStudents();
      }
    } catch {
      this.students = window.ClientDB.getStudents();
    }
    document.getElementById("stat-total-students").innerText = this.students.length;
    this.renderQuickStudentButtons();
  }

  async loadAssignments() {
    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/assignments");
        if (res.ok) this.assignments = await res.json();
        else this.assignments = window.ClientDB.getAssignments();
      } else {
        this.assignments = window.ClientDB.getAssignments();
      }
    } catch {
      this.assignments = window.ClientDB.getAssignments();
    }
    document.getElementById("stat-total-assignments").innerText = this.assignments.length;
    this.populateDropdowns();
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

  // --- AUTHENTICATION & PORTAL CONTROLLER ---
  async checkAuthSession() {
    try {
      const sessStr = localStorage.getItem("lms_session") || sessionStorage.getItem("lms_session");
      if (!sessStr) {
        this.showLoginView();
        return;
      }
      const sess = JSON.parse(sessStr);
      if (sess.role === "teacher") {
        this.showTeacherApp(false);
      } else if (sess.role === "student" && sess.studentId) {
        const st = this.students.find(s => s.id == sess.studentId || s.code == sess.code);
        if (st) {
          await this.showStudentPortal(st, false);
        } else {
          this.showLoginView();
        }
      } else {
        this.showLoginView();
      }
    } catch {
      this.showLoginView();
    }
  }

  showLoginView() {
    if (this.kioskScanner) this.kioskScanner.stop();
    if (this.gradeScanner) this.gradeScanner.stop();
    if (this.studentLoginScanner) this.studentLoginScanner.stop();

    const viewLogin = document.getElementById("view-login");
    const viewStudent = document.getElementById("view-student-portal");
    const viewTeacher = document.getElementById("view-teacher-app");

    if (viewLogin) viewLogin.style.display = "flex";
    if (viewStudent) viewStudent.style.display = "none";
    if (viewTeacher) viewTeacher.style.display = "none";

    this.currentUserRole = null;
    this.currentStudent = null;

    const tErr = document.getElementById("teacher-login-error");
    if (tErr) tErr.style.display = "none";
    const sErr = document.getElementById("student-login-error");
    if (sErr) sErr.style.display = "none";
    const sCode = document.getElementById("student-login-code");
    if (sCode) sCode.value = "";
    const tPin = document.getElementById("teacher-login-pin");
    if (tPin) tPin.value = "";

    this.renderLoginStudentPicker();
  }

  switchLoginRole(role) {
    const tabTeacher = document.getElementById("tab-btn-teacher");
    const tabStudent = document.getElementById("tab-btn-student");
    const paneTeacher = document.getElementById("login-pane-teacher");
    const paneStudent = document.getElementById("login-pane-student");

    if (role === "teacher") {
      if (tabTeacher) tabTeacher.classList.add("active");
      if (tabStudent) tabStudent.classList.remove("active");
      if (paneTeacher) paneTeacher.style.display = "block";
      if (paneStudent) paneStudent.style.display = "none";
      setTimeout(() => document.getElementById("teacher-login-pin")?.focus(), 100);
    } else {
      if (tabStudent) tabStudent.classList.add("active");
      if (tabTeacher) tabTeacher.classList.remove("active");
      if (paneStudent) paneStudent.style.display = "block";
      if (paneTeacher) paneTeacher.style.display = "none";
      this.renderLoginStudentPicker();
    }
  }

  togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.type = field.type === "password" ? "text" : "password";
  }

  loginTeacher() {
    const pin = (document.getElementById("teacher-login-pin").value || "").trim();
    const correctPin = this.settings.teacher_pin || "1234";
    const errEl = document.getElementById("teacher-login-error");

    if (pin === correctPin) {
      if (errEl) errEl.style.display = "none";
      const remember = document.getElementById("teacher-remember-me")?.checked;
      const sess = JSON.stringify({ role: "teacher", loginTime: new Date().toISOString() });
      if (remember) {
        localStorage.setItem("lms_session", sess);
      } else {
        sessionStorage.setItem("lms_session", sess);
      }
      this.showTeacherApp(true);
    } else {
      if (errEl) errEl.style.display = "block";
      const pinField = document.getElementById("teacher-login-pin");
      if (pinField) {
        pinField.value = "";
        pinField.focus();
      }
    }
  }

  showTeacherApp(isNewLogin = false) {
    this.currentUserRole = "teacher";
    this.currentStudent = null;
    this.isTeacherLocked = false;

    const viewLogin = document.getElementById("view-login");
    const viewStudent = document.getElementById("view-student-portal");
    const viewTeacher = document.getElementById("view-teacher-app");
    if (viewLogin) viewLogin.style.display = "none";
    if (viewStudent) viewStudent.style.display = "none";
    if (viewTeacher) viewTeacher.style.display = "block";

    const header = document.querySelector(".app-header");
    if (header) header.style.display = "block";
    const nav = document.getElementById("teacher-nav");
    if (nav) nav.style.display = "block";

    const standaloneBar = document.getElementById("kiosk-standalone-bar");
    if (standaloneBar) standaloneBar.style.display = "none";

    const btnKiosk = document.getElementById("btn-switch-kiosk");
    if (btnKiosk) btnKiosk.style.display = "inline-flex";
    const btnLock = document.getElementById("btn-lock-mode");
    if (btnLock) btnLock.innerText = "🔒 Khóa Kiosk";

    if (isNewLogin) {
      this.switchTab("pane-grade");
    }
  }

  loginStudentByInput() {
    const code = (document.getElementById("student-login-code").value || "").trim().toUpperCase();
    const errEl = document.getElementById("student-login-error");

    if (!code) {
      if (errEl) {
        errEl.innerText = "Vui lòng nhập mã học sinh (ví dụ: HS01)";
        errEl.style.display = "block";
      }
      return;
    }

    const st = this.students.find(s => s.code.toUpperCase() === code);
    if (st) {
      if (errEl) errEl.style.display = "none";
      this.loginStudent(st);
    } else {
      if (errEl) {
        errEl.innerText = `❌ Không tìm thấy học sinh với mã "${code}" trong Lớp 3A7!`;
        errEl.style.display = "block";
      }
    }
  }

  loginStudentById(studentId) {
    const st = this.students.find(s => s.id == studentId);
    if (st) {
      this.loginStudent(st);
    }
  }

  loginStudent(st) {
    const sess = JSON.stringify({
      role: "student",
      studentId: st.id,
      code: st.code,
      name: st.full_name,
      loginTime: new Date().toISOString()
    });
    localStorage.setItem("lms_session", sess);
    this.showStudentPortal(st, true);
  }

  async showStudentPortal(st, isNewLogin = false) {
    this.currentUserRole = "student";
    this.currentStudent = st;

    if (this.kioskScanner) this.kioskScanner.stop();
    if (this.gradeScanner) this.gradeScanner.stop();

    const viewLogin = document.getElementById("view-login");
    const viewTeacher = document.getElementById("view-teacher-app");
    const viewStudent = document.getElementById("view-student-portal");
    if (viewLogin) viewLogin.style.display = "none";
    if (viewTeacher) viewTeacher.style.display = "none";
    if (viewStudent) viewStudent.style.display = "block";

    await this.renderStudentPortal(st);

    if (isNewLogin && window.QRCameraScanner) {
      const audio = new QRCameraScanner(document.createElement("video"), () => {});
      audio.playSuccessBeep();
    }
  }

  logout() {
    localStorage.removeItem("lms_session");
    sessionStorage.removeItem("lms_session");
    this.showLoginView();
  }

  renderLoginStudentPicker() {
    const grid = document.getElementById("login-student-picker-grid");
    if (!grid) return;
    grid.innerHTML = this.students.map(s => `
      <button type="button" class="login-student-chip" onclick="app.loginStudentById(${s.id})">
        <span class="student-chip-order">${s.order_num}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.full_name}</span>
      </button>
    `).join("");
  }

  async openStudentLoginScanner() {
    const modal = document.getElementById("student-login-camera-modal");
    if (!modal) return;
    modal.style.display = "flex";

    const video = document.getElementById("student-login-video");
    if (!this.studentLoginScanner) {
      this.studentLoginScanner = new QRCameraScanner(video, (code) => this.handleStudentLoginScan(code), {
        facingMode: this.cameraFacing
      });
    }
    try {
      await this.studentLoginScanner.start();
    } catch (e) {
      console.warn("Could not start student login camera:", e);
    }
  }

  closeStudentLoginScanner() {
    const modal = document.getElementById("student-login-camera-modal");
    if (modal) modal.style.display = "none";
    if (this.studentLoginScanner) {
      this.studentLoginScanner.stop();
    }
  }

  async switchStudentCameraFacing() {
    this.cameraFacing = this.cameraFacing === "environment" ? "user" : "environment";
    if (this.studentLoginScanner) {
      this.studentLoginScanner.stop();
      this.studentLoginScanner = null;
      await this.openStudentLoginScanner();
    }
  }

  handleStudentLoginScan(scannedCode) {
    if (!scannedCode) return;
    const cleanCode = scannedCode.trim().toUpperCase();
    const match = cleanCode.match(/HS\d+/);
    const code = match ? match[0] : cleanCode;

    const st = this.students.find(s => s.code.toUpperCase() === code);
    if (st) {
      if (this.studentLoginScanner) {
        this.studentLoginScanner.playSuccessBeep();
      }
      this.closeStudentLoginScanner();
      this.loginStudent(st);
    } else {
      if (this.studentLoginScanner) {
        this.studentLoginScanner.playErrorBeep();
      }
      alert(`Mã QR "${scannedCode}" không thuộc danh sách học sinh Lớp 3A7!`);
    }
  }

  async renderStudentPortal(st) {
    if (!st) return;

    try {
      let data;
      if (this.serverAvailable) {
        const res = await fetch(`/api/student-profile/${st.id}`);
        if (res.ok) data = await res.json();
        else data = window.ClientDB.getStudentProfile(st.id);
      } else {
        data = window.ClientDB.getStudentProfile(st.id);
      }
      if (!data) return;

      const student = data.student || st;
      const assignments = data.assignments || [];

      // Update Hero card
      const nameParts = (student.full_name || "").trim().split(" ");
      const lastName = nameParts[nameParts.length - 1] || "A";
      const initial = lastName.charAt(0).toUpperCase();

      const avEl = document.getElementById("sp-avatar");
      if (avEl) avEl.innerText = initial;
      const fnEl = document.getElementById("sp-full-name");
      if (fnEl) fnEl.innerText = `${student.order_num}. ${student.full_name}`;
      const codeEl = document.getElementById("sp-code");
      if (codeEl) codeEl.innerText = student.code;
      const ordEl = document.getElementById("sp-order-num");
      if (ordEl) ordEl.innerText = student.order_num;

      // QR Code preview
      const qrBox = document.getElementById("sp-qr-box");
      if (qrBox) {
        if (window.QRCode && window.QRCode.generateSVG) {
          qrBox.innerHTML = window.QRCode.generateSVG(student.code, { margin: 2 });
        } else {
          qrBox.innerHTML = `<img src="/api/qr?text=${encodeURIComponent(student.code)}" alt="${student.code}" />`;
        }
      }

      // Calculate Stats
      const totalAsg = assignments.length;
      const submittedList = assignments.filter(a => (a.submit_count || 0) > 0);
      const passedList = assignments.filter(a => (a.status || a.latest_status) === "Đã đạt" || (a.latest_score !== null && a.latest_score >= 8));
      
      const gradedList = assignments.filter(a => a.latest_score !== null && a.latest_score !== undefined);
      const avgScore = gradedList.length > 0 
        ? (gradedList.reduce((acc, a) => acc + Number(a.latest_score), 0) / gradedList.length).toFixed(1)
        : "-";

      const statTot = document.getElementById("sp-stat-total");
      if (statTot) statTot.innerText = totalAsg;
      const statSub = document.getElementById("sp-stat-submitted");
      if (statSub) statSub.innerText = submittedList.length;
      const statAvg = document.getElementById("sp-stat-avg");
      if (statAvg) statAvg.innerText = avgScore;
      const statPas = document.getElementById("sp-stat-passed");
      if (statPas) statPas.innerText = passedList.length;

      // Populate Quick Submit dropdown
      const selectEl = document.getElementById("sp-quick-asg-select");
      if (selectEl) {
        selectEl.innerHTML = this.assignments.map(a => `
          <option value="${a.id}">${a.subject ? `[${a.subject}] ` : ""}${a.title}</option>
        `).join("");
      }

      // Populate Assignments Table
      const tbody = document.getElementById("sp-assignments-tbody");
      if (tbody) {
        if (assignments.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Hiện tại chưa có bài tập nào được giao.</td></tr>`;
          return;
        }

        tbody.innerHTML = assignments.map(a => {
          const aid = a.assignment_id || a.id;
          const status = a.status || a.latest_status || "Chưa nộp";
          let badgeColor = "blue";
          if (status === "Đã đạt") badgeColor = "green";
          else if (status === "Cần sửa" || status === "Cần nộp lại") badgeColor = "yellow";
          else if (status === "Chưa nộp") badgeColor = "red";
          else if (status === "Nộp trễ") badgeColor = "orange";
          else if (status === "Đã nộp đúng hạn" || status === "Đã nộp lại") badgeColor = "blue";

          const scoreText = (a.latest_score !== null && a.latest_score !== undefined)
            ? `<strong style="font-size: 16px; color: var(--primary);">${a.latest_score}</strong>/10`
            : `<span style="color: var(--text-muted); font-size: 13px;">Chưa chấm</span>`;

          const teacherNoteHtml = a.teacher_note
            ? `<div class="teacher-note-pill">💬 <strong>Cô Linh:</strong> "${a.teacher_note}"</div>`
            : `<span style="color: var(--text-muted); font-size: 13px;">Chưa có nhận xét</span>`;

          const canSubmit = status === "Chưa nộp" || status === "Cần sửa" || status === "Cần nộp lại";
          const submitBtn = canSubmit
            ? `<button class="btn btn-primary btn-sm" onclick="app.studentSubmitSelf(${aid})" style="font-size: 12px; padding: 4px 10px; margin-left: 6px;">📤 Nộp</button>`
            : "";

          return `
            <tr>
              <td>
                <strong>${a.title || a.assignment_title}</strong>
                ${submitBtn}
              </td>
              <td><span class="badge badge-blue">${a.subject || "Bài tập"}</span></td>
              <td style="font-size: 13px;">${a.due_date ? a.due_date.replace("T", " ") : "-"}</td>
              <td><span class="badge badge-${badgeColor}">${status}</span></td>
              <td style="text-align: center;">${scoreText}</td>
              <td>${teacherNoteHtml}</td>
            </tr>
          `;
        }).join("");
      }
    } catch (e) {
      console.error("Error rendering student portal:", e);
    }
  }

  async studentSubmitCurrentAssignment() {
    const asgId = document.getElementById("sp-quick-asg-select")?.value;
    if (!asgId) {
      alert("Vui lòng chọn bài tập muốn nộp!");
      return;
    }
    await this.studentSubmitSelf(asgId);
  }

  async studentSubmitSelf(assignmentId) {
    if (!this.currentStudent) return;

    try {
      let data;
      if (this.serverAvailable) {
        const res = await fetch("/api/scan-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_code: this.currentStudent.code,
            assignment_id: assignmentId,
            operator: "Học sinh"
          })
        });
        data = await res.json();
      } else {
        data = window.ClientDB.recordSubmission(this.currentStudent.code, assignmentId, "Học sinh");
      }

      if (!data || data.error || data.success === false) {
        alert((data && data.error) || "Không thể nộp bài tập!");
        return;
      }

      // Success chime
      if (window.QRCameraScanner) {
        const audio = new QRCameraScanner(document.createElement("video"), () => {});
        audio.playSuccessBeep();
      }

      alert(`🎉 Tuyệt vời! Em đã nộp bài thành công cho Cô Linh.\nLần nộp: ${data.event?.submit_count || 1} • ${data.event?.is_late ? "Nộp trễ" : "Đúng hạn"}`);

      await this.renderStudentPortal(this.currentStudent);
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi khi nộp bài: " + e.message);
    }
  }

  enterKioskFromLogin() {
    this.kioskEnteredFromLogin = true;
    this.isTeacherLocked = false;
    const vLogin = document.getElementById("view-login");
    const vStudent = document.getElementById("view-student-portal");
    const vTeacher = document.getElementById("view-teacher-app");
    if (vLogin) vLogin.style.display = "none";
    if (vStudent) vStudent.style.display = "none";
    if (vTeacher) vTeacher.style.display = "block";

    const header = document.querySelector(".app-header");
    if (header) header.style.display = "none";
    const nav = document.getElementById("teacher-nav");
    if (nav) nav.style.display = "none";

    const standaloneBar = document.getElementById("kiosk-standalone-bar");
    if (standaloneBar) standaloneBar.style.display = "flex";

    this.switchTab("pane-kiosk");
  }

  exitKiosk() {
    if (this.isTeacherLocked) {
      this.openPinModal(() => {
        this.isTeacherLocked = false;
        this.performKioskExit();
      });
    } else {
      this.performKioskExit();
    }
  }

  performKioskExit() {
    if (this.kioskScanner) this.kioskScanner.stop();
    const standaloneBar = document.getElementById("kiosk-standalone-bar");
    if (standaloneBar) standaloneBar.style.display = "none";

    if (this.kioskEnteredFromLogin) {
      this.kioskEnteredFromLogin = false;
      this.showLoginView();
    } else if (this.currentUserRole === "teacher") {
      const header = document.querySelector(".app-header");
      if (header) header.style.display = "block";
      const nav = document.getElementById("teacher-nav");
      if (nav) nav.style.display = "block";
      const btnKiosk = document.getElementById("btn-switch-kiosk");
      if (btnKiosk) btnKiosk.style.display = "inline-flex";
      const btnLock = document.getElementById("btn-lock-mode");
      if (btnLock) btnLock.innerText = "🔒 Khóa Kiosk";
      this.switchTab("pane-grade");
    } else {
      this.showLoginView();
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
    this.kioskEnteredFromLogin = false;
    document.getElementById("teacher-nav").style.display = "none";
    document.getElementById("btn-switch-kiosk").style.display = "none";
    document.getElementById("btn-lock-mode").innerText = "🔒 Mở Khóa Giáo Viên";
    const standaloneBar = document.getElementById("kiosk-standalone-bar");
    if (standaloneBar) standaloneBar.style.display = "none";
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
      let data;
      if (this.serverAvailable) {
        const res = await fetch("/api/scan-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_code: code,
            assignment_id: asgId,
            operator: "Học sinh"
          })
        });
        data = await res.json();
      } else {
        data = window.ClientDB.recordSubmission(code, asgId, "Học sinh");
      }
      if (!data || data.error || data.success === false) {
        if (this.kioskScanner) this.kioskScanner.playErrorBeep();
        alert((data && data.error) || "Mã QR không hợp lệ!");
        return;
      }

      // Success! Play sound & Show Celebration Modal
      if (this.kioskScanner) this.kioskScanner.playSuccessBeep();
      this.showCelebrationModal(data);

      // Refresh tracking matrix in background
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi nộp bài: " + e.message);
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
      let history;
      if (this.serverAvailable) {
        const res = await fetch(`/api/history?student_id=${st.id}&assignment_id=${asgId}`);
        history = await res.json();
      } else {
        history = window.ClientDB.getSubmissionHistory(st.id, asgId);
      }
      const historyBox = document.getElementById("grade-prev-history");
      const historyContent = document.getElementById("grade-prev-history-content");

      if (history && history.length > 0) {
        historyBox.style.display = "block";
        historyContent.innerHTML = history.map(ev => {
          if (ev.event_type.includes("submit")) {
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
      let data;
      if (this.serverAvailable) {
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
        data = await res.json();
      } else {
        data = window.ClientDB.recordGrading(
          this.currentlyGradingStudent.id,
          asgId,
          score,
          status,
          note,
          this.settings.teacher_name || "Cô Linh"
        );
      }
      if (!data || data.error || data.success === false) {
        alert((data && data.error) || "Lỗi khi lưu điểm!");
        return;
      }

      alert(`✅ Đã lưu điểm cho học sinh ${this.currentlyGradingStudent.full_name} (${status})!`);
      this.cancelGrading();
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  // --- SECTION 6: TRACKING MATRIX TABLE ---
  async loadTrackingMatrix() {
    const asgId = document.getElementById("tracking-assignment-select").value;
    if (!asgId) return;

    try {
      let data;
      if (this.serverAvailable) {
        const res = await fetch(`/api/tracking/${asgId}`);
        data = await res.json();
      } else {
        data = window.ClientDB.getTrackingMatrix(asgId);
      }
      this.trackingMatrix = (data && (data.matrix || data.rows)) || [];
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
      let history;
      if (this.serverAvailable) {
        const res = await fetch(`/api/history?student_id=${studentId}&assignment_id=${asgId}`);
        history = await res.json();
      } else {
        history = window.ClientDB.getSubmissionHistory(studentId, asgId);
      }

      const modal = document.getElementById("history-modal");
      document.getElementById("history-modal-title").innerText = `Lịch Sử Nộp & Chấm: ${studentName}`;
      const content = document.getElementById("history-modal-content");

      if (!history || history.length === 0) {
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

    if (this.serverAvailable) {
      window.location.href = `/api/export-csv?assignment_id=${asgId}`;
    } else {
      const matrix = window.ClientDB.getTrackingMatrix(asgId);
      if (!matrix) return;
      const headers = ["STT", "Mã HS", "Họ và Tên", "Trạng thái", "Thời gian nộp", "Tiến độ", "Số lần nộp", "Số lần nộp lại", "Điểm mới nhất", "Ghi chú cô giáo"];
      const lines = [headers.join(",")];
      matrix.rows.forEach(r => {
        lines.push([
          r.order_num,
          r.code,
          `"${r.full_name}"`,
          `"${r.status}"`,
          `"${r.latest_submit_time || ''}"`,
          r.is_late ? "Trễ hạn" : "Đúng hạn",
          r.submit_count,
          r.retry_count,
          r.latest_score !== null ? r.latest_score : "",
          `"${r.teacher_note || ''}"`
        ].join(","));
      });
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Bang_Theo_Doi_Bai_Tap_${asgId}.csv`;
      link.click();
    }
  }

  // --- SECTION 7: 3-WAY ANALYTICS ---
  async loadAnalytics() {
    try {
      let data;
      if (this.serverAvailable) {
        const res = await fetch("/api/analytics");
        data = await res.json();
      } else {
        data = window.ClientDB.getAnalytics();
      }
      const whole = (data && data.whole_class) || {};

      document.getElementById("stat-completion-rate").innerText = `${whole.class_completion_rate || 0}%`;

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
      let data;
      if (this.serverAvailable) {
        const res = await fetch(`/api/student-profile/${sid}`);
        data = await res.json();
      } else {
        data = window.ClientDB.getStudentProfile(sid);
      }
      if (!data) return;

      const st = data.student;
      document.getElementById("student-profile-content").style.display = "block";
      document.getElementById("prof-name").innerText = `${st.order_num}. ${st.full_name}`;
      document.getElementById("prof-meta").innerText = `Mã: ${st.code} • ${st.class_name} • Giới tính: ${st.gender || "Học sinh"}`;
      document.getElementById("prof-avatar-letter").innerText = st.full_name.split(" ").pop().charAt(0);

      const tbody = document.getElementById("prof-assignments-tbody");
      tbody.innerHTML = data.assignments.map(a => `
        <tr>
          <td><strong>${a.title || a.assignment_title}</strong></td>
          <td><span class="badge badge-blue">${a.subject || "Bài tập"}</span></td>
          <td>${a.due_date}</td>
          <td><span class="badge badge-${a.color || 'blue'}">${a.status || a.latest_status}</span></td>
          <td style="text-align: center;">${a.submit_count}</td>
          <td style="text-align: center;">${a.retry_count || (a.submit_count > 1 ? a.submit_count - 1 : 0)}</td>
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
      let data;
      if (this.serverAvailable) {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, subject, assigned_date, due_date, max_score, notes })
        });
        data = await res.json();
      } else {
        data = window.ClientDB.createAssignment(title, notes, assigned_date, due_date, max_score);
      }
      if (!data || data.error) {
        alert((data && data.error) || "Lỗi khi tạo bài tập!");
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

          const viewLogin = document.getElementById("view-login");
          if (viewLogin && viewLogin.style.display !== "none") {
            const match = scannedCode.match(/HS\d+/);
            const code = match ? match[0] : scannedCode;
            const st = this.students.find(s => s.code.toUpperCase() === code);
            if (st) {
              this.loginStudent(st);
            }
          } else {
            const activePane = document.querySelector(".tab-pane.active");
            if (activePane && activePane.id === "pane-grade") {
              this.handleGradeScan(scannedCode);
            } else {
              this.handleKioskScan(scannedCode);
            }
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
