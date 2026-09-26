/**
 * Camera QR Scanner & Audio Synthesizer
 * High-performance Dual Engine: Native BarcodeDetector + Universal jsQR fallback
 * Full support for iOS Safari, macOS Safari, Chrome, Firefox, Edge, and Android
 */
class QRCameraScanner {
  constructor(videoElement, onDetected, options = {}) {
    this.video = videoElement;
    this.onDetected = onDetected;
    this.options = Object.assign({
      fps: 15,
      facingMode: "environment" // 'environment' for rear camera, 'user' for front
    }, options);
    this.stream = null;
    this.isScanning = false;
    this.animId = null;
    this.detector = null;
    this.lastDetectedCode = null;
    this.lastDetectedTime = 0;
    this.throttleMs = 1800; // avoid duplicate triggers within 1.8s
    this.lastScanTime = 0;

    // Offscreen canvas for frame extraction & jsQR decoding
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    this.initAudio();
    this.ensureJsQR();
  }

  ensureJsQR() {
    if (typeof window !== "undefined" && !window.jsQR) {
      if (typeof jsQR !== "undefined") {
        window.jsQR = jsQR;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "js/vendor/jsqr.js";
        script.onload = () => {
          console.log("[QRScanner] Loaded local jsQR engine successfully.");
          resolve();
        };
        script.onerror = () => {
          console.warn("[QRScanner] Local jsQR load failed, trying CDN fallback...");
          const cdnScript = document.createElement("script");
          cdnScript.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
          cdnScript.onload = () => {
            console.log("[QRScanner] Loaded CDN jsQR engine successfully.");
            resolve();
          };
          cdnScript.onerror = () => {
            console.error("[QRScanner] Failed to load jsQR library.");
            resolve();
          };
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      });
    }
    return Promise.resolve();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playSuccessBeep() {
    this.resumeAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      // Chime tone 1: E5
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Chime tone 2: A5 (cheerful bell)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn("Error playing sound", e);
    }
  }

  playErrorBeep() {
    this.resumeAudio();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now); // A3
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  async start() {
    if (this.isScanning) return true;
    this.resumeAudio();
    await this.ensureJsQR();

    // Check BarcodeDetector capability safely
    if ('BarcodeDetector' in window) {
      try {
        if (typeof BarcodeDetector.getSupportedFormats === "function") {
          const formats = await BarcodeDetector.getSupportedFormats();
          if (formats && formats.includes('qr_code')) {
            this.detector = new BarcodeDetector({ formats: ['qr_code'] });
          }
        } else {
          this.detector = new BarcodeDetector({ formats: ['qr_code'] });
        }
      } catch (e) {
        this.detector = null;
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Trình duyệt không hỗ trợ mở camera trực tiếp hoặc trang web cần chạy qua giao thức an toàn (HTTPS).";
      this.updateScanHint("❌ " + msg);
      throw new Error(msg);
    }

    const desiredFacing = this.options.facingMode || "environment";

    // Progressive constraint fallback for maximum camera compatibility
    const constraintList = [
      {
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          facingMode: { ideal: desiredFacing }
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let lastErr = null;
    for (const constraints of constraintList) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (this.stream) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!this.stream) {
      console.error("Camera access failed:", lastErr);
      const msg = "Không thể mở camera. Vui lòng cấp quyền truy cập Camera trên trình duyệt.";
      this.updateScanHint("❌ " + msg);
      throw lastErr || new Error(msg);
    }

    this.video.srcObject = this.stream;
    this.video.setAttribute("playsinline", "true");
    this.video.setAttribute("webkit-playsinline", "true");
    this.video.muted = true;
    this.video.playsInline = true;

    try {
      await this.video.play();
    } catch (playErr) {
      console.warn("Video play interrupted, retrying...", playErr);
    }

    this.isScanning = true;
    this.scanLoop();
    this.updateScanHint("Đang tìm mã QR... Đưa mã vào giữa khung hình");
    return true;
  }

  stop() {
    this.isScanning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async scanLoop() {
    if (!this.isScanning) return;

    if (this.video && this.video.readyState >= 2 && this.video.videoWidth > 0) {
      const now = performance.now();
      const minInterval = 1000 / (this.options.fps || 15);

      if (!this.lastScanTime || (now - this.lastScanTime) >= minInterval) {
        this.lastScanTime = now;
        await this.detectCodeFromVideo();
      }
    }

    if (this.isScanning) {
      this.animId = requestAnimationFrame(() => this.scanLoop());
    }
  }

  async detectCodeFromVideo() {
    let rawCode = null;

    // 1. Native BarcodeDetector (Chrome/Edge/Android where supported)
    if (this.detector) {
      try {
        const barcodes = await this.detector.detect(this.video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          rawCode = barcodes[0].rawValue;
        }
      } catch (e) {
        // Fallback to jsQR
      }
    }

    // 2. High-precision jsQR engine (macOS Safari, iOS Safari, Firefox, and all browsers)
    if (!rawCode && window.jsQR) {
      try {
        const vw = this.video.videoWidth;
        const vh = this.video.videoHeight;
        if (vw > 0 && vh > 0) {
          // Scale to optimal detection size (max 640px) for blazing fast ~5ms processing
          const maxDim = 640;
          let w = vw;
          let h = vh;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
          }

          this.ctx.drawImage(this.video, 0, 0, w, h);
          const imageData = this.ctx.getImageData(0, 0, w, h);

          // Fast decode without inversion first
          let qr = window.jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
          if (!qr || !qr.data) {
            qr = window.jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
          }

          if (qr && qr.data) {
            rawCode = qr.data;
          }
        }
      } catch (err) {
        // Frame decoding error
      }
    }

    if (rawCode) {
      this.handleDetected(rawCode);
    }
  }

  handleDetected(rawCode) {
    if (!rawCode) return;
    const cleanCode = String(rawCode).trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (this.lastDetectedCode === cleanCode && (now - this.lastDetectedTime) < this.throttleMs) {
      return; // Throttled
    }
    this.lastDetectedCode = cleanCode;
    this.lastDetectedTime = now;

    // Visual & Audio Feedback
    this.playSuccessBeep();
    this.highlightReticleSuccess();
    this.updateScanHint(`✅ Đã quét thành công: ${cleanCode}`);

    if (this.onDetected) {
      this.onDetected(cleanCode);
    }
  }

  highlightReticleSuccess() {
    if (!this.video || !this.video.parentElement) return;
    const reticle = this.video.parentElement.querySelector(".scan-reticle");
    if (reticle) {
      reticle.classList.add("reticle-success");
      setTimeout(() => {
        reticle.classList.remove("reticle-success");
      }, 700);
    }
  }

  updateScanHint(text) {
    if (!this.video || !this.video.parentElement) return;
    const hint = this.video.parentElement.querySelector(".scan-hint");
    if (hint) {
      hint.innerText = text;
    }
  }

  // Support scanning directly from Image File (upload/photo)
  async scanImageFile(file) {
    await this.ensureJsQR();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const code = this.scanImageElement(img);
            resolve(code);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Không thể tải hình ảnh"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsDataURL(file);
    });
  }

  scanImageElement(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    if (window.jsQR) {
      let qr = window.jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
      if (!qr || !qr.data) {
        qr = window.jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
      }
      if (qr && qr.data) {
        this.handleDetected(qr.data);
        return qr.data;
      }
    }
    return null;
  }
}

window.QRCameraScanner = QRCameraScanner;
