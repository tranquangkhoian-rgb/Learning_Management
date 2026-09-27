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
    this.books = [];
    this.activeLoans = [];
    this.readingRace = [];
    this.currentLibSubTab = "race";
    this.libScanner = null;
    this.libScanTarget = null;
    this.catalogCategoryFilter = "all";
    this.catalogSearchQuery = "";
    this.selectedPetStudent = null;
    this.currentViewMode = "teacher";
    this.currentQrBook = null;
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
    this.loadHomeworkList();
    this.loadStudentsList();
    this.loadAnalytics();
    this.loadStudentProfile();
    this.renderStudentPasswordTable();
    this.loadTeams();
    this.startLiveSync();

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
        if (res.ok) {
          this.students = await res.json();
          if (window.ClientDB) window.ClientDB.saveStudentsList(this.students);
        } else {
          this.students = window.ClientDB.getStudents();
        }
      } else {
        this.students = window.ClientDB.getStudents();
      }
    } catch {
      this.students = window.ClientDB.getStudents();
    }
    // Apply local device passwords (so this device's passwords override and stay isolated)
    if (window.ClientDB) {
      this.students = window.ClientDB.applyDevicePasswordsToStudents(this.students);
    }
    document.getElementById("stat-total-students").innerText = this.students.length;
    this.updateStudentTierCounters();
    this.renderQuickStudentButtons();
    this.renderStudentPasswordTable();
    this.filterStudentsList();
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
      `<option value="${a.id}">[${a.subject || "Bài tập"}] ${a.title} (Hạn: ${a.due_date || "-"})</option>`
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

    profileSelect.innerHTML = this.students.map((s, idx) => 
      `<option value="${s.id}">${s.order_num || (idx + 1)}. ${s.full_name} (${s.code})</option>`
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

  promptStudentPassword(studentId) {
    const st = this.students.find(s => s.id == studentId);
    if (!st) return;

    const modal = document.getElementById("modal-student-password");
    if (!modal) {
      this.loginStudent(st);
      return;
    }

    const avEl = document.getElementById("modal-st-pwd-avatar");
    const titEl = document.getElementById("modal-st-pwd-title");
    const subEl = document.getElementById("modal-st-pwd-subtitle");
    const inpEl = document.getElementById("student-input-password");
    const hidEl = document.getElementById("student-pwd-target-id");
    const errEl = document.getElementById("student-pwd-error");

    const raceItem = (this.readingRace || []).find(r => r.student_id == st.id || r.code === st.code);
    if (avEl) avEl.innerText = raceItem ? raceItem.avatar : "🎒";
    if (titEl) titEl.innerText = `${st.order_num}. ${st.full_name}`;
    if (subEl) subEl.innerText = `Mã: ${st.code} • Lớp 3A7 • GVCN: Cô Linh`;
    if (hidEl) hidEl.value = st.id;
    if (inpEl) {
      inpEl.value = "";
      inpEl.type = "password";
    }
    if (errEl) errEl.style.display = "none";

    modal.style.display = "flex";
    setTimeout(() => {
      if (inpEl) inpEl.focus();
    }, 150);
  }

  closeStudentPasswordModal() {
    const modal = document.getElementById("modal-student-password");
    if (modal) modal.style.display = "none";
    const errEl = document.getElementById("student-pwd-error");
    if (errEl) errEl.style.display = "none";
  }

  async submitStudentPassword() {
    const hidEl = document.getElementById("student-pwd-target-id");
    const inpEl = document.getElementById("student-input-password");
    const errEl = document.getElementById("student-pwd-error");
    if (!hidEl || !inpEl) return;

    const sid = hidEl.value;
    const pwd = (inpEl.value || "").trim();
    const st = this.students.find(s => s.id == sid);
    if (!st) return;

    let isValid = false;
    if (window.ClientDB) {
      isValid = window.ClientDB.verifyStudentPassword(sid, pwd);
    }
    if (!isValid && st && (st.password || "1234").trim() === pwd) {
      isValid = true;
    }

    if (isValid) {
      if (errEl) errEl.style.display = "none";
      this.closeStudentPasswordModal();
      this.loginStudent(st);
    } else {
      if (errEl) errEl.style.display = "block";
      inpEl.value = "";
      inpEl.focus();
    }
  }

  loginStudentById(studentId) {
    this.promptStudentPassword(studentId);
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
    grid.innerHTML = this.students.map((s, idx) => `
      <button type="button" class="login-student-chip" onclick="app.promptStudentPassword(${s.id})">
        <span class="student-chip-order">${s.order_num || (idx + 1)}</span>
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
      alert("Không thể bật camera: " + (e.message || e) + "\n\n💡 Gợi ý: Bạn có thể nhấn '📁 Chọn Ảnh QR' để quét từ ảnh có sẵn hoặc bấm vào tên học sinh bên dưới.");
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

  extractStudentCode(rawCode) {
    if (!rawCode) return "";
    const clean = String(rawCode).trim().toUpperCase();
    const match = clean.match(/HS\d+/i);
    return match ? match[0].toUpperCase() : clean;
  }

  async handleQrFileUpload(event, target) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const inputEl = event.target;

    let scanner = null;
    if (target === "student-login") scanner = this.studentLoginScanner;
    else if (target === "kiosk") scanner = this.kioskScanner;
    else if (target === "grade") scanner = this.gradeScanner;

    if (!scanner && window.QRCameraScanner) {
      scanner = new QRCameraScanner(document.createElement("video"), () => {});
    }

    if (!scanner) {
      alert("Trình đọc QR chưa sẵn sàng. Vui lòng thử lại sau vài giây.");
      inputEl.value = "";
      return;
    }

    try {
      const code = await scanner.scanImageFile(file);
      if (code) {
        if (target === "student-login") {
          this.handleStudentLoginScan(code);
        } else if (target === "kiosk") {
          this.handleKioskScan(code);
        } else if (target === "grade") {
          this.handleGradeScan(code);
        }
      } else {
        alert("Không tìm thấy mã QR trong hình ảnh vừa chọn. Vui lòng chụp ảnh gần hơn, rõ nét và đủ ánh sáng!");
      }
    } catch (err) {
      alert("Lỗi khi đọc file ảnh: " + (err.message || err));
    } finally {
      inputEl.value = "";
    }
  }

  handleStudentLoginScan(scannedCode) {
    if (!scannedCode) return;
    const code = this.extractStudentCode(scannedCode);

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

      // ================================================================
      // RENDER READING RACE & BORROWED BOOKS (Req 6)
      // ================================================================
      let readingSummary = null;
      try {
        if (this.serverAvailable) {
          const sRes = await fetch(`/api/student-reading-summary/${student.id}`);
          if (sRes.ok) readingSummary = await sRes.json();
          else readingSummary = window.ClientDB.getStudentReadingSummary(student.id);
        } else {
          readingSummary = window.ClientDB.getStudentReadingSummary(student.id);
        }
      } catch {
        readingSummary = window.ClientDB.getStudentReadingSummary(student.id);
      }

      if (readingSummary) {
        const race = readingSummary.race || {};
        const completed = Number(race.completed) || 0;
        const target = 33;
        const pct = Math.min(100, Math.round((completed / target) * 1000) / 10);
        const avatar = race.avatar || "🐶";
        const rank = race.rank || "--";

        const bCountEl = document.getElementById("sp-race-books-count");
        if (bCountEl) bCountEl.innerText = `${completed} / ${target} cuốn`;

        const rRankEl = document.getElementById("sp-race-class-rank");
        if (rRankEl) rRankEl.innerText = `Hạng #${rank} / 29 bạn`;

        const rPetEl = document.getElementById("sp-race-pet-icon");
        if (rPetEl) rPetEl.innerText = avatar;

        const rPctEl = document.getElementById("sp-race-pct-val");
        if (rPctEl) rPctEl.innerText = `${pct}%`;

        const rBarFill = document.getElementById("sp-race-bar-fill");
        if (rBarFill) rBarFill.style.width = `${pct}%`;

        const rRunner = document.getElementById("sp-race-runner");
        if (rRunner) {
          const clampedPos = Math.min(97, Math.max(3, pct));
          rRunner.style.left = `${clampedPos}%`;
          rRunner.innerText = avatar;
        }

        const msgEl = document.getElementById("sp-race-motivational-msg");
        if (msgEl) {
          if (completed >= 33) {
            msgEl.innerHTML = `🎉 <strong>CHÚC MỪNG CON!</strong> Con đã hoàn thành xuất sắc đường đua 33 quyển sách của Lớp 3A7! 🏆`;
            msgEl.style.color = "#b45309";
          } else if (completed >= 15) {
            msgEl.innerHTML = `🌟 <strong>Tuyệt vời!</strong> Con đã vượt mốc Tháng 12 (${completed} cuốn). Hãy thẳng tiến 33 cuốn để về đích Tháng 4 nhé 🏁!`;
            msgEl.style.color = "#0284c7";
          } else {
            msgEl.innerHTML = `🌱 <strong>Cố lên con nhé!</strong> Con đã đọc được ${completed} cuốn sách. Mục tiêu gần nhất là 15 quyển sách trước Tháng 12 🎯!`;
            msgEl.style.color = "#065f46";
          }
        }

        // Render Borrowed Books
        const bContainer = document.getElementById("sp-borrowed-books-container");
        if (bContainer) {
          const loans = readingSummary.active_loans || [];
          if (loans.length === 0) {
            bContainer.innerHTML = `
              <div style="background: white; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 14px 18px; color: #64748b; font-size: 13.5px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">📚</span>
                <span>Hiện tại con chưa mượn cuốn sách nào từ Thư viện Lớp 3A7. Con hãy chọn một cuốn sách yêu thích tại tủ sách của lớp nhé!</span>
              </div>
            `;
          } else {
            bContainer.innerHTML = loans.map(l => `
              <div style="background: white; border: 1px solid #a7f3d0; border-radius: 14px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <strong style="color: #0f172a; font-size: 14.5px;">${l.book_title}</strong>
                  <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                    Mã sách: <span style="font-family: monospace; font-weight: 700; color: #059669;">${l.book_code}</span> • Ngày mượn: ${l.borrow_date ? l.borrow_date.substring(0, 10) : "-"}
                  </div>
                </div>
                <div>
                  <span class="badge ${l.is_overdue ? 'badge-red' : 'badge-green'}" style="font-size: 12px; padding: 4px 10px;">
                    ${l.is_overdue ? '⏰ Đã quá hạn' : '📖 Đang mượn'} (Hạn: ${l.due_date ? l.due_date.substring(0, 10) : "-"})
                  </span>
                </div>
              </div>
            `).join("");
          }
        }
      }

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
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Hiện tại chưa có bài tập nào được giao.</td></tr>`;
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

          const submitTimes = a.submit_count ?? a.attempt_number ?? 0;
          const submitCountHtml = submitTimes > 0
            ? `<span class="badge badge-blue">Lần ${submitTimes}</span>`
            : `<span style="color: var(--text-muted); font-size: 13px;">Chưa nộp</span>`;

          return `
            <tr>
              <td>
                <strong>${a.title || a.assignment_title}</strong>
                ${submitBtn}
              </td>
              <td><span class="badge badge-blue">${a.subject || "Bài tập"}</span></td>
              <td style="font-size: 13px;">${a.due_date ? a.due_date.replace("T", " ") : "-"}</td>
              <td style="text-align: center;">${submitCountHtml}</td>
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

  openChangePetModalFromPortal() {
    if (!this.currentStudent) return;
    this.openPetAvatarModal(this.currentStudent.id);
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

      const attemptNum = data.attempt_number ?? data.event?.attempt_number ?? data.submit_count ?? data.event?.submit_count ?? 1;
      const isLate = data.is_late ?? data.event?.is_late ?? false;
      alert(`🎉 Tuyệt vời! Em đã nộp bài thành công cho Cô Linh.\nLần nộp: ${attemptNum} • ${isLate ? "Nộp trễ" : "Đúng hạn"}`);

      await this.renderStudentPortal(this.currentStudent);
      this.loadTrackingMatrix();
    } catch (e) {
      alert("Lỗi khi nộp bài: " + e.message);
    }
  }

  enterKioskFromLogin() {
    this.openPinModal(() => {
      this.kioskEnteredFromLogin = true;
      this.isTeacherLocked = true;
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
    }, "🔒 Xác Thực Giáo Viên", "Vui lòng nhập mã PIN giáo viên để mở Góc Nộp Bài / Quét Ảnh Tại Lớp:");
  }

  exitKiosk() {
    this.openPinModal(() => {
      this.isTeacherLocked = false;
      this.performKioskExit();
    }, "🔒 Thoát Góc Nộp Bài", "Vui lòng nhập mã PIN giáo viên để thoát khỏi góc nộp bài:");
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
    } else if (paneId === "pane-homework") {
      this.loadHomeworkList();
    } else if (paneId === "pane-teams") {
      this.loadTeams();
    } else if (paneId === "pane-tracking") {
      this.loadTrackingMatrix();
    } else if (paneId === "pane-analytics") {
      this.loadAnalytics();
    } else if (paneId === "pane-students") {
      this.loadStudentsList();
      this.loadStudentProfile();
    } else if (paneId === "pane-library") {
      this.loadLibraryData();
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

  openPinModal(callback, title = "Bảo Mật Giáo Viên", desc = "Vui lòng nhập mã PIN để xác thực:") {
    this.pinCallback = callback;
    const titleEl = document.getElementById("pin-modal-title");
    if (titleEl) titleEl.innerText = title;
    const descEl = document.getElementById("pin-modal-desc");
    if (descEl) descEl.innerText = desc;
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
      alert("Không thể bật camera: " + (e.message || e) + "\n\n💡 Gợi ý: Bạn có thể nhấn '🔍 Chọn Tên Nhanh' hoặc '📁 Tải Ảnh QR' để nộp bài.");
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
    if (!code) return;
    const studentCode = this.extractStudentCode(code);
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
            student_code: studentCode,
            assignment_id: asgId,
            operator: "Học sinh"
          })
        });
        data = await res.json();
      } else {
        data = window.ClientDB.recordSubmission(studentCode, asgId, "Học sinh");
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

    const student = data.student || {};
    const asg = data.assignment || {};
    const attemptNum = data.attempt_number ?? data.event?.attempt_number ?? data.submit_count ?? data.event?.submit_count ?? 1;
    const isLate = data.is_late ?? data.event?.is_late ?? false;

    nameEl.innerText = `${student.order_num || ""}. ${student.full_name || ""}`;
    detailEl.innerText = attemptNum > 1 
      ? `Đã ghi nhận Nộp Lại bài tập "${asg.title || "Bài tập"}"!`
      : `Đã ghi nhận nộp bài tập "${asg.title || "Bài tập"}" thành công!`;

    attemptEl.innerText = `Lần nộp: ${attemptNum}`;
    attemptEl.className = attemptNum > 1 ? "badge badge-blue" : "badge badge-green";

    if (isLate) {
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
      alert("Không thể bật camera: " + (e.message || e) + "\n\n💡 Gợi ý: Bạn có thể chọn học sinh trực tiếp trong danh sách bên dưới hoặc tải ảnh chụp mã QR lên.");
    }
  }

  stopGradeCamera() {
    if (this.gradeScanner) {
      this.gradeScanner.stop();
      this.gradeScanner = null;
    }
  }

  handleGradeScan(code) {
    if (!code) return;
    const studentCode = this.extractStudentCode(code);
    const st = this.students.find(s => s.code.toUpperCase() === studentCode);
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

    // Initialize Animal Mascot selection for this student
    this.selectedGradingAnimalGroup = st.animal_group || "orange_cat";
    this.renderGradingAnimalSelector();

    // Initialize and render Questions Breakdown for current assignment
    const asg = (this.assignments || []).find(a => a.id == asgId);
    let questions = asg && asg.questions && Array.isArray(asg.questions) && asg.questions.length > 0
      ? asg.questions
      : ["Câu 1", "Câu 2", "Câu 3", "Câu 4"];
    this.gradingQuestions = questions;
    this.gradingQuestionStatus = {};
    this.renderGradingQuestions();

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

  selectGradingAnimal(groupKey, symbol, title) {
    this.selectedGradingAnimalGroup = groupKey;
    this.selectedGradingAnimalSymbol = symbol;
    this.selectedGradingAnimalTitle = title;
    this.renderGradingAnimalSelector();
  }

  renderGradingAnimalSelector() {
    const groupKey = this.selectedGradingAnimalGroup || "orange_cat";
    const labelEl = document.getElementById("grade-selected-animal-label");
    const nameMap = {
      "dolphin": "🐬 Cá heo thông thái (Smart)",
      "monkey": "🐵 Khỉ con nhanh nhẹn (Kinda smart)",
      "orange_cat": "🐱 Mèo cam chăm chỉ (Ordinary)",
      "turtle_snail": "🐢 Rùa / Ốc sên (Need improvement)"
    };
    if (labelEl) {
      labelEl.innerText = nameMap[groupKey] || "🐱 Mèo cam chăm chỉ";
    }
    document.querySelectorAll(".animal-tier-btn").forEach(btn => {
      if (btn.getAttribute("data-group") === groupKey) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  renderGradingQuestions() {
    const container = document.getElementById("grade-questions-container");
    if (!container) return;
    const questions = this.gradingQuestions || [];
    if (questions.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Bài tập này chưa có danh sách câu hỏi cụ thể.</div>`;
      return;
    }
    container.innerHTML = questions.map((q, idx) => {
      const currentStatus = this.gradingQuestionStatus[q] || "";
      return `
        <div class="grade-question-row">
          <div class="grade-question-title">${q}</div>
          <div class="grade-question-actions">
            <button type="button" class="q-btn q-btn-correct ${currentStatus === 'correct' ? 'active' : ''}" onclick="app.setGradeQuestionStatus('${q}', 'correct')">
              🟢 Đúng
            </button>
            <button type="button" class="q-btn q-btn-needfix ${currentStatus === 'need_fix' ? 'active' : ''}" onclick="app.setGradeQuestionStatus('${q}', 'need_fix')">
              🟡 Cần sửa
            </button>
            <button type="button" class="q-btn q-btn-wrong ${currentStatus === 'incorrect' ? 'active' : ''}" onclick="app.setGradeQuestionStatus('${q}', 'incorrect')">
              🔴 Chưa đạt
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  setGradeQuestionStatus(qName, status) {
    if (this.gradingQuestionStatus[qName] === status) {
      delete this.gradingQuestionStatus[qName];
    } else {
      this.gradingQuestionStatus[qName] = status;
    }
    this.renderGradingQuestions();
    this.recomputeScoreFromQuestions();
  }

  markAllGradeQuestionsCorrect() {
    (this.gradingQuestions || []).forEach(q => {
      this.gradingQuestionStatus[q] = "correct";
    });
    this.renderGradingQuestions();
    this.setQuickScore(10);
    this.selectGradeStatus(document.querySelector(".grade-status-option[data-status='Đã đạt']"), "Đã đạt");
  }

  recomputeScoreFromQuestions() {
    const questions = this.gradingQuestions || [];
    if (questions.length === 0) return;
    let answered = 0;
    let points = 0;
    questions.forEach(q => {
      const st = this.gradingQuestionStatus[q];
      if (st) {
        answered++;
        if (st === 'correct') points += 1.0;
        else if (st === 'need_fix') points += 0.5;
        else if (st === 'incorrect') points += 0.0;
      }
    });
    if (answered > 0) {
      const calcScore = Math.round((points / questions.length) * 10 * 10) / 10;
      this.setQuickScore(calcScore);
    }
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
            question_details: this.gradingQuestionStatus,
            animal_group: this.selectedGradingAnimalGroup,
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
          this.settings.teacher_name || "Cô Linh",
          this.gradingQuestionStatus,
          this.selectedGradingAnimalGroup
        );
      }
      if (!data || data.error || data.success === false) {
        alert((data && data.error) || "Lỗi khi lưu điểm!");
        return;
      }

      // Update student's animal group locally so all UI reflects it immediately
      if (this.selectedGradingAnimalGroup && this.currentlyGradingStudent) {
        const targetSt = (this.students || []).find(s => s.id == this.currentlyGradingStudent.id);
        if (targetSt) {
          targetSt.animal_group = this.selectedGradingAnimalGroup;
          if (data.student) {
            targetSt.animal_symbol = data.student.animal_symbol || targetSt.animal_symbol;
            targetSt.animal_title = data.student.animal_title || targetSt.animal_title;
          }
        }
      }

      alert(`✅ Đã lưu điểm cho học sinh ${this.currentlyGradingStudent.full_name} (${status})!`);
      this.cancelGrading();
      this.loadTrackingMatrix();
      this.renderQuickGradeStudentList();
      this.renderStudentList();
      if (this.renderTeams) this.renderTeams();
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

  setTrackingAnimalFilter(val) {
    this.activeTrackingAnimalFilter = val || "ALL";
    this.filterTrackingTable();
  }

  filterTrackingTable() {
    const search = document.getElementById("tracking-search-input").value.toLowerCase().trim();
    const tbody = document.getElementById("tracking-table-body");

    const filtered = this.trackingMatrix.filter(row => {
      // Search filter
      const matchSearch = row.full_name.toLowerCase().includes(search) || row.code.toLowerCase().includes(search);
      if (!matchSearch) return false;

      // Animal Group Filter (Teacher only)
      if (this.activeTrackingAnimalFilter && this.activeTrackingAnimalFilter !== "ALL") {
        const rowGrp = row.animal_group || "orange_cat";
        if (rowGrp !== this.activeTrackingAnimalFilter) return false;
      }

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

    tbody.innerHTML = filtered.map((row, idx) => {
      const sttVal = row.stt || row.order_num || (idx + 1);
      const colorGroup = row.color_group || "blue";
      const currentStatus = row.current_status || (row.submit_count > 0 ? "Đã nộp" : "Chưa nộp");
      const statusBadge = `<span class="badge badge-${colorGroup}">${currentStatus}</span>`;
      const deadlineBadge = (row.submit_count === 0 || !row.submit_count) ? "-" : (row.is_late ? '<span class="badge badge-orange">Trễ hạn</span>' : '<span class="badge badge-green">Đúng hạn</span>');
      
      const firstScoreStr = (row.first_score !== null && row.first_score !== undefined) ? `<span class="score-pill score-high">${row.first_score}</span>` : "-";
      const latestScoreStr = (row.latest_score !== null && row.latest_score !== undefined) ? `<span class="score-pill score-high">${row.latest_score}</span>` : "-";
      const submitTimeStr = row.latest_submit_time ? (row.latest_submit_time.includes(" ") ? row.latest_submit_time.split(" ")[1] : row.latest_submit_time) : "-";

      const animalGrp = row.animal_group || "orange_cat";
      const animalSym = row.animal_symbol || "🐱";
      const animalTtl = row.animal_title || "Mèo cam";

      return `
        <tr>
          <td><strong>${sttVal}</strong></td>
          <td><code>${row.code || "-"}</code></td>
          <td>
            <strong>${row.full_name || "-"}</strong>
            <span class="badge-animal-mini badge-animal-${animalGrp}" title="${animalTtl}">${animalSym}</span>
          </td>
          <td>${statusBadge}</td>
          <td>${submitTimeStr}</td>
          <td>${deadlineBadge}</td>
          <td style="text-align: center;"><strong>${row.submit_count ?? 0}</strong></td>
          <td style="text-align: center; color: ${(row.retry_count || 0) > 0 ? '#B45309' : 'inherit'};"><strong>${row.retry_count ?? 0}</strong></td>
          <td style="text-align: center;">${firstScoreStr}</td>
          <td style="text-align: center;">${latestScoreStr}</td>
          <td style="font-size: 12px; max-width: 180px;">${row.teacher_note || '<span style="color:var(--text-muted);">-</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.viewStudentHistory(${row.student_id}, '${(row.full_name || '').replace(/'/g, "\\'")}')">
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

      const totalStudentsEl = document.getElementById("stat-total-students");
      if (totalStudentsEl) totalStudentsEl.innerText = (this.students && this.students.length) || 29;

      const totalAsgEl = document.getElementById("stat-total-assignments");
      if (totalAsgEl) totalAsgEl.innerText = (this.assignments && this.assignments.length) || (data.assignment_stats ? data.assignment_stats.length : 0);

      const compRateEl = document.getElementById("stat-completion-rate");
      if (compRateEl) compRateEl.innerText = `${whole.class_completion_rate || 0}%`;

      // Top Lists
      const formatTopList = (list, valKey, label) => {
        if (!list || list.length === 0) return "<li style='color:var(--text-muted);'>Chưa có dữ liệu</li>";
        return list.slice(0, 5).map(s => `
          <li>
            <span><strong>${s.code || ''}</strong> - ${s.full_name || ''}</span>
            <span style="font-weight: 700;">${s[valKey] ?? 0} ${label}</span>
          </li>
        `).join("");
      };

      document.getElementById("analytics-top-on-time").innerHTML = formatTopList(whole.top_on_time, "on_time_count", "bài đúng hạn");
      document.getElementById("analytics-top-missing").innerHTML = formatTopList(whole.top_missing, "num_missing", "bài chưa nộp");
      document.getElementById("analytics-top-late").innerHTML = formatTopList(whole.top_late, "late_count", "lần nộp trễ");
      document.getElementById("analytics-top-improved").innerHTML = formatTopList(whole.top_improved, "improved_count", "bài tiến bộ");

      // Table 1: By Student
      const studentTbody = document.getElementById("analytics-student-tbody");
      if (studentTbody) {
        studentTbody.innerHTML = (data.student_stats || []).map(s => `
          <tr>
            <td><code>${s.code || '-'}</code></td>
            <td><strong>${s.full_name || '-'}</strong></td>
            <td style="text-align: center;">${s.num_submitted ?? 0}/${s.total_assigned ?? 0}</td>
            <td style="text-align: center; color: ${(s.num_missing || 0) > 0 ? '#B91C1C' : 'inherit'};"><strong>${s.num_missing ?? 0}</strong></td>
            <td style="text-align: center; color: #047857;"><strong>${s.on_time_count ?? 0}</strong></td>
            <td style="text-align: center; color: #B45309;">${s.late_count ?? 0}</td>
            <td style="text-align: center;">${s.asg_requiring_retry_count ?? 0}</td>
            <td style="text-align: center;"><span class="badge badge-green">${s.num_completed ?? 0}</span></td>
            <td style="text-align: center; font-weight: 800; color: var(--primary);">${s.avg_score ?? "-"}</td>
            <td style="text-align: center;">${(s.improved_count || 0) > 0 ? `👏 +${s.improved_count} bài` : "-"}</td>
          </tr>
        `).join("");
      }

      // Table 2: By Assignment
      const asgTbody = document.getElementById("analytics-assignment-tbody");
      if (asgTbody) {
        const totalStudCount = (this.students && this.students.length) || 29;
        asgTbody.innerHTML = (data.assignment_stats || []).map(a => `
          <tr>
            <td><strong>${a.title || a.assignment_title || "Bài tập"}</strong></td>
            <td><span class="badge badge-blue">${a.subject || "Toán"}</span></td>
            <td>${a.due_date || "-"}</td>
            <td style="text-align: center;">${a.num_submitted ?? 0}/${a.total_students ?? totalStudCount}</td>
            <td style="text-align: center; color: #B91C1C;"><strong>${a.num_missing ?? 0}</strong></td>
            <td style="text-align: center; color: #047857;">${a.num_on_time ?? 0}</td>
            <td style="text-align: center; color: #B45309;">${a.num_late ?? 0}</td>
            <td style="text-align: center;">${a.num_need_fix ?? 0}</td>
            <td style="text-align: center;">${a.num_resubmitted ?? 0}</td>
            <td style="text-align: center;"><span class="badge badge-green">${a.num_completed ?? 0}</span></td>
            <td style="text-align: center; font-weight: 800; color: var(--primary);">${a.class_avg_score ?? "-"}</td>
          </tr>
        `).join("");
      }

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
    const sid = document.getElementById("profile-student-select")?.value;
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

      const st = data.student || {};
      document.getElementById("student-profile-content").style.display = "block";
      document.getElementById("prof-name").innerText = `${st.order_num || "-"}. ${st.full_name || "-"}`;
      document.getElementById("prof-meta").innerText = `Mã: ${st.code || "-"} • ${st.class_name || "Lớp 3A7"} • Giới tính: ${st.gender || "Học sinh"}`;
      document.getElementById("prof-avatar-letter").innerText = (st.full_name || "A").split(" ").pop().charAt(0) || "A";

      const tbody = document.getElementById("prof-assignments-tbody");
      if (tbody) {
        tbody.innerHTML = (data.assignments || []).map(a => `
          <tr>
            <td><strong>${a.title || a.assignment_title || "Bài tập"}</strong></td>
            <td><span class="badge badge-blue">${a.subject || "Bài tập"}</span></td>
            <td>${a.due_date || "-"}</td>
            <td><span class="badge badge-${a.color || 'blue'}">${a.status || a.latest_status || "Chưa nộp"}</span></td>
            <td style="text-align: center;">${a.submit_count ?? 0}</td>
            <td style="text-align: center;">${a.retry_count ?? (a.submit_count > 1 ? a.submit_count - 1 : 0)}</td>
            <td style="text-align: center;">${a.first_score ?? "-"}</td>
            <td style="text-align: center; font-weight: 700; color: var(--primary);">${a.latest_score ?? "-"}</td>
            <td style="font-size: 12px;">${a.teacher_note || "-"}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="app.viewStudentHistory(${st.id}, '${(st.full_name || '').replace(/'/g, "\\'")}')">
                📜 Xem
              </button>
            </td>
          </tr>
        `).join("");
      }
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
    this.newAsgQuestions = ["Câu 1", "Câu 2", "Câu 3", "Câu 4"];
    this.renderNewAsgQuestions();
  }

  setNewAsgQuestionPreset(count) {
    this.newAsgQuestions = [];
    for (let i = 1; i <= count; i++) {
      this.newAsgQuestions.push(`Câu ${i}`);
    }
    this.renderNewAsgQuestions();
  }

  addNewAsgQuestionRow() {
    const nextNum = (this.newAsgQuestions ? this.newAsgQuestions.length : 0) + 1;
    if (!this.newAsgQuestions) this.newAsgQuestions = [];
    this.newAsgQuestions.push(`Câu ${nextNum}`);
    this.renderNewAsgQuestions();
  }

  removeNewAsgQuestionRow(idx) {
    if (!this.newAsgQuestions || this.newAsgQuestions.length <= 1) return;
    this.newAsgQuestions.splice(idx, 1);
    this.renderNewAsgQuestions();
  }

  renderNewAsgQuestions() {
    const container = document.getElementById("new-asg-questions-container");
    if (!container) return;
    container.innerHTML = (this.newAsgQuestions || []).map((q, idx) => `
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); width: 24px;">#${idx + 1}</span>
        <input type="text" class="form-control form-control-sm new-asg-q-input" value="${q}" style="flex: 1; font-weight: 600;">
        <button type="button" class="btn btn-outline btn-xs" onclick="app.removeNewAsgQuestionRow(${idx})" title="Xóa câu này">🗑️</button>
      </div>
    `).join("");
  }

  collectNewAsgQuestions() {
    const inputs = document.querySelectorAll(".new-asg-q-input");
    const res = [];
    inputs.forEach(inp => {
      const val = inp.value.trim();
      if (val) res.push(val);
    });
    return res.length > 0 ? res : ["Câu 1", "Câu 2", "Câu 3", "Câu 4"];
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
    const questions = this.collectNewAsgQuestions();

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
          body: JSON.stringify({ title, subject, assigned_date, due_date, max_score, notes, questions })
        });
        data = await res.json();
      } else {
        data = window.ClientDB.createAssignment(title, subject, assigned_date, due_date, max_score, notes, questions);
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
      this.loadHomeworkList();
      this.loadTrackingMatrix();
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  // --- HOMEWORK MANAGEMENT CONTROLLER ---
  loadHomeworkList() {
    const list = this.assignments || [];
    const now = new Date();

    const totalEl = document.getElementById("hw-stat-total");
    const activeEl = document.getElementById("hw-stat-active");
    const closedEl = document.getElementById("hw-stat-closed");
    const countEl = document.getElementById("homework-filtered-count");

    let activeCount = 0;
    let closedCount = 0;

    list.forEach(a => {
      const due = a.due_date ? new Date(a.due_date.replace(" ", "T")) : null;
      if (!due || due >= now) {
        activeCount++;
      } else {
        closedCount++;
      }
    });

    if (totalEl) totalEl.innerText = list.length;
    if (activeEl) activeEl.innerText = activeCount;
    if (closedEl) closedEl.innerText = closedCount;
    if (countEl) countEl.innerText = list.length;

    this.renderHomeworkTable(list);
  }

  filterHomeworkList() {
    const query = (document.getElementById("homework-search-input")?.value || "").toLowerCase().trim();
    const list = this.assignments || [];
    const filtered = list.filter(a => {
      return (a.title || "").toLowerCase().includes(query) ||
             (a.subject || "").toLowerCase().includes(query) ||
             (a.notes || a.description || "").toLowerCase().includes(query);
    });
    const countEl = document.getElementById("homework-filtered-count");
    if (countEl) countEl.innerText = filtered.length;
    this.renderHomeworkTable(filtered);
  }

  renderHomeworkTable(list) {
    const tbody = document.getElementById("homework-management-tbody");
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Không tìm thấy bài tập nào.</td></tr>`;
      return;
    }

    const now = new Date();
    tbody.innerHTML = list.map(a => {
      const due = a.due_date ? new Date(a.due_date.replace(" ", "T")) : null;
      const isOpen = !due || due >= now;
      const statusBadge = isOpen
        ? `<span class="badge badge-green">Đang mở nộp</span>`
        : `<span class="badge badge-orange">Đã hết hạn</span>`;

      return `
        <tr>
          <td><strong>#${a.id}</strong></td>
          <td><strong>${a.title}</strong></td>
          <td><span class="badge badge-blue">${a.subject || "Bài tập"}</span></td>
          <td>${a.assigned_date || "-"}</td>
          <td><strong style="color: ${isOpen ? 'inherit' : '#B45309'};">${a.due_date ? a.due_date.replace("T", " ") : "-"}</strong></td>
          <td style="text-align: center;"><strong>${a.max_score ?? 10}</strong></td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="font-size: 13px; max-width: 200px; color: #475569;">${a.notes || a.description || '<span style="color:var(--text-muted);">-</span>'}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="app.quickGradeAssignment(${a.id})" title="Chuyển sang chấm bài này">✍️ Chấm</button>
            <button class="btn btn-outline btn-sm" onclick="app.openEditAssignmentModal(${a.id})" title="Chỉnh sửa thông tin bài tập">✏️ Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteAssignment(${a.id})" title="Xóa bài tập">🗑️ Xóa</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  quickGradeAssignment(assignmentId) {
    this.currentAssignmentId = assignmentId;
    const sel1 = document.getElementById("grade-assignment-select");
    const sel2 = document.getElementById("tracking-assignment-select");
    const sel3 = document.getElementById("kiosk-assignment-select");
    if (sel1) sel1.value = assignmentId;
    if (sel2) sel2.value = assignmentId;
    if (sel3) sel3.value = assignmentId;
    this.switchTab("pane-grade");
  }

  openEditAssignmentModal(id) {
    const asg = (this.assignments || []).find(a => a.id == id);
    if (!asg) return;

    document.getElementById("edit-asg-id").value = asg.id;
    document.getElementById("edit-asg-title").value = asg.title || "";
    document.getElementById("edit-asg-subject").value = asg.subject || "Toán";
    document.getElementById("edit-asg-assigned").value = asg.assigned_date ? asg.assigned_date.split(" ")[0] : "";
    document.getElementById("edit-asg-due").value = asg.due_date ? asg.due_date.replace(" ", "T").slice(0, 16) : "";
    document.getElementById("edit-asg-maxscore").value = asg.max_score || 10;
    document.getElementById("edit-asg-notes").value = asg.notes || asg.description || "";

    const questions = asg.questions && Array.isArray(asg.questions) && asg.questions.length > 0
      ? asg.questions
      : ["Câu 1", "Câu 2", "Câu 3", "Câu 4"];
    this.editAsgQuestions = [...questions];
    this.renderEditAsgQuestions();

    document.getElementById("edit-assignment-modal").style.display = "flex";
  }

  setEditAsgQuestionPreset(count) {
    this.editAsgQuestions = [];
    for (let i = 1; i <= count; i++) {
      this.editAsgQuestions.push(`Câu ${i}`);
    }
    this.renderEditAsgQuestions();
  }

  addEditAsgQuestionRow() {
    const nextNum = (this.editAsgQuestions ? this.editAsgQuestions.length : 0) + 1;
    if (!this.editAsgQuestions) this.editAsgQuestions = [];
    this.editAsgQuestions.push(`Câu ${nextNum}`);
    this.renderEditAsgQuestions();
  }

  removeEditAsgQuestionRow(idx) {
    if (!this.editAsgQuestions || this.editAsgQuestions.length <= 1) return;
    this.editAsgQuestions.splice(idx, 1);
    this.renderEditAsgQuestions();
  }

  renderEditAsgQuestions() {
    const container = document.getElementById("edit-asg-questions-container");
    if (!container) return;
    container.innerHTML = (this.editAsgQuestions || []).map((q, idx) => `
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); width: 24px;">#${idx + 1}</span>
        <input type="text" class="form-control form-control-sm edit-asg-q-input" value="${q}" style="flex: 1; font-weight: 600;">
        <button type="button" class="btn btn-outline btn-xs" onclick="app.removeEditAsgQuestionRow(${idx})" title="Xóa câu này">🗑️</button>
      </div>
    `).join("");
  }

  collectEditAsgQuestions() {
    const inputs = document.querySelectorAll(".edit-asg-q-input");
    const res = [];
    inputs.forEach(inp => {
      const val = inp.value.trim();
      if (val) res.push(val);
    });
    return res.length > 0 ? res : ["Câu 1", "Câu 2", "Câu 3", "Câu 4"];
  }

  closeEditAssignmentModal() {
    document.getElementById("edit-assignment-modal").style.display = "none";
  }

  async saveEditedAssignment() {
    const id = document.getElementById("edit-asg-id").value;
    const title = document.getElementById("edit-asg-title").value.trim();
    const subject = document.getElementById("edit-asg-subject").value;
    const assigned_date = document.getElementById("edit-asg-assigned").value;
    const due_date = document.getElementById("edit-asg-due").value.replace("T", " ");
    const max_score = parseFloat(document.getElementById("edit-asg-maxscore").value) || 10;
    const notes = document.getElementById("edit-asg-notes").value.trim();
    const questions = this.collectEditAsgQuestions();

    if (!title || !due_date) {
      alert("Vui lòng nhập Tên bài tập và Hạn nộp!");
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/assignments/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, subject, assigned_date, due_date, max_score, notes, questions })
        });
        if (!res.ok) throw new Error("Cập nhật bài tập thất bại trên máy chủ.");
      } else {
        window.ClientDB.updateAssignment(id, title, subject, assigned_date, due_date, max_score, notes, questions);
      }

      alert(`✅ Đã cập nhật bài tập "${title}" thành công!`);
      this.closeEditAssignmentModal();
      await this.loadAssignments();
      this.populateDropdowns();
      this.loadHomeworkList();
      if (this.currentAssignmentId == id) {
        this.loadTrackingMatrix();
      }
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi khi sửa bài tập: " + e.message);
    }
  }

  async deleteAssignment(id) {
    const asg = (this.assignments || []).find(a => a.id == id);
    const title = asg ? asg.title : `Bài tập #${id}`;
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa bài tập "${title}"?\n(Các lượt nộp và điểm của bài này cũng sẽ bị xóa khỏi bảng theo dõi)`)) {
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Xóa bài tập thất bại trên máy chủ.");
      } else {
        window.ClientDB.deleteAssignment(id);
      }

      alert(`✅ Đã xóa bài tập "${title}"!`);
      await this.loadAssignments();
      if (this.assignments.length > 0) {
        if (this.currentAssignmentId == id) {
          this.currentAssignmentId = this.assignments[0].id;
        }
      } else {
        this.currentAssignmentId = null;
      }
      this.populateDropdowns();
      this.loadHomeworkList();
      this.loadTrackingMatrix();
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi khi xóa bài tập: " + e.message);
    }
  }

  // --- STUDENT MANAGEMENT CONTROLLER ---
  switchStudentSubTab(tab) {
    const listTab = document.getElementById("student-subtab-list");
    const profTab = document.getElementById("student-subtab-profile");
    const btnList = document.getElementById("btn-subtab-students-list");
    const btnProf = document.getElementById("btn-subtab-students-profile");

    if (tab === "list") {
      if (listTab) listTab.style.display = "block";
      if (profTab) profTab.style.display = "none";
      if (btnList) btnList.classList.add("active");
      if (btnProf) btnProf.classList.remove("active");
      this.loadStudentsList();
    } else {
      if (listTab) listTab.style.display = "none";
      if (profTab) profTab.style.display = "block";
      if (btnList) btnList.classList.remove("active");
      if (btnProf) btnProf.classList.add("active");
      this.loadStudentProfile();
    }
  }

  loadStudentsList() {
    const list = this.students || [];
    const countEl = document.getElementById("student-roster-count");
    if (countEl) countEl.innerText = list.length;
    this.renderStudentsTable(list);
  }

  setStudentAnimalFilter(tier, el) {
    this.activeStudentAnimalFilter = tier || "ALL";
    document.querySelectorAll(".animal-tier-filter-btn").forEach(btn => btn.classList.remove("active"));
    if (el) el.classList.add("active");
    this.filterStudentsList();
  }

  updateStudentTierCounters() {
    const list = this.students || [];
    const counts = {
      all: list.length,
      dolphin: list.filter(s => s.animal_group === "dolphin").length,
      monkey: list.filter(s => s.animal_group === "monkey").length,
      orange_cat: list.filter(s => (s.animal_group === "orange_cat" || !s.animal_group)).length,
      turtle_snail: list.filter(s => s.animal_group === "turtle_snail").length
    };
    const cAll = document.getElementById("tier-count-all");
    const cDol = document.getElementById("tier-count-dolphin");
    const cMon = document.getElementById("tier-count-monkey");
    const cCat = document.getElementById("tier-count-orange_cat");
    const cTur = document.getElementById("tier-count-turtle_snail");
    if (cAll) cAll.innerText = counts.all;
    if (cDol) cDol.innerText = counts.dolphin;
    if (cMon) cMon.innerText = counts.monkey;
    if (cCat) cCat.innerText = counts.orange_cat;
    if (cTur) cTur.innerText = counts.turtle_snail;
  }

  filterStudentsList() {
    const query = (document.getElementById("student-search-input")?.value || "").toLowerCase().trim();
    const tier = this.activeStudentAnimalFilter || "ALL";
    const list = this.students || [];

    const filtered = list.filter(s => {
      const matchQuery = (s.full_name || "").toLowerCase().includes(query) ||
             (s.code || "").toLowerCase().includes(query) ||
             String(s.order_num || "").includes(query);
      if (!matchQuery) return false;

      if (tier !== "ALL") {
        const sGrp = s.animal_group || "orange_cat";
        if (sGrp !== tier) return false;
      }
      return true;
    });
    this.renderStudentsTable(filtered);
  }

  renderStudentsTable(list) {
    const tbody = document.getElementById("students-management-tbody");
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Không tìm thấy học sinh nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((s, idx) => {
      const grp = s.animal_group || "orange_cat";
      const sym = s.animal_symbol || "🐱";
      const ttl = s.animal_title || "Mèo cam chăm chỉ";
      return `
      <tr>
        <td><strong>${s.order_num || (idx + 1)}</strong></td>
        <td><code>${s.code}</code></td>
        <td><strong>${s.full_name}</strong></td>
        <td>
          <button type="button" class="animal-picker-btn badge-animal badge-animal-${grp}" onclick="app.openAssignAnimalGroupModal(${s.id})" title="Nhấn để đổi nhóm linh vật (Chỉ giáo viên)">
            <span>${sym}</span>
            <span>${ttl}</span>
            <span style="font-size: 10px; opacity: 0.7;">✏️</span>
          </button>
        </td>
        <td>${s.gender === "Nữ" ? '👧 Nữ' : '👦 Nam'}</td>
        <td><span class="badge badge-blue">${s.class_name || "Lớp 3A7"}</span></td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-sm" onclick="app.openAssignAnimalGroupModal(${s.id})" title="Phân loại linh vật cho học sinh (Chỉ giáo viên)">🐾 Nhóm</button>
          <button class="btn btn-outline btn-sm" onclick="app.viewStudentProfileFromList(${s.id})">👤 Hồ Sơ</button>
          <button class="btn btn-outline btn-sm" onclick="app.openEditStudentModal(${s.id})">✏️ Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="app.deleteStudent(${s.id})">🗑️ Xóa</button>
        </td>
      </tr>
      `;
    }).join("");
  }

  openAssignAnimalGroupModal(studentId) {
    const st = (this.students || []).find(s => s.id == studentId);
    if (!st) return;

    const modal = document.getElementById("modal-assign-animal-group");
    if (!modal) return;

    const nameEl = document.getElementById("modal-animal-student-name");
    const codeEl = document.getElementById("modal-animal-student-code");
    const targetEl = document.getElementById("modal-animal-target-id");

    if (nameEl) nameEl.innerText = st.full_name;
    if (codeEl) codeEl.innerText = st.code;
    if (targetEl) targetEl.value = st.id;

    const grp = st.animal_group || "orange_cat";
    const sym = st.animal_symbol || "🐱";
    const ttl = st.animal_title || "Mèo cam chăm chỉ";

    this.selectStudentAnimal(grp, sym, ttl);
    modal.style.display = "flex";
  }

  closeAssignAnimalGroupModal() {
    const modal = document.getElementById("modal-assign-animal-group");
    if (modal) modal.style.display = "none";
  }

  selectStudentAnimal(groupKey, symbol, title) {
    const hidGrp = document.getElementById("modal-animal-selected-group");
    const hidSym = document.getElementById("modal-animal-selected-symbol");
    const hidTtl = document.getElementById("modal-animal-selected-title");
    const badgeEl = document.getElementById("modal-animal-selected-badge");

    if (hidGrp) hidGrp.value = groupKey;
    if (hidSym) hidSym.value = symbol;
    if (hidTtl) hidTtl.value = title;

    if (badgeEl) {
      badgeEl.className = `badge-animal badge-animal-${groupKey}`;
      badgeEl.innerText = `${symbol} ${title}`;
    }

    // Highlight selected chip
    document.querySelectorAll("#modal-assign-animal-group .animal-option-chip").forEach(chip => {
      const cGrp = chip.getAttribute("data-group");
      const cSym = chip.getAttribute("data-symbol");
      if (cGrp === groupKey && cSym === symbol) {
        chip.classList.add("selected");
      } else {
        chip.classList.remove("selected");
      }
    });
  }

  async saveStudentAnimalGroup() {
    const targetEl = document.getElementById("modal-animal-target-id");
    const hidGrp = document.getElementById("modal-animal-selected-group");
    const hidSym = document.getElementById("modal-animal-selected-symbol");
    const hidTtl = document.getElementById("modal-animal-selected-title");

    if (!targetEl || !hidGrp) return;
    const sid = targetEl.value;
    const grp = hidGrp.value;
    const sym = hidSym ? hidSym.value : "🐱";
    const ttl = hidTtl ? hidTtl.value : "Mèo cam chăm chỉ";

    const st = (this.students || []).find(s => s.id == sid);
    if (!st) return;

    try {
      if (this.serverAvailable) {
        await fetch(`/api/students/${sid}/animal-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            animal_group: grp,
            animal_symbol: sym,
            animal_title: ttl
          })
        });
      }

      if (window.ClientDB) {
        window.ClientDB.updateStudentAnimalGroup(sid, grp, sym, ttl);
      }

      st.animal_group = grp;
      st.animal_symbol = sym;
      st.animal_title = ttl;

      this.closeAssignAnimalGroupModal();
      this.updateStudentTierCounters();
      this.filterStudentsList();
      if (this.trackingMatrix && this.trackingMatrix.length > 0) {
        const trRow = this.trackingMatrix.find(r => r.student_id == sid);
        if (trRow) {
          trRow.animal_group = grp;
          trRow.animal_symbol = sym;
          trRow.animal_title = ttl;
        }
        this.filterTrackingTable();
      }

      alert(`✅ Đã xếp "${st.full_name}" vào nhóm: ${sym} ${ttl}!`);
    } catch (e) {
      alert("Lỗi khi lưu nhóm linh vật: " + e.message);
    }
  }

  viewStudentProfileFromList(studentId) {
    this.switchStudentSubTab("profile");
    const sel = document.getElementById("profile-student-select");
    if (sel) {
      sel.value = studentId;
      this.loadStudentProfile();
    }
  }

  openAddStudentModal() {
    document.getElementById("student-modal-title").innerText = "➕ Thêm Học Sinh Mới";
    document.getElementById("student-modal-id").value = "";

    // Calculate next order num and suggest HS code
    const nextOrder = (this.students && this.students.length > 0)
      ? Math.max(...this.students.map(s => s.order_num || 0)) + 1
      : 1;
    const paddedOrder = nextOrder < 10 ? `0${nextOrder}` : `${nextOrder}`;

    document.getElementById("student-modal-code").value = `HS${paddedOrder}`;
    document.getElementById("student-modal-name").value = "";
    document.getElementById("student-modal-gender").value = "Nam";
    document.getElementById("student-modal-ordernum").value = nextOrder;

    document.getElementById("student-modal").style.display = "flex";
  }

  openEditStudentModal(id) {
    const st = (this.students || []).find(s => s.id == id);
    if (!st) return;

    document.getElementById("student-modal-title").innerText = "✏️ Chỉnh Sửa Học Sinh";
    document.getElementById("student-modal-id").value = st.id;
    document.getElementById("student-modal-code").value = st.code || "";
    document.getElementById("student-modal-name").value = st.full_name || "";
    document.getElementById("student-modal-gender").value = st.gender || "Nam";
    document.getElementById("student-modal-ordernum").value = st.order_num || "";

    document.getElementById("student-modal").style.display = "flex";
  }

  closeStudentModal() {
    document.getElementById("student-modal").style.display = "none";
  }

  async saveStudentForm() {
    const id = document.getElementById("student-modal-id").value;
    const code = document.getElementById("student-modal-code").value.trim().toUpperCase();
    const full_name = document.getElementById("student-modal-name").value.trim();
    const gender = document.getElementById("student-modal-gender").value;
    const order_num = parseInt(document.getElementById("student-modal-ordernum").value) || 1;

    if (!code || !full_name) {
      alert("Vui lòng nhập đầy đủ Mã học sinh và Họ tên!");
      return;
    }

    try {
      if (id) {
        // Edit student
        if (this.serverAvailable) {
          const res = await fetch(`/api/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, full_name, gender, order_num })
          });
          if (!res.ok) throw new Error("Cập nhật thông tin học sinh thất bại.");
        } else {
          window.ClientDB.updateStudent(id, code, full_name, gender, order_num);
        }
        alert(`✅ Đã cập nhật học sinh "${full_name}" thành công!`);
      } else {
        // Add student
        if (this.serverAvailable) {
          const res = await fetch(`/api/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, full_name, gender, order_num, class_name: this.settings.class_name || "Lớp 3A7" })
          });
          if (!res.ok) throw new Error("Thêm học sinh mới thất bại.");
        } else {
          window.ClientDB.addStudent(code, full_name, gender, order_num);
        }
        alert(`✅ Đã thêm học sinh "${full_name}" (${code}) thành công!`);
      }

      this.closeStudentModal();
      await this.loadStudents();
      this.populateDropdowns();
      this.renderA4PrintSheet();
      this.renderLoginStudentPicker();
      this.loadStudentsList();
      this.loadTrackingMatrix();
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async deleteStudent(id) {
    const st = (this.students || []).find(s => s.id == id);
    const name = st ? st.full_name : `Học sinh #${id}`;
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa học sinh "${name}"?\n(Các thông tin theo dõi và bài nộp của em sẽ bị xóa)`)) {
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Xóa học sinh thất bại trên máy chủ.");
      } else {
        window.ClientDB.deleteStudent(id);
      }

      alert(`✅ Đã xóa học sinh "${name}"!`);
      await this.loadStudents();
      this.populateDropdowns();
      this.renderA4PrintSheet();
      this.renderLoginStudentPicker();
      this.loadStudentsList();
      this.loadTrackingMatrix();
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi khi xóa học sinh: " + e.message);
    }
  }

  async resetStudentsToDefault() {
    if (!confirm("🔄 Bạn có chắc chắn muốn khôi phục danh sách chuẩn 29 học sinh Lớp 3A7?\n(Các học sinh thêm mới sẽ được khôi phục về danh sách 29 em ban đầu)")) {
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/students/reset", { method: "POST" });
        if (!res.ok) throw new Error("Khôi phục danh sách thất bại.");
      } else {
        window.ClientDB.resetStudentsToDefault();
      }

      alert("✅ Đã khôi phục thành công danh sách 29 học sinh chuẩn của Lớp 3A7!");
      await this.loadStudents();
      this.populateDropdowns();
      this.renderA4PrintSheet();
      this.renderLoginStudentPicker();
      this.loadStudentsList();
      this.loadTrackingMatrix();
      this.loadAnalytics();
    } catch (e) {
      alert("Lỗi khi khôi phục danh sách: " + e.message);
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

  // =====================================================================
  // MODULE: THƯ VIỆN & ĐƯỜNG ĐUA ĐỌC SÁCH 3A7 ("HÀNH TRÌNH ĐỌC SÁCH")
  // =====================================================================

  async loadLibraryData() {
    console.log("Loading library and reading race data...");
    try {
      // 1. Load Stats
      let stats;
      if (this.serverAvailable) {
        try {
          const res = await fetch("/api/library/stats");
          if (res.ok) stats = await res.json();
          else stats = window.ClientDB.getLibraryStats();
        } catch {
          stats = window.ClientDB.getLibraryStats();
        }
      } else {
        stats = window.ClientDB.getLibraryStats();
      }
      this.renderLibraryStats(stats);

      // 2. Load Reading Race
      let race;
      if (this.serverAvailable) {
        try {
          const res = await fetch("/api/race");
          if (res.ok) race = await res.json();
          else race = window.ClientDB.getReadingRace();
        } catch {
          race = window.ClientDB.getReadingRace();
        }
      } else {
        race = window.ClientDB.getReadingRace();
      }
      this.readingRace = race;
      this.renderReadingRace(race);

      // 3. Load Books
      let books;
      if (this.serverAvailable) {
        try {
          const res = await fetch("/api/books");
          if (res.ok) books = await res.json();
          else books = window.ClientDB.getBooks();
        } catch {
          books = window.ClientDB.getBooks();
        }
      } else {
        books = window.ClientDB.getBooks();
      }
      this.books = books;
      this.renderBooksCatalog(books);

      // 4. Load Active Loans
      let loans;
      if (this.serverAvailable) {
        try {
          const res = await fetch("/api/loans");
          if (res.ok) loans = await res.json();
          else loans = window.ClientDB.getActiveLoans();
        } catch {
          loans = window.ClientDB.getActiveLoans();
        }
      } else {
        loans = window.ClientDB.getActiveLoans();
      }
      this.activeLoans = loans;
      this.renderActiveLoans(loans);

      // 5. Populate dropdowns for borrowing
      this.populateLibraryDropdowns();

      // Enforce teacher-only borrow & return tabs (Req 8)
      const isTeacher = this.currentUserRole === "teacher";
      const borrowTabBtn = document.getElementById("btn-lib-tab-borrow");
      const returnTabBtn = document.getElementById("btn-lib-tab-return");
      if (borrowTabBtn) borrowTabBtn.style.display = isTeacher ? "inline-flex" : "none";
      if (returnTabBtn) returnTabBtn.style.display = isTeacher ? "inline-flex" : "none";

      if (!isTeacher && (this.currentLibSubTab === "borrow" || this.currentLibSubTab === "return")) {
        this.switchLibSubTab("race");
      }

    } catch (e) {
      console.error("Error loading library data:", e);
    }
  }

  renderLibraryStats(stats) {
    if (!stats) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val !== undefined && val !== null ? val : 0;
    };
    setVal("lib-stat-total-books", stats.totalBooks || 75);
    setVal("lib-stat-borrowed-books", stats.borrowedCount || 0);
    setVal("lib-stat-readers", stats.readersCount || 29);
    setVal("lib-stat-overdue-books", stats.overdueCount || 0);

    // Also render stats sub-pane cards
    const catBox = document.getElementById("lib-stats-categories");
    if (catBox && stats.categories) {
      catBox.innerHTML = Object.entries(stats.categories).map(([cat, count]) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <span style="font-weight: 700; color: #334155;">📖 ${cat}</span>
          <span class="badge badge-blue" style="font-size: 13px; font-weight: 800;">${count} cuốn</span>
        </div>
      `).join("");
    }
  }

  onRaceSearch(query) {
    this.raceSearchQuery = (query || "").trim().toLowerCase();
    this.applyRaceFilters();
  }

  filterRaceList(filterType, btnElement) {
    this.raceFilterType = filterType || "all";
    document.querySelectorAll(".race-filter-pill").forEach(p => p.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");
    this.applyRaceFilters();
  }

  applyRaceFilters() {
    if (!this.readingRace) return;
    let list = this.readingRace;
    if (this.raceFilterType === "top3") {
      list = list.filter(st => (Number(st.rank) || 99) <= 3 && (Number(st.completed) || 0) > 0);
    } else if (this.raceFilterType === "milestone15") {
      list = list.filter(st => (Number(st.completed) || 0) >= 15);
    } else if (this.raceFilterType === "finished") {
      list = list.filter(st => (Number(st.completed) || 0) >= 33);
    }

    if (this.raceSearchQuery) {
      const q = this.raceSearchQuery;
      list = list.filter(st => 
        (st.name || "").toLowerCase().includes(q) ||
        (st.code || "").toLowerCase().includes(q)
      );
    }

    this.renderReadingRaceRows(list);
  }

  renderReadingRace(raceList) {
    this.readingRace = raceList || [];
    this.applyRaceFilters();

    // Also update Top 5 readers on stats tab
    const topReadersBox = document.getElementById("lib-stats-top-readers");
    if (topReadersBox && this.readingRace.length > 0) {
      const top5 = this.readingRace.slice(0, 5);
      topReadersBox.innerHTML = top5.map((r, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${idx === 0 ? '#fef3c7' : '#f8fafc'}; border: 1px solid ${idx === 0 ? '#fde68a' : '#e2e8f0'}; border-radius: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
            <span style="font-size: 22px;">${r.avatar || '🐶'}</span>
            <div>
              <div style="font-weight: 800; color: #1e293b;">${r.name}</div>
              <div style="font-size: 11px; color: #64748b;">${r.code}</div>
            </div>
          </div>
          <span class="badge badge-green" style="font-size: 14px; font-weight: 900;">${r.completed} / 33 quyển</span>
        </div>
      `).join("");
    }
  }

  renderReadingRaceRows(raceList) {
    const tbody = document.getElementById("lib-race-tbody");
    if (!tbody) return;
    if (!raceList || raceList.length === 0) {
      tbody.innerHTML = "<div style='padding: 32px 16px; text-align: center; color: #94a3b8; font-weight: 700;'>Không tìm thấy độc giả nào phù hợp với bộ lọc</div>";
      return;
    }

    const isTeacher = this.currentUserRole === "teacher" || (!this.currentUserRole && this.currentViewMode !== "public");

    // Header teacher controls column visibility
    const ctrlHeader = document.getElementById("lib-race-header-ctrl");
    if (ctrlHeader) {
      ctrlHeader.style.display = isTeacher ? "block" : "none";
    }

    tbody.innerHTML = raceList.map((st) => {
      const completed = Number(st.completed) || 0;
      const pct = Math.min(100, Math.round((completed / 33) * 1000) / 10);
      const rank = st.rank || 1;

      let rankDisplay = "";
      let rowRankClass = "";
      if (rank === 1 && completed > 0) {
        rankDisplay = `<span class="rank-medal-icon" title="Hạng 1 - Huy chương Vàng">🥇</span>`;
        rowRankClass = "rank-1";
      } else if (rank === 2 && completed > 0) {
        rankDisplay = `<span class="rank-medal-icon" title="Hạng 2 - Huy chương Bạc">🥈</span>`;
        rowRankClass = "rank-2";
      } else if (rank === 3 && completed > 0) {
        rankDisplay = `<span class="rank-medal-icon" title="Hạng 3 - Huy chương Đồng">🥉</span>`;
        rowRankClass = "rank-3";
      } else {
        rankDisplay = `<div class="rank-badge">${rank}</div>`;
      }

      let subProgressText = "";
      if (completed > 33) {
        subProgressText = `<div class="race-progress-sub" style="color: #d97706; font-weight: 800;">+${completed - 33} vượt đích!</div>`;
      } else if (completed === 33) {
        subProgressText = `<div class="race-progress-sub" style="color: #059669; font-weight: 800;">🏁 Về đích!</div>`;
      } else {
        subProgressText = `<div class="race-progress-sub" style="color: #94a3b8;">còn ${33 - completed}</div>`;
      }

      const avatar = st.avatar || "🐶";
      const petBtn = isTeacher 
        ? `<button type="button" class="race-pet-avatar" onclick="app.openPetAvatarModal(${st.student_id})" title="Bấm để đổi thú cưng">${avatar}</button>`
        : `<span class="race-pet-avatar" style="cursor: default;">${avatar}</span>`;

      const controls = isTeacher ? `
        <div class="race-controls-cell">
          <button type="button" class="btn-race-step dec" onclick="app.updateStudentReadingRace(${st.student_id}, -1)" ${completed <= 0 ? 'disabled' : ''} title="Hoàn tác 1 ô">
            <span>↩️</span> -1 ô
          </button>
          <button type="button" class="btn-race-step inc" onclick="app.updateStudentReadingRace(${st.student_id}, 1)" title="Đã đọc xong thêm 1 quyển">
            <span>📖</span> + 1 ô ĐÃ ĐỌC
          </button>
        </div>
      ` : "";

      return `
        <div class="race-grid-row race-student-row ${rowRankClass}">
          <div class="race-col-rank">${rankDisplay}</div>
          <div class="race-reader-info">
            ${petBtn}
            <div class="race-reader-names">
              <div class="race-reader-name">${st.name}</div>
              <div class="race-reader-meta">
                <span class="race-reader-code">${st.code}</span>
                <span class="race-rank-mobile">Hạng ${rank}</span>
              </div>
            </div>
          </div>
          <div class="race-track-cell">
            <div class="race-track-milestones-mobile">
              <span class="rt-m rt-0">0</span>
              <span class="rt-m rt-11">11</span>
              <span class="rt-m rt-15" title="Mốc Tháng 12 (15 cuốn)">🎯 15 (T12)</span>
              <span class="rt-m rt-22">22</span>
              <span class="rt-m rt-33" title="Về Đích Tháng 4 (33 cuốn)">33 🏁 (T4)</span>
            </div>
            <div class="race-track-bar-container">
              <div class="race-track-bg">
                <div class="race-track-fill" style="width: ${pct}%;"></div>
              </div>
              <div class="milestone-pin-11" title="Mốc 11 quyển"></div>
              <div class="milestone-pin-15" title="Mốc 15 quyển (Hết tháng 12)"></div>
              <div class="milestone-pin-22" title="Mốc 22 quyển"></div>
              <div class="race-runner-marker" style="left: ${pct}%;" title="${st.name}: ${completed}/33 quyển">
                ${completed > 0 ? avatar : '🐾'}
              </div>
            </div>
          </div>
          <div class="race-progress-text">
            <div class="race-progress-main">${completed}/33 <span class="race-progress-unit">cuốn</span></div>
            ${subProgressText}
          </div>
          ${controls}
        </div>
      `;
    }).join("");
  }

  async updateStudentReadingRace(studentId, delta) {
    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/race/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: studentId, delta: delta })
        });
        if (res.ok) {
          this.readingRace = await res.json();
        } else {
          this.readingRace = window.ClientDB.updateReadingRace(studentId, delta);
        }
      } else {
        this.readingRace = window.ClientDB.updateReadingRace(studentId, delta);
      }

      // Audio feedback
      try {
        const audio = new QRCameraScanner(document.createElement("video"), () => {});
        audio.playSuccessBeep();
      } catch (err) {}

      this.renderReadingRace(this.readingRace);

      // Update stats
      this.renderLibraryStats(window.ClientDB ? window.ClientDB.getLibraryStats() : null);

      const st = this.readingRace.find(r => r.student_id == studentId);
      const studentName = st ? st.name : "Học sinh";
      console.log(`[Reading Race]: Updated ${studentName} (${delta > 0 ? '+' : ''}${delta})`);
    } catch (e) {
      alert("Lỗi khi cập nhật đường đua: " + e.message);
    }
  }

  switchLibSubTab(tab) {
    const isTeacher = this.currentUserRole === "teacher";
    if (!isTeacher && (tab === "borrow" || tab === "return")) {
      tab = "race";
    }

    this.currentLibSubTab = tab;
    document.querySelectorAll(".nav-tab-3d").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".lib-sub-pane").forEach(pane => pane.classList.remove("active"));

    const targetBtn = document.querySelector(`.nav-tab-3d.nav-tab-${tab}`);
    if (targetBtn) targetBtn.classList.add("active");

    const targetPane = document.getElementById(`lib-sub-${tab}`);
    if (targetPane) targetPane.classList.add("active");

    if (tab === "catalog") {
      this.renderBooksCatalog(this.books);
    } else if (tab === "borrow") {
      this.populateLibraryDropdowns();
      this.renderActiveLoans(this.activeLoans);
    } else if (tab === "return") {
      this.renderReturnLoans(this.activeLoans);
    } else if (tab === "race") {
      this.renderReadingRace(this.readingRace);
    }
  }

  populateLibraryDropdowns() {
    // 1. Students dropdown
    const stSelect = document.getElementById("lib-borrow-student-select");
    const jrSelect = document.getElementById("jr-student-select");
    if (stSelect) {
      const cur = stSelect.value;
      stSelect.innerHTML = `<option value="">-- Chọn tên trong danh sách 29 bạn --</option>` +
        this.students.map(s => `<option value="${s.id}">${s.order_num}. ${s.full_name} (${s.code})</option>`).join("");
      if (cur) stSelect.value = cur;
    }
    if (jrSelect) {
      jrSelect.innerHTML = this.students.map(s => `<option value="${s.id}">${s.order_num}. ${s.full_name} (${s.code})</option>`).join("");
    }

    // 2. Books dropdown (available books)
    const bkSelect = document.getElementById("lib-borrow-book-select");
    if (bkSelect) {
      const avail = this.books.filter(b => b.status === "available");
      bkSelect.innerHTML = `<option value="">-- Chọn cuốn sách cần mượn (${avail.length} cuốn sẵn sàng) --</option>` +
        avail.map(b => `<option value="${b.id}">[${b.code || ('STT ' + b.stt)}] ${b.title} (${b.category || 'Sách'})</option>`).join("");
    }
  }

  onLibBorrowStudentChange() {
    const sel = document.getElementById("lib-borrow-student-select");
    const badge = document.getElementById("lib-borrow-student-selected");
    const nameEl = document.getElementById("lib-borrow-student-name");
    if (!sel || !badge || !nameEl) return;
    if (sel.value) {
      const st = this.students.find(s => s.id == sel.value);
      if (st) {
        nameEl.innerText = `Đã chọn: ${st.order_num}. ${st.full_name} (${st.code})`;
        badge.style.display = "flex";
      }
    } else {
      badge.style.display = "none";
    }
  }

  onLibBorrowBookChange() {
    // Hook for book selection if needed
  }

  async confirmBorrowBook() {
    const stSelect = document.getElementById("lib-borrow-student-select");
    const bkSelect = document.getElementById("lib-borrow-book-select");
    const daysSelect = document.getElementById("lib-borrow-days");
    const notesInput = document.getElementById("lib-borrow-notes");

    if (!stSelect.value) {
      alert("Vui lòng chọn học sinh ở Bước 1!");
      return;
    }
    if (!bkSelect.value) {
      alert("Vui lòng chọn hoặc quét cuốn sách ở Bước 2!");
      return;
    }

    const studentId = parseInt(stSelect.value);
    const bookId = parseInt(bkSelect.value);
    const days = parseInt(daysSelect ? daysSelect.value : 14);
    const notes = notesInput ? notesInput.value.trim() : "";

    try {
      let loan;
      if (this.serverAvailable) {
        const res = await fetch("/api/loans/borrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            book_id: bookId,
            due_days: days,
            notes: notes
          })
        });
        if (res.ok) loan = await res.json();
        else {
          const err = await res.json();
          throw new Error(err.error || "Không thể cho mượn sách");
        }
      } else {
        loan = window.ClientDB.borrowBook(studentId, bookId, days, notes);
      }

      // Success! Play sound
      try {
        const audio = new QRCameraScanner(document.createElement("video"), () => {});
        audio.playSuccessBeep();
      } catch (err) {}

      alert(`✅ Cho mượn sách thành công!\n\n📖 Sách: ${loan.book_title}\n🎒 Học sinh: ${loan.student_name}\n⏰ Hạn trả: ${loan.due_date.substring(0, 10)}`);

      // Reset form
      if (bkSelect) bkSelect.value = "";
      if (notesInput) notesInput.value = "";

      // Reload
      await this.loadLibraryData();
    } catch (e) {
      alert("❌ Lỗi: " + e.message);
    }
  }

  renderActiveLoans(loans) {
    const container = document.getElementById("lib-active-loans-list");
    const countEl = document.getElementById("lib-active-loans-count");
    if (countEl) countEl.innerText = loans ? loans.length : 0;
    if (!container) return;

    if (!loans || loans.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 32px 16px; color: #94a3b8; font-weight: 600;">Hiện không có sách nào đang được mượn. Toàn bộ sách đã ở trên kệ!</div>`;
      return;
    }

    container.innerHTML = loans.map(l => {
      const isOverdue = l.is_overdue || (l.due_date && l.due_date < new Date().toISOString().substring(0, 19));
      return `
        <div style="background: ${isOverdue ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${isOverdue ? '#fecdd3' : '#e2e8f0'}; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              [${l.book_code || ('STT ' + l.book_stt)}] ${l.book_title}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Người mượn: <strong style="color: #0369a1;">${l.student_name} (${l.student_code})</strong>
            </div>
            <div style="font-size: 11px; color: ${isOverdue ? '#e11d48' : '#059669'}; font-weight: 700; margin-top: 2px;">
              ${isOverdue ? '⚠️ Quá hạn trả!' : 'Hạn trả:'} ${l.due_date ? l.due_date.substring(0, 10) : ''} (Mượn: ${l.borrow_date ? l.borrow_date.substring(0, 10) : ''})
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" style="font-weight: 800; white-space: nowrap; color: #d97706; border-color: #fde68a;" onclick="app.quickReturnBook('${l.book_code || l.book_id}')">
            ↩️ Trả Sách
          </button>
        </div>
      `;
    }).join("");
  }

  renderReturnLoans(loans) {
    const list = document.getElementById("lib-return-loans-list");
    if (!list) return;
    if (!loans || loans.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 20px; color: #94a3b8;">Không có sách nào đang được mượn cần trả.</div>`;
      return;
    }
    list.innerHTML = loans.map(l => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
        <div>
          <div style="font-weight: 800; color: #1e293b; font-size: 13px;">[${l.book_code || ('STT ' + l.book_stt)}] ${l.book_title}</div>
          <div style="font-size: 11px; color: #64748b;">Mượn bởi: <strong>${l.student_name}</strong> • Hạn: ${l.due_date ? l.due_date.substring(0, 10) : ''}</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="font-weight: 800; background: #d97706; border-color: #b45309;" onclick="app.quickReturnBook('${l.book_code || l.book_id}')">
          ↩️ Trả Sách Ngay
        </button>
      </div>
    `).join("");
  }

  async quickReturnBook(bookIdOrCode) {
    try {
      let ret;
      if (this.serverAvailable) {
        const res = await fetch("/api/loans/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ book_id: bookIdOrCode })
        });
        if (res.ok) ret = await res.json();
        else {
          const err = await res.json();
          throw new Error(err.error || "Không thể trả sách");
        }
      } else {
        ret = window.ClientDB.returnBook(bookIdOrCode);
      }

      // Audio chime
      try {
        const audio = new QRCameraScanner(document.createElement("video"), () => {});
        audio.playSuccessBeep();
      } catch (err) {}

      // Prompt to increment reading race
      let msg = `✅ Trả sách thành công!\n\n📖 Cuốn sách: ${ret.book_title} đã được đưa về kệ thư viện.`;
      if (ret.student_id && ret.student_name !== "Chưa rõ") {
        const wantAdd = confirm(`${msg}\n\n🌟 Bạn có muốn CỘNG +1 Ô vào Đường đua 33 quyển sách cho bạn ${ret.student_name} không?`);
        if (wantAdd) {
          await this.updateStudentReadingRace(ret.student_id, 1);
        }
      } else {
        alert(msg);
      }

      await this.loadLibraryData();
    } catch (e) {
      alert("❌ Lỗi: " + e.message);
    }
  }

  manualReturnBook() {
    const input = document.getElementById("lib-manual-return-code");
    if (!input || !input.value.trim()) {
      alert("Vui lòng nhập Mã sách (ví dụ: SACH001) hoặc STT sách (1..75)!");
      return;
    }
    const val = input.value.trim();
    this.quickReturnBook(val);
    input.value = "";
  }

  renderBooksCatalog(booksList) {
    const container = document.getElementById("lib-catalog-books-list");
    if (!container) return;
    if (!booksList || booksList.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 40px; color: #94a3b8; font-weight: 700;">Không tìm thấy cuốn sách nào khớp với tìm kiếm.</div>`;
      return;
    }

    const isTeacher = this.currentUserRole === "teacher";

    container.innerHTML = booksList.map(b => {
      const isAvailable = b.status === "available";
      const teacherActions = isTeacher ? `
        <button type="button" class="btn btn-outline btn-sm" onclick="app.openEditBookModal(${b.id})" title="Chỉnh sửa thông tin sách" style="font-weight: 700;">
          ✏️ Sửa
        </button>
        ${isAvailable ? `
          <button type="button" class="btn btn-primary btn-sm" onclick="app.directBorrowBookModal(${b.id})" title="Cho mượn cuốn này">
            📖 Mượn
          </button>
        ` : `
          <button type="button" class="btn btn-outline btn-sm" style="color: #d97706; border-color: #fde68a;" onclick="app.quickReturnBook('${b.code || b.id}')" title="Trả cuốn này">
            ↩️ Trả
          </button>
        `}
      ` : "";

      return `
        <div class="book-card-item">
          <div class="book-stt-badge">
            <span class="book-stt-label">STT</span>
            <span class="book-stt-num">${b.stt}</span>
          </div>
          <div class="book-meta-main">
            <h4 class="book-meta-title">${b.title}</h4>
            <div class="book-meta-author">
              Tác giả: <strong>${b.author || 'Chưa ghi tác giả'}</strong> • 
              <span class="badge badge-blue" style="font-size: 11px;">${b.category}</span>
              ${b.shelf_code ? ` • Kệ <strong>${b.shelf_code}</strong>` : ''}
            </div>
            <div class="book-meta-contrib">
              Đóng góp bởi: <strong>${b.contributed_by || 'Thư viện lớp'}</strong> • 
              Tình trạng: <span style="color: #059669; font-weight: 800;">${b.condition || 'Tốt'}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <span class="book-status-tag ${isAvailable ? 'available' : 'borrowed'}">
              ${isAvailable ? '● Sẵn sàng' : '● Đang mượn'}
            </span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
              <button type="button" class="btn btn-outline btn-sm" onclick="app.openBookQrModal(${b.id})" title="Xem mã QR">
                🏷️ Mã QR
              </button>
              ${teacherActions}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  onCatalogSearch(query) {
    this.catalogSearchQuery = query.trim().toLowerCase();
    this.applyCatalogFilters();
  }

  filterCatalogCategory(category, btnElement) {
    this.catalogCategoryFilter = category;
    document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");
    this.applyCatalogFilters();
  }

  applyCatalogFilters() {
    let filtered = this.books;
    if (this.catalogCategoryFilter && this.catalogCategoryFilter !== "all") {
      filtered = filtered.filter(b => b.category === this.catalogCategoryFilter);
    }
    if (this.catalogSearchQuery) {
      const q = this.catalogSearchQuery;
      filtered = filtered.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.contributed_by && b.contributed_by.toLowerCase().includes(q)) ||
        (b.code && b.code.toLowerCase().includes(q)) ||
        (String(b.stt) === q)
      );
    }
    this.renderBooksCatalog(filtered);
  }

  directBorrowBookModal(bookId) {
    this.switchLibSubTab("borrow");
    const bkSelect = document.getElementById("lib-borrow-book-select");
    if (bkSelect) bkSelect.value = bookId;
  }

  // --- Library QR Scanner Modal ---
  openLibScanner(target) {
    this.libScanTarget = target;
    const modal = document.getElementById("modal-lib-scan");
    const titleEl = document.getElementById("lib-scan-modal-title");
    const descEl = document.getElementById("lib-scan-modal-desc");
    if (!modal) return;

    if (target === "student") {
      titleEl.innerText = "📷 Quét Thẻ QR Học Sinh (HS01..HS29)";
      descEl.innerText = "Đưa mã QR trên thẻ học sinh trước camera để nhận diện.";
    } else if (target === "bookBorrow") {
      titleEl.innerText = "📷 Quét Mã QR Trên Sách Để Mượn";
      descEl.innerText = "Đưa mã QR dán trên gáy hoặc bìa sách (SACH001..SACH075 hoặc STT) vào trước camera.";
    } else if (target === "bookReturn") {
      titleEl.innerText = "📷 Quét Mã QR Trên Sách Để Trả Sách";
      descEl.innerText = "Đưa mã QR trên cuốn sách vào camera để trả nhanh.";
    } else if (target === "journal") {
      titleEl.innerText = "📷 Quét Thẻ Học Sinh Duyệt Sổ Đọc";
      descEl.innerText = "Đưa mã thẻ của học sinh vào camera để duyệt đúc kết đọc sách.";
    }

    modal.style.display = "flex";
    this.startLibCamera();
  }

  async startLibCamera() {
    const video = document.getElementById("lib-scan-video");
    if (!video) return;
    if (!this.libScanner) {
      this.libScanner = new QRCameraScanner(video, (code) => this.handleLibScan(code), {
        facingMode: this.cameraFacing
      });
    }
    try {
      await this.libScanner.start();
    } catch (e) {
      alert("Không thể mở camera: " + e.message);
    }
  }

  switchLibCameraFacing() {
    this.cameraFacing = this.cameraFacing === "environment" ? "user" : "environment";
    if (this.libScanner) {
      this.libScanner.stop();
      this.libScanner = null;
      this.startLibCamera();
    }
  }

  closeLibScanner() {
    if (this.libScanner) {
      this.libScanner.stop();
      this.libScanner = null;
    }
    const modal = document.getElementById("modal-lib-scan");
    if (modal) modal.style.display = "none";
  }

  handleLibScan(code) {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    console.log(`[Lib Scanner]: Scanned ${clean} for target ${this.libScanTarget}`);

    if (this.libScanTarget === "student") {
      const match = clean.match(/HS\d+/i);
      const studentCode = match ? match[0].toUpperCase() : clean;
      const st = this.students.find(s => s.code.toUpperCase() === studentCode);
      if (st) {
        if (this.libScanner) this.libScanner.playSuccessBeep();
        const sel = document.getElementById("lib-borrow-student-select");
        if (sel) sel.value = st.id;
        this.onLibBorrowStudentChange();
        this.closeLibScanner();
      } else {
        if (this.libScanner) this.libScanner.playErrorBeep();
        alert(`❌ Không tìm thấy học sinh với mã "${studentCode}" trong Lớp 3A7!`);
      }
    } else if (this.libScanTarget === "bookBorrow") {
      const book = this.books.find(b => 
        (b.code && b.code.toUpperCase() === clean) || 
        String(b.stt) === clean ||
        clean.includes(b.code)
      );
      if (book) {
        if (book.status === "borrowed") {
          if (this.libScanner) this.libScanner.playErrorBeep();
          alert(`⚠️ Cuốn sách "${book.title}" hiện đang được mượn, chưa trả về thư viện!`);
          return;
        }
        if (this.libScanner) this.libScanner.playSuccessBeep();
        const sel = document.getElementById("lib-borrow-book-select");
        if (sel) sel.value = book.id;
        this.closeLibScanner();
      } else {
        if (this.libScanner) this.libScanner.playErrorBeep();
        alert(`❌ Không tìm thấy sách với mã "${clean}" trong thư viện 75 cuốn!`);
      }
    } else if (this.libScanTarget === "bookReturn") {
      this.closeLibScanner();
      this.quickReturnBook(clean);
    } else if (this.libScanTarget === "journal") {
      const match = clean.match(/HS\d+/i);
      const studentCode = match ? match[0].toUpperCase() : clean;
      const st = this.students.find(s => s.code.toUpperCase() === studentCode);
      this.closeLibScanner();
      if (st) {
        this.openJournalReviewModal(st.id);
      } else {
        alert(`❌ Không tìm thấy học sinh với mã "${studentCode}"!`);
      }
    }
  }

  // --- Pet Avatar Selector Modal ---
  openPetAvatarModal(studentId) {
    this.selectedPetStudent = studentId;
    const modal = document.getElementById("modal-pet-avatar");
    const nameEl = document.getElementById("pet-avatar-student-name");
    const grid = document.getElementById("pet-avatar-grid");
    if (!modal || !grid) return;

    const st = this.students.find(s => s.id == studentId) || (this.readingRace ? this.readingRace.find(r => r.student_id == studentId) : null);
    if (nameEl) nameEl.innerText = st ? (st.full_name || st.name) : "Học sinh";

    const pets = ['🐶', '🐱', '🦊', '🐰', '🐼', '🦁', '🐯', '🐨', '🦄', '🐸',
                  '🐵', '🐻', '🐧', '🐤', '🦉', '🐺', '🐗', '🐴', '🐝', '🐙',
                  '🦋', '🐢', '🐬', '🐳', '🦖', '🦔', '🐿️', '🦩', '🦚', '🐮'];

    grid.innerHTML = pets.map(p => `
      <button type="button" class="btn btn-outline" style="font-size: 26px; height: 56px; border-radius: 16px; padding: 0; display: grid; place-items: center;" onclick="app.selectPetAvatar('${p}')">
        ${p}
      </button>
    `).join("");

    modal.style.display = "flex";
  }

  closePetAvatarModal() {
    const modal = document.getElementById("modal-pet-avatar");
    if (modal) modal.style.display = "none";
    this.selectedPetStudent = null;
  }

  async selectPetAvatar(emoji) {
    if (!this.selectedPetStudent) return;
    const sid = this.selectedPetStudent;
    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/race/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: sid, delta: 0, avatar: emoji })
        });
        if (res.ok) this.readingRace = await res.json();
        else this.readingRace = window.ClientDB.updateReadingRace(sid, 0, null, emoji);
      } else {
        this.readingRace = window.ClientDB.updateReadingRace(sid, 0, null, emoji);
      }
      this.renderReadingRace(this.readingRace);
      this.closePetAvatarModal();

      if (this.currentUserRole === "student" && this.currentStudent && this.currentStudent.id == sid) {
        await this.renderStudentPortal(this.currentStudent);
      }
    } catch (e) {
      alert("Lỗi khi lưu avatar: " + e.message);
    }
  }

  // --- Journal Review (Quét sổ – duyệt đúc kết) ---
  openJournalReviewScanner() {
    this.openLibScanner("journal");
  }

  openJournalReviewModal(studentId) {
    const modal = document.getElementById("modal-journal-review");
    const sel = document.getElementById("jr-student-select");
    const titleInput = document.getElementById("jr-book-title");
    const notesInput = document.getElementById("jr-review-notes");
    if (!modal) return;
    if (sel && studentId) sel.value = studentId;
    if (titleInput) titleInput.value = "";
    if (notesInput) notesInput.value = "";
    modal.style.display = "flex";
  }

  closeJournalReviewModal() {
    const modal = document.getElementById("modal-journal-review");
    if (modal) modal.style.display = "none";
  }

  async confirmJournalReview() {
    const sel = document.getElementById("jr-student-select");
    const titleInput = document.getElementById("jr-book-title");
    const notesInput = document.getElementById("jr-review-notes");

    if (!sel || !sel.value) {
      alert("Vui lòng chọn học sinh!");
      return;
    }
    const sid = parseInt(sel.value);
    const bookTitle = titleInput ? titleInput.value.trim() : "";
    const notes = notesInput ? notesInput.value.trim() : "";

    await this.updateStudentReadingRace(sid, 1);
    this.closeJournalReviewModal();

    const st = this.students.find(s => s.id == sid);
    const stName = st ? st.full_name : "Học sinh";
    alert(`🎉 Đã duyệt sổ đọc sách thành công!\n\n🎒 Học sinh: ${stName}\n📖 Cuốn sách: ${bookTitle || '1 cuốn sách'}\n🌟 Đã cộng +1 ô trên Đường đua 33 quyển sách!`);
  }

  // --- Add New Book Modal ---
  openNewBookModal() {
    const modal = document.getElementById("modal-new-book");
    if (!modal) return;
    document.getElementById("nb-title").value = "";
    document.getElementById("nb-author").value = "";
    document.getElementById("nb-category").value = "Truyện hay";
    document.getElementById("nb-shelf").value = "K1";
    document.getElementById("nb-contrib").value = "Cô Linh";
    document.getElementById("nb-condition").value = "Tốt";
    modal.style.display = "flex";
  }

  closeNewBookModal() {
    const modal = document.getElementById("modal-new-book");
    if (modal) modal.style.display = "none";
  }

  async saveNewBook() {
    const title = document.getElementById("nb-title").value.trim();
    const author = document.getElementById("nb-author").value.trim();
    const category = document.getElementById("nb-category").value;
    const shelf = document.getElementById("nb-shelf").value.trim();
    const contrib = document.getElementById("nb-contrib").value.trim();
    const condition = document.getElementById("nb-condition").value;

    if (!title) {
      alert("Vui lòng nhập tên cuốn sách!");
      return;
    }

    const payload = {
      title,
      author,
      category,
      shelf_code: shelf || "K1",
      contributed_by: contrib || "Thư viện lớp",
      condition: condition || "Tốt"
    };

    try {
      if (this.serverAvailable) {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Không thể thêm sách");
      } else {
        window.ClientDB.addBook(payload);
      }
      this.closeNewBookModal();
      alert(`✅ Đã thêm cuốn sách "${title}" vào thư viện thành công!`);
      await this.loadLibraryData();
    } catch (e) {
      alert("Lỗi khi thêm sách: " + e.message);
    }
  }

  resetBooksCatalogToSeed() {
    if (!confirm("Bạn có chắc chắn muốn đặt lại kho sách về 75 cuốn sách gốc ban đầu không?")) return;
    if (window.ClientDB) {
      window.ClientDB.resetBooksToDefault();
    }
    alert("✅ Đã khôi phục 75 cuốn sách gốc thành công!");
    this.loadLibraryData();
  }

  // --- Book Editing (Req 9) ---
  openEditBookModal(bookId) {
    const book = this.books.find(b => b.id == bookId);
    if (!book) return;
    const modal = document.getElementById("modal-edit-book");
    if (!modal) return;

    document.getElementById("eb-id").value = book.id;
    document.getElementById("eb-code-display").innerText = book.code || `SACH${String(book.stt).padStart(3, '0')}`;
    document.getElementById("eb-stt-display").innerText = book.stt || book.id;
    document.getElementById("eb-title").value = book.title || "";
    document.getElementById("eb-author").value = book.author || "";
    document.getElementById("eb-category").value = book.category || "Truyện hay";
    document.getElementById("eb-shelf").value = book.shelf_code || "K1";
    document.getElementById("eb-contrib").value = book.contributed_by || "Thư viện lớp";
    document.getElementById("eb-condition").value = book.condition || "Tốt";
    document.getElementById("eb-status").value = book.status || "available";

    modal.style.display = "flex";
  }

  closeEditBookModal() {
    const modal = document.getElementById("modal-edit-book");
    if (modal) modal.style.display = "none";
  }

  async saveEditedBook() {
    const id = document.getElementById("eb-id").value;
    const title = document.getElementById("eb-title").value.trim();
    const author = document.getElementById("eb-author").value.trim();
    const category = document.getElementById("eb-category").value;
    const shelf = document.getElementById("eb-shelf").value.trim();
    const contrib = document.getElementById("eb-contrib").value.trim();
    const condition = document.getElementById("eb-condition").value;
    const status = document.getElementById("eb-status").value;

    if (!title) {
      alert("Vui lòng nhập tên cuốn sách!");
      return;
    }

    const payload = {
      id: Number(id),
      title,
      author,
      category,
      shelf_code: shelf || "K1",
      contributed_by: contrib || "Thư viện lớp",
      condition: condition || "Tốt",
      status
    };

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/books/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Cập nhật sách thất bại trên máy chủ.");
      } else {
        window.ClientDB.updateBook(id, payload);
      }
      this.closeEditBookModal();
      alert(`✅ Đã lưu thay đổi cho cuốn sách "${title}"!`);
      await this.loadLibraryData();
    } catch (e) {
      alert("Lỗi khi lưu sách: " + e.message);
    }
  }

  async deleteCurrentBook() {
    const id = document.getElementById("eb-id").value;
    const book = this.books.find(b => b.id == id);
    const title = book ? book.title : "cuốn sách này";

    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa cuốn sách "${title}" khỏi kho thư viện không?`)) {
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/books/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error("Xóa sách thất bại trên máy chủ.");
      } else {
        window.ClientDB.deleteBook(id);
      }
      this.closeEditBookModal();
      alert(`✅ Đã xóa cuốn sách "${title}" thành công!`);
      await this.loadLibraryData();
    } catch (e) {
      alert("Lỗi khi xóa sách: " + e.message);
    }
  }

  // --- Excel Book Import (Req 9) ---
  openImportExcelModal() {
    const modal = document.getElementById("modal-import-excel-books");
    if (!modal) return;
    this._stagedExcelData = null;
    const fileInp = document.getElementById("excel-file-input");
    if (fileInp) fileInp.value = "";
    const preview = document.getElementById("excel-import-preview");
    if (preview) preview.style.display = "none";
    const btn = document.getElementById("btn-execute-excel-import");
    if (btn) btn.disabled = true;

    modal.style.display = "flex";
  }

  closeImportExcelModal() {
    const modal = document.getElementById("modal-import-excel-books");
    if (modal) modal.style.display = "none";
    this._stagedExcelData = null;
  }

  async handleExcelFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const btn = document.getElementById("btn-execute-excel-import");
    const preview = document.getElementById("excel-import-preview");
    const pName = document.getElementById("excel-preview-file-name");
    const pCount = document.getElementById("excel-preview-count");
    const pSample = document.getElementById("excel-preview-sample");

    pName.innerText = `${file.name} (${Math.round(file.size / 1024)} KB)`;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      let parsedRows = [];
      if (window.XLSX) {
        try {
          const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          let headerIdx = -1;
          const colMap = {};
          for (let i = 0; i < Math.min(6, rawJson.length); i++) {
            const row = rawJson[i] || [];
            const joined = row.join(" ").toLowerCase();
            if (joined.includes("tên sách") || joined.includes("tác giả") || joined.includes("thể loại")) {
              headerIdx = i;
              row.forEach((colName, cIdx) => {
                const cn = String(colName || "").toLowerCase();
                if (cn.includes("tên") || cn.includes("tựa") || cn.includes("tiêu đề")) colMap.title = cIdx;
                else if (cn.includes("tác giả") || cn.includes("biên soạn")) colMap.author = cIdx;
                else if (cn.includes("thể loại")) colMap.category = cIdx;
                else if (cn.includes("kệ") || cn.includes("vị trí")) colMap.shelf_code = cIdx;
                else if (cn.includes("đóng góp") || cn.includes("người")) colMap.contributed_by = cIdx;
                else if (cn.includes("tình trạng")) colMap.condition = cIdx;
              });
              break;
            }
          }

          if (colMap.title === undefined) colMap.title = 1;
          if (colMap.author === undefined) colMap.author = 2;
          if (colMap.category === undefined) colMap.category = 3;
          if (colMap.shelf_code === undefined) colMap.shelf_code = 4;
          if (colMap.contributed_by === undefined) colMap.contributed_by = 5;
          if (colMap.condition === undefined) colMap.condition = 6;
          if (headerIdx === -1) headerIdx = 0;

          for (let r = headerIdx + 1; r < rawJson.length; r++) {
            const row = rawJson[r] || [];
            const title = String(row[colMap.title] || row[0] || "").trim();
            if (!title || /^\d+$/.test(title)) continue;
            parsedRows.push({
              title,
              author: String(row[colMap.author] || "").trim(),
              category: String(row[colMap.category] || "Truyện hay").trim() || "Truyện hay",
              shelf_code: String(row[colMap.shelf_code] || "K1").trim() || "K1",
              contributed_by: String(row[colMap.contributed_by] || "Thư viện lớp").trim() || "Thư viện lớp",
              condition: String(row[colMap.condition] || "Tốt").trim() || "Tốt"
            });
          }
        } catch (err) {
          console.warn("Client XLSX parse error:", err);
        }
      }

      this._stagedExcelData = {
        base64,
        rows: parsedRows,
        fileName: file.name
      };

      const count = parsedRows.length;
      pCount.innerText = count > 0 
        ? `Đã nhận diện: ${count} cuốn sách hợp lệ sẵn sàng nhập!` 
        : `Đã đọc file Excel thành công, sẵn sàng gửi máy chủ phân tích!`;
      if (count > 0) {
        pSample.innerText = `Ví dụ: "${parsedRows[0].title}" • Kệ: ${parsedRows[0].shelf_code}`;
      } else {
        pSample.innerText = "";
      }
      preview.style.display = "block";
      btn.disabled = false;
    };
    reader.readAsArrayBuffer(file);
  }

  async executeExcelImport() {
    if (!this._stagedExcelData) return;
    const modeEl = document.querySelector('input[name="excel_import_mode"]:checked');
    const replace = modeEl ? modeEl.value === "replace" : false;

    if (replace) {
      if (!confirm("⚠️ CẢNH BÁO: Bạn đã chọn 'Thay thế toàn bộ'. Toàn bộ kho sách hiện tại sẽ được thay thế bằng danh sách trong file Excel này. Bạn có chắc chắn không?")) {
        return;
      }
    }

    const btn = document.getElementById("btn-execute-excel-import");
    btn.disabled = true;
    btn.innerText = "⏳ Đang Nhập Dữ Liệu...";

    try {
      let importedCount = 0;
      if (this.serverAvailable) {
        const payload = {
          file_base64: this._stagedExcelData.base64,
          rows: this._stagedExcelData.rows,
          replace
        };
        const res = await fetch("/api/books/import-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Nhập file thất bại");
        }
        const data = await res.json();
        importedCount = data.count;
      } else {
        if (!this._stagedExcelData.rows || this._stagedExcelData.rows.length === 0) {
          throw new Error("Không tìm thấy dòng sách nào trong file Excel.");
        }
        const res = window.ClientDB.importBooksFromRows(this._stagedExcelData.rows, replace);
        importedCount = res.count;
      }

      this.closeImportExcelModal();
      alert(`🎉 THÀNH CÔNG! Đã nhập thành công ${importedCount} đầu sách vào Thư viện Lớp 3A7!`);
      await this.loadLibraryData();
    } catch (e) {
      alert("Lỗi khi nhập sách từ Excel: " + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "🚀 Bắt Đầu Nhập Sách";
      }
    }
  }

  // --- Universal Cloud Relay Sync & Real-time Live Synchronization (Req 7) ---
  initCloudSyncRelay() {
    if (typeof window === "undefined") return;
    if (this._cloudRelayInitialized) return;
    this._cloudRelayInitialized = true;

    // Connect to Server-Sent Events (SSE) for instant cross-device updates
    if (window.EventSource) {
      try {
        this._cloudEventSource = new EventSource("https://ntfy.sh/lms_colinh_3a7_v3_sync/sse");
        this._cloudEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleCloudSyncMessage(data);
          } catch {}
        };
        this._cloudEventSource.onerror = () => {
          // SSE reconnects automatically; ignore background connection errors
        };
      } catch (e) {
        console.warn("[CloudSync]: EventSource init error", e);
      }
    }

    // Poll latest messages on start and window focus
    this.pollCloudRelay();
  }

  async broadcastCloudSync(payload) {
    try {
      await fetch("https://ntfy.sh/lms_colinh_3a7_v3_sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("[CloudSync]: broadcast skipped", e);
    }
  }

  async pollCloudRelay() {
    try {
      const res = await fetch("https://ntfy.sh/lms_colinh_3a7_v3_sync/json?poll=1");
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split("\n");
      for (const line of lines) {
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj && obj.message) {
            let data = null;
            try { data = JSON.parse(obj.message); } catch { data = obj.message; }
            if (data && typeof data === "object") {
              this.handleCloudSyncMessage(data);
            }
          }
        } catch {}
      }
    } catch {}
  }

  handleCloudSyncMessage(data) {
    if (!data || !data.type) return;

    if (data.type === "race_update") {
      if (data.student_id && data.completed !== undefined) {
        const entry = this.readingRace.find(r => r.student_id == data.student_id);
        if (entry) {
          entry.completed = Number(data.completed) || 0;
          this.applyRaceFilters();
          if (this.currentUserRole === "student" && this.currentStudent && this.currentStudent.id == data.student_id) {
            this.renderStudentPortal(this.currentStudent);
          }
        }
      }
    }
  }

  startLiveSync() {
    this.initCloudSyncRelay();

    if (this._syncInterval) clearInterval(this._syncInterval);
    this._syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.silentSyncData();
      }
    }, 3200);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.silentSyncData();
        this.pollCloudRelay();
      }
    });

    window.addEventListener("focus", () => {
      this.silentSyncData();
      this.pollCloudRelay();
    });
  }

  async silentSyncData() {
    if (!this.serverAvailable) {
      // On static GitHub Pages, poll Cloud Relay to pick up cross-device password changes
      this.pollCloudRelay();
      return;
    }

    try {
      const [resRace, resStats] = await Promise.all([
        fetch("/api/race"),
        fetch("/api/library/stats")
      ]);

      if (resRace.ok) {
        const freshRace = await resRace.json();
        const oldStr = JSON.stringify(this.readingRace);
        const newStr = JSON.stringify(freshRace);
        if (oldStr !== newStr) {
          this.readingRace = freshRace;
          if (this.currentLibSubTab === "race") {
            this.applyRaceFilters();
          }
          if (this.currentUserRole === "student" && this.currentStudent) {
            await this.renderStudentPortal(this.currentStudent);
          }
        }
      }

      if (resStats.ok) {
        const freshStats = await resStats.json();
        this.renderLibraryStats(freshStats);
      }
    } catch {
      // background poll ignores errors
    }
  }

  // --- Universal Student Password Manager (Cô Linh) ---
  renderStudentPasswordTable() {
    const tbody = document.getElementById("settings-student-pwd-tbody");
    if (!tbody) return;
    if (!this.students || this.students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">Chưa có dữ liệu học sinh.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.students.map((s, idx) => {
      const pwd = s.password || "1234";
      return `
        <tr>
          <td style="text-align: center; font-weight: 700;">${s.order_num || (idx + 1)}</td>
          <td><span class="badge badge-blue">${s.code}</span></td>
          <td><strong>${s.full_name}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="st-pwd-text-${s.id}" style="font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: 1px;">${pwd}</span>
            </div>
          </td>
          <td style="text-align: center;">
            <div style="display: flex; justify-content: center; gap: 6px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="app.updateStudentPasswordByTeacher(${s.id})" style="font-size: 11.5px; padding: 4px 8px;">
                ✏️ Đổi
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="app.resetStudentPassword(${s.id})" style="font-size: 11.5px; padding: 4px 8px; color: #0284c7; border-color: #bae6fd;">
                🔄 Về 1234
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async resetStudentPassword(studentId) {
    const st = this.students.find(s => s.id == studentId);
    const name = st ? st.full_name : `Học sinh #${studentId}`;
    if (!confirm(`Đặt lại mật khẩu của "${name}" về mặc định "1234"?\n(Chỉ áp dụng trên thiết bị này, không ảnh hưởng máy khác)`)) return;

    try {
      if (window.ClientDB) window.ClientDB.updateDeviceStudentPassword(studentId, "1234");
      if (st) st.password = "1234";

      alert(`✅ Đã đặt lại mật khẩu cho "${name}" về "1234" trên thiết bị này!`);
      this.renderStudentPasswordTable();
      this.renderLoginStudentPicker();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async resetAllStudentsPasswords() {
    if (!confirm("⚠️ Bạn có chắc chắn muốn đặt lại mật khẩu của TẤT CẢ 29 học sinh về mặc định '1234'?\n\n(Thao tác này chỉ đặt lại trên thiết bị này, các thiết bị khác giữ nguyên mật khẩu)")) return;

    try {
      if (window.ClientDB) {
        window.ClientDB.resetDeviceAllPasswords("1234");
      }

      this.students.forEach(s => s.password = "1234");

      alert("✅ Đã đặt lại mật khẩu của toàn bộ 29 học sinh về '1234' trên thiết bị này!");
      this.renderStudentPasswordTable();
      this.renderLoginStudentPicker();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async updateStudentPasswordByTeacher(studentId) {
    const st = this.students.find(s => s.id == studentId);
    const name = st ? st.full_name : `Học sinh #${studentId}`;
    const cur = st ? (st.password || "1234") : "1234";
    const newPass = prompt(`Nhập mật khẩu mới cho "${name}" trên thiết bị này:\n(Đổi trên máy này không ảnh hưởng đến điện thoại/máy tính khác)`, cur);
    if (newPass === null) return;
    const cleanPass = newPass.trim();
    if (!cleanPass) {
      alert("Mật khẩu không được để trống!");
      return;
    }

    try {
      if (window.ClientDB) window.ClientDB.updateDeviceStudentPassword(studentId, cleanPass);
      if (st) st.password = cleanPass;

      alert(`✅ Đã đổi mật khẩu cho "${name}" thành "${cleanPass}" trên thiết bị này!`);
      this.renderStudentPasswordTable();
      this.renderLoginStudentPicker();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  // --- Student Self-Change Password Modal ---
  openStudentChangePasswordModal() {
    if (!this.currentStudent) return;
    const modal = document.getElementById("modal-student-change-pwd");
    const sub = document.getElementById("modal-st-change-pwd-subtitle");
    const curInp = document.getElementById("st-change-pwd-cur");
    const newInp = document.getElementById("st-change-pwd-new");
    const confInp = document.getElementById("st-change-pwd-confirm");
    const errEl = document.getElementById("st-change-pwd-err");

    if (sub) sub.innerText = `${this.currentStudent.order_num}. ${this.currentStudent.full_name} • ${this.currentStudent.code}`;
    if (curInp) curInp.value = "";
    if (newInp) newInp.value = "";
    if (confInp) confInp.value = "";
    if (errEl) { errEl.style.display = "none"; errEl.innerText = ""; }

    if (modal) modal.style.display = "flex";
  }

  closeStudentChangePasswordModal() {
    const modal = document.getElementById("modal-student-change-pwd");
    if (modal) modal.style.display = "none";
  }

  async submitStudentChangePassword() {
    if (!this.currentStudent) return;
    const curInp = document.getElementById("st-change-pwd-cur");
    const newInp = document.getElementById("st-change-pwd-new");
    const confInp = document.getElementById("st-change-pwd-confirm");
    const errEl = document.getElementById("st-change-pwd-err");

    const curVal = (curInp ? curInp.value : "").trim();
    const newVal = (newInp ? newInp.value : "").trim();
    const confVal = (confInp ? confInp.value : "").trim();

    const expectedCur = (window.ClientDB ? window.ClientDB.getDeviceStudentPassword(this.currentStudent.id) : (this.currentStudent.password || "1234")).trim();

    if (curVal !== expectedCur) {
      if (errEl) {
        errEl.innerText = "❌ Mật khẩu hiện tại chưa chính xác! (Mặc định nếu chưa đổi là 1234)";
        errEl.style.display = "block";
      }
      return;
    }

    if (newVal.length < 4) {
      if (errEl) {
        errEl.innerText = "❌ Mật khẩu mới cần có ít nhất 4 ký tự!";
        errEl.style.display = "block";
      }
      return;
    }

    if (newVal !== confVal) {
      if (errEl) {
        errEl.innerText = "❌ Xác nhận mật khẩu mới không khớp!";
        errEl.style.display = "block";
      }
      return;
    }

    try {
      const sid = this.currentStudent.id;
      if (window.ClientDB) window.ClientDB.updateDeviceStudentPassword(sid, newVal);
      this.currentStudent.password = newVal;

      const stInList = this.students.find(s => s.id == sid);
      if (stInList) stInList.password = newVal;

      this.closeStudentChangePasswordModal();
      alert(`🎉 Đổi mật khẩu thành công!\nMật khẩu mới của con trên thiết bị này là "${newVal}".`);
      this.renderStudentPasswordTable();
      this.renderLoginStudentPicker();
    } catch (e) {
      if (errEl) {
        errEl.innerText = "Lỗi: " + e.message;
        errEl.style.display = "block";
      }
    }
  }

  // --- Book QR Code Preview & Print ---
  openBookQrModal(bookId) {
    const book = this.books.find(b => b.id == bookId);
    if (!book) return;
    this.currentQrBook = book;
    const modal = document.getElementById("modal-book-qr");
    const previewBox = document.getElementById("book-qr-preview-svg");
    const titleEl = document.getElementById("book-qr-preview-title");
    const codeEl = document.getElementById("book-qr-preview-code");
    if (!modal) return;

    if (titleEl) titleEl.innerText = book.title;
    if (codeEl) codeEl.innerText = `${book.code} • Kệ ${book.shelf_code || 'K1'}`;

    if (previewBox) {
      if (window.QRCode && window.QRCode.generateSVG) {
        previewBox.innerHTML = window.QRCode.generateSVG(book.code, { margin: 2 });
      } else {
        previewBox.innerHTML = `<img src="/api/qr?text=${encodeURIComponent(book.code)}" alt="${book.code}" style="width: 180px; height: 180px;" />`;
      }
    }

    modal.style.display = "flex";
  }

  closeBookQrModal() {
    const modal = document.getElementById("modal-book-qr");
    if (modal) modal.style.display = "none";
    this.currentQrBook = null;
  }

  printCurrentBookQr() {
    if (!this.currentQrBook) return;
    const b = this.currentQrBook;
    const qrSvg = window.QRCode && window.QRCode.generateSVG ? window.QRCode.generateSVG(b.code, { margin: 2 }) : `<img src="/api/qr?text=${encodeURIComponent(b.code)}" />`;
    const printWin = window.open("", "_blank");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nhãn Sách ${b.code}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: white; }
          .label-box { width: 65mm; height: 45mm; border: 2px dashed #059669; border-radius: 8px; padding: 6px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; }
          .qr-img { width: 32mm; height: 32mm; }
          .qr-img svg { width: 100%; height: 100%; }
          .info { flex: 1; font-size: 11px; }
          .info h4 { font-size: 12px; margin: 0 0 4px; line-height: 1.2; }
          .info .code { font-weight: 900; color: #059669; font-size: 14px; margin-bottom: 2px; }
          .info .class { font-weight: 700; color: #64748b; font-size: 10px; }
          @media print {
            body { margin: 0; }
            .label-box { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label-box">
          <div class="qr-img">${qrSvg}</div>
          <div class="info">
            <div class="class">LỚP 3A7 • TH ÁNH DƯƠNG</div>
            <div class="code">${b.code} (STT ${b.stt})</div>
            <h4>${b.title}</h4>
            <div>Kệ: <strong>${b.shelf_code || 'K1'}</strong></div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  async printAllBooksQrSheet() {
    let books = this.books;
    if (!books || books.length === 0) {
      if (window.ClientDB && window.ClientDB.getBooks) {
        books = window.ClientDB.getBooks();
      } else if (window.api && window.api.getBooks) {
        try {
          books = await window.api.getBooks();
        } catch (e) {
          console.warn("Could not fetch books from api", e);
        }
      }
    }
    if (!books || books.length === 0) {
      alert("Chưa có danh sách sách trong kho để in!");
      return;
    }

    // Sort by STT ascending (1..75)
    const sorted = [...books].sort((a, b) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0));

    const totalCount = sorted.length;
    const className = (this.settings && this.settings.class_name) ? this.settings.class_name.toUpperCase() : "LỚP 3A7";
    const schoolName = (this.settings && this.settings.school_name) ? this.settings.school_name.toUpperCase() : "TRƯỜNG TH ÁNH DƯƠNG";

    const cardsHtml = sorted.map((b, idx) => {
      let qrSvg = "";
      if (window.QRCode && window.QRCode.generateSVG) {
        try {
          qrSvg = window.QRCode.generateSVG(b.code, { margin: 2, size: 100 });
        } catch (err) {
          qrSvg = `<img src="/api/qr?text=${encodeURIComponent(b.code)}" alt="${b.code}" style="width:100%;height:100%;" />`;
        }
      } else {
        qrSvg = `<img src="/api/qr?text=${encodeURIComponent(b.code)}" alt="${b.code}" style="width:100%;height:100%;" />`;
      }

      const safeTitle = (b.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeAuthor = (b.author || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeContrib = (b.contributed_by || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeCategory = (b.category || "Chung").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeShelf = (b.shelf_code || "K1").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const bookStt = b.stt || (idx + 1);

      return `
        <div class="book-qr-card">
          <div class="qr-col">
            <div class="qr-graphic">${qrSvg}</div>
            <div class="book-code-mono">${b.code}</div>
          </div>
          <div class="info-col">
            <div class="header-line">
              <span class="class-tag">${className}</span>
              <span class="stt-tag">STT #${bookStt}</span>
            </div>
            <div class="book-title" title="${safeTitle}">${safeTitle}</div>
            ${safeAuthor ? `<div class="book-author">✍️ ${safeAuthor}</div>` : ""}
            <div class="footer-meta">
              <span class="shelf-pill">📍 Kệ ${safeShelf}</span>
              <span class="cat-pill">${safeCategory}</span>
            </div>
            ${safeContrib ? `<div class="contrib-line">🎁 Sách của: <strong>${safeContrib}</strong></div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Mã QR Sách Lớp 3A7 (${totalCount} Cuốn) - Xuất PDF / In</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #065f46;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print-bar .title-group h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-bar .title-group p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .no-print-bar .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      border: none;
      outline: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-print {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(16,185,129,0.4);
    }
    .btn-print:hover {
      background: #059669;
    }
    .btn-close {
      background: rgba(255,255,255,0.2);
      color: #ffffff;
    }
    .btn-close:hover {
      background: rgba(255,255,255,0.3);
    }
    .page-container {
      max-width: 210mm;
      margin: 12px auto;
      background: #ffffff;
      padding: 6mm;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    .sheet-header {
      text-align: center;
      border-bottom: 2px solid #059669;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .sheet-header h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: 900;
      color: #065f46;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .sheet-header p {
      margin: 2px 0 0;
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
    }
    .books-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
    }
    .book-qr-card {
      border: 1.5px dashed #059669;
      border-radius: 6px;
      padding: 4px 6px;
      background: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 38mm;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .qr-col {
      width: 29mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-graphic {
      width: 27mm;
      height: 27mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-graphic svg, .qr-graphic img {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .book-code-mono {
      font-family: monospace;
      font-size: 8pt;
      font-weight: 900;
      color: #065f46;
      margin-top: 1px;
      letter-spacing: 0.5px;
    }
    .info-col {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .class-tag {
      font-size: 6.5pt;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .stt-tag {
      font-size: 6.5pt;
      font-weight: 800;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 0.5px 3px;
      border-radius: 3px;
    }
    .book-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      max-height: 2.3em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin: 1px 0;
    }
    .book-author {
      font-size: 6.5pt;
      color: #64748b;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .footer-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 1px;
    }
    .shelf-pill {
      font-size: 6.5pt;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .cat-pill {
      font-size: 6pt;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .contrib-line {
      font-size: 6.5pt;
      color: #047857;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    @media print {
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .page-container {
        max-width: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .book-qr-card {
        border: 1px dashed #334155 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="title-group">
      <h2>📚 BỘ NHÃN MÃ QR KHO SÁCH (${totalCount} CUỐN)</h2>
      <p>💡 Chọn máy in hoặc chọn <strong>"Lưu dưới dạng PDF" (Save as PDF)</strong> để xuất file PDF in tem nhãn.</p>
    </div>
    <div class="btn-group">
      <button class="btn-action btn-print" onclick="window.print()">🖨️ In / Xuất PDF Ngay</button>
      <button class="btn-action btn-close" onclick="window.close()">✖️ Đóng</button>
    </div>
  </div>

  <div class="page-container">
    <div class="sheet-header">
      <h1>DANH MỤC TEM MÃ QR SÁCH - ${className}</h1>
      <p>${schoolName} • TỔNG CỘNG: ${totalCount} ĐẦU SÁCH • HỆ THỐNG THƯ VIỆN LỚP HỌC</p>
    </div>
    <div class="books-grid">
      ${cardsHtml}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    try {
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(fullHtml);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn("Popup blocked, trying iframe fallback", e);
    }

    let iframe = document.getElementById("print-books-fallback-iframe");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-books-fallback-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "10px";
      iframe.style.height = "10px";
      iframe.style.opacity = "0.01";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 500);
  }

  // --- Public Library Viewing (From Login Screen or Student Portal) ---
  openPublicLibrary() {
    this.currentViewMode = "public";
    const viewLogin = document.getElementById("view-login");
    const viewStudent = document.getElementById("view-student-portal");
    const viewTeacher = document.getElementById("view-teacher-app");
    const viewPublic = document.getElementById("view-public-library");
    const mount = document.getElementById("public-library-mount");
    const paneLib = document.getElementById("pane-library");

    if (viewLogin) viewLogin.style.display = "none";
    if (viewStudent) viewStudent.style.display = "none";
    if (viewTeacher) viewTeacher.style.display = "none";
    if (viewPublic) viewPublic.style.display = "block";

    if (mount && paneLib) {
      mount.appendChild(paneLib);
      paneLib.classList.add("active");
    }

    this.loadLibraryData();
  }

  // ====================================================================
  // --- SECTION: TEAMS MANAGEMENT CONTROLLER ---
  // ====================================================================
  async loadTeams() {
    try {
      let teams;
      if (this.serverAvailable) {
        const res = await fetch("/api/teams");
        teams = await res.json();
      } else {
        teams = window.ClientDB.getTeams();
      }
      this.teams = Array.isArray(teams) ? teams : [];
      this.renderTeams();
    } catch (e) {
      console.warn("Could not load teams:", e);
      this.teams = window.ClientDB.getTeams();
      this.renderTeams();
    }
  }

  renderTeams() {
    const grid = document.getElementById("teams-grid");
    if (!grid) return;

    const list = this.teams || [];
    const totalEl = document.getElementById("teams-stat-total");
    const assignedEl = document.getElementById("teams-stat-assigned");
    const maxEl = document.getElementById("teams-stat-max");

    let assignedStudentIds = new Set();
    let maxMembers = 0;

    list.forEach(t => {
      const members = t.members || [];
      if (members.length > maxMembers) maxMembers = members.length;
      members.forEach(m => assignedStudentIds.add(m.id || m.code));
    });

    if (totalEl) totalEl.innerText = list.length;
    if (assignedEl) assignedEl.innerText = assignedStudentIds.size;
    if (maxEl) maxEl.innerText = maxMembers;

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted); border: 2px dashed var(--border);">
          <div style="font-size: 48px; margin-bottom: 12px;">🏆</div>
          <h3 style="font-size: 18px; color: #1E293B; margin-bottom: 6px; font-weight: 700;">Chưa Có Nhóm Học Tập Nào</h3>
          <p style="font-size: 14px; max-width: 440px; margin: 0 auto 16px;">
            Thầy cô hãy bấm nút <strong>"Tạo Nhóm Mới"</strong> để thành lập các đội thi đua cho các em học sinh lớp 3A7 nhé!
          </p>
          <button class="btn btn-primary" onclick="app.openCreateTeamModal()">
            ➕ Thành Lập Nhóm Đầu Tiên
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(t => {
      const color = t.color || "#3B82F6";
      const icon = t.icon || "⭐";
      const members = t.members || [];
      const mottoHtml = t.motto ? `<div class="team-motto">“${t.motto}”</div>` : "";
      
      const membersHtml = members.length > 0
        ? members.map(m => {
            const animalSym = m.animal_symbol || "🐱";
            return `
              <div class="team-member-pill" title="${m.full_name} (${m.code})">
                <span class="member-symbol">${animalSym}</span>
                <span class="member-name">${m.order_num ? m.order_num + '.' : ''} ${m.full_name}</span>
              </div>
            `;
          }).join("")
        : `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có học sinh nào trong nhóm này.</div>`;

      return `
        <div class="team-card" style="--team-color: ${color};">
          <div class="team-card-header" style="background: linear-gradient(135deg, ${color}15, ${color}25); border-left: 5px solid ${color};">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${t.image 
                ? `<img src="${t.image}" alt="${t.name}" class="team-avatar-img" onerror="this.style.display='none'">` 
                : `<div class="team-icon-circle" style="background: ${color}20; color: ${color};">${icon}</div>`
              }
              <div>
                <h3 class="team-card-title">${t.name}</h3>
                <div class="team-member-badge" style="color: ${color}; font-weight: 700; font-size: 12px;">
                  👥 ${members.length} thành viên
                </div>
              </div>
            </div>
            <div class="team-card-actions">
              <button class="btn btn-outline btn-xs" onclick="app.openEditTeamModal(${t.id})" title="Chỉnh sửa nhóm">✏️ Sửa</button>
              <button class="btn btn-danger btn-xs" onclick="app.deleteTeam(${t.id})" title="Xóa nhóm">🗑️</button>
            </div>
          </div>
          <div class="team-card-body">
            ${mottoHtml}
            <div class="team-members-header">
              <span>Thành viên nhóm:</span>
              <span class="badge" style="background: ${color}15; color: ${color}; font-size: 11px;">${members.length} học sinh</span>
            </div>
            <div class="team-members-list">
              ${membersHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  openCreateTeamModal() {
    this.currentEditingTeamId = null;
    document.getElementById("team-modal-id").value = "";
    document.getElementById("team-modal-name").value = "";
    document.getElementById("team-modal-icon").value = "⭐";
    document.getElementById("team-modal-color").value = "#2563EB";
    document.getElementById("team-modal-image").value = "";
    document.getElementById("team-modal-motto").value = "";
    document.getElementById("team-modal-title").innerText = "🏆 Tạo Nhóm Học Tập Mới";
    this.selectedTeamMemberIds = new Set();
    this.renderTeamStudentChecklist();
    document.getElementById("team-editor-modal").style.display = "flex";
  }

  openEditTeamModal(teamId) {
    const team = (this.teams || []).find(t => t.id == teamId);
    if (!team) return;

    this.currentEditingTeamId = team.id;
    document.getElementById("team-modal-id").value = team.id;
    document.getElementById("team-modal-name").value = team.name || "";
    document.getElementById("team-modal-icon").value = team.icon || "⭐";
    document.getElementById("team-modal-color").value = team.color || "#2563EB";
    document.getElementById("team-modal-image").value = team.image || "";
    document.getElementById("team-modal-motto").value = team.motto || "";
    document.getElementById("team-modal-title").innerText = `✏️ Chỉnh Sửa Nhóm "${team.name}"`;

    const memberIds = (team.members || []).map(m => m.id);
    this.selectedTeamMemberIds = new Set(memberIds);
    this.renderTeamStudentChecklist();
    document.getElementById("team-editor-modal").style.display = "flex";
  }

  closeTeamModal() {
    document.getElementById("team-editor-modal").style.display = "none";
  }

  setTeamIcon(icon) {
    document.getElementById("team-modal-icon").value = icon;
  }

  setTeamColor(color) {
    document.getElementById("team-modal-color").value = color;
  }

  renderTeamStudentChecklist() {
    const container = document.getElementById("team-modal-student-list");
    if (!container) return;

    const countEl = document.getElementById("team-modal-selected-count");
    if (countEl) countEl.innerText = this.selectedTeamMemberIds ? this.selectedTeamMemberIds.size : 0;

    const students = this.students || [];
    container.innerHTML = students.map(s => {
      const isChecked = this.selectedTeamMemberIds && this.selectedTeamMemberIds.has(s.id);
      const animalSym = s.animal_symbol || "🐱";
      return `
        <label class="team-student-item ${isChecked ? 'selected' : ''}" data-search="${s.code.toLowerCase()} ${s.full_name.toLowerCase()}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="app.toggleTeamMember(${s.id}, this.checked)">
          <span class="student-item-sym">${animalSym}</span>
          <span class="student-item-name"><strong>${s.code}</strong> - ${s.full_name}</span>
        </label>
      `;
    }).join("");
  }

  toggleTeamMember(studentId, isChecked) {
    if (!this.selectedTeamMemberIds) this.selectedTeamMemberIds = new Set();
    if (isChecked) {
      this.selectedTeamMemberIds.add(studentId);
    } else {
      this.selectedTeamMemberIds.delete(studentId);
    }
    const countEl = document.getElementById("team-modal-selected-count");
    if (countEl) countEl.innerText = this.selectedTeamMemberIds.size;
  }

  toggleAllTeamStudents(select) {
    if (!this.selectedTeamMemberIds) this.selectedTeamMemberIds = new Set();
    const students = this.students || [];
    if (select) {
      students.forEach(s => this.selectedTeamMemberIds.add(s.id));
    } else {
      this.selectedTeamMemberIds.clear();
    }
    this.renderTeamStudentChecklist();
  }

  filterTeamStudentSelection() {
    const query = (document.getElementById("team-modal-student-search")?.value || "").toLowerCase().trim();
    document.querySelectorAll(".team-student-item").forEach(item => {
      const text = item.getAttribute("data-search") || "";
      if (!query || text.includes(query)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  }

  async saveTeam() {
    const name = document.getElementById("team-modal-name").value.trim();
    const icon = document.getElementById("team-modal-icon").value.trim() || "⭐";
    const color = document.getElementById("team-modal-color").value || "#2563EB";
    const image = document.getElementById("team-modal-image").value.trim();
    const motto = document.getElementById("team-modal-motto").value.trim();
    const memberIds = Array.from(this.selectedTeamMemberIds || []);

    if (!name) {
      alert("Vui lòng nhập Tên nhóm!");
      document.getElementById("team-modal-name").focus();
      return;
    }

    try {
      if (this.currentEditingTeamId) {
        if (this.serverAvailable) {
          const res = await fetch(`/api/teams/${this.currentEditingTeamId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color, icon, image, motto, member_ids: memberIds })
          });
          if (!res.ok) throw new Error("Cập nhật nhóm thất bại!");
        } else {
          window.ClientDB.updateTeam(this.currentEditingTeamId, name, color, icon, image, motto, memberIds);
        }
        alert(`✅ Đã cập nhật thành công nhóm "${name}"!`);
      } else {
        if (this.serverAvailable) {
          const res = await fetch("/api/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color, icon, image, motto, member_ids: memberIds })
          });
          if (!res.ok) throw new Error("Tạo nhóm thất bại!");
        } else {
          window.ClientDB.createTeam(name, color, icon, image, motto, memberIds);
        }
        alert(`✅ Đã thành lập thành công nhóm "${name}" (${memberIds.length} thành viên)!`);
      }

      this.closeTeamModal();
      await this.loadTeams();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async deleteTeam(teamId) {
    const team = (this.teams || []).find(t => t.id == teamId);
    const title = team ? team.name : `Nhóm #${teamId}`;
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa nhóm "${title}"?`)) {
      return;
    }

    try {
      if (this.serverAvailable) {
        const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Xóa nhóm thất bại!");
      } else {
        window.ClientDB.deleteTeam(teamId);
      }
      alert(`🗑️ Đã xóa nhóm "${title}" thành công!`);
      await this.loadTeams();
    } catch (e) {
      alert("Lỗi khi xóa nhóm: " + e.message);
    }
  }

  exitPublicLibrary() {
    this.currentViewMode = "teacher";
    const viewPublic = document.getElementById("view-public-library");
    const paneLib = document.getElementById("pane-library");
    const teacherMain = document.querySelector("#view-teacher-app .app-main");

    if (viewPublic) viewPublic.style.display = "none";
    if (teacherMain && paneLib) {
      teacherMain.appendChild(paneLib);
    }

    if (this.currentUserRole === "student" && this.currentStudent) {
      this.showStudentPortal(this.currentStudent);
    } else if (this.currentUserRole === "teacher") {
      const vTeacher = document.getElementById("view-teacher-app");
      if (vTeacher) vTeacher.style.display = "block";
      this.switchTab("pane-library");
    } else {
      const vLogin = document.getElementById("view-login");
      if (vLogin) vLogin.style.display = "flex";
    }
  }

}

// Global App Instance
const app = new LMSApp();
window.app = app;
window.addEventListener("DOMContentLoaded", () => app.init());
