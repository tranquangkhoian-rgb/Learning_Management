/**
 * Camera QR Scanner & Audio Synthesizer
 * Uses native BarcodeDetector API with graceful fallback and Web Audio API chime
 */
class QRCameraScanner {
  constructor(videoElement, onDetected, options = {}) {
    this.video = videoElement;
    this.onDetected = onDetected;
    this.options = Object.assign({
      fps: 10,
      facingMode: "environment" // 'environment' for rear camera, 'user' for front
    }, options);
    this.stream = null;
    this.isScanning = false;
    this.animId = null;
    this.detector = null;
    this.lastDetectedCode = null;
    this.lastDetectedTime = 0;
    this.throttleMs = 2000; // avoid multi-scanning same code within 2 seconds
    this.initAudio();
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

  playSuccessBeep() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      // Chime tone 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Chime tone 2 (higher, cheerful)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.18, now + 0.12);
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
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now); // A3
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  async start() {
    if (this.isScanning) return;
    try {
      if ('BarcodeDetector' in window) {
        this.detector = new BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch (e) {
      console.warn("BarcodeDetector init failed", e);
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: this.options.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute("playsinline", true);
      await this.video.play();
      this.isScanning = true;
      this.scanLoop();
      return true;
    } catch (err) {
      console.error("Camera access error:", err);
      throw err;
    }
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

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      if (this.detector) {
        try {
          const barcodes = await this.detector.detect(this.video);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            this.handleDetected(raw);
          }
        } catch (e) {}
      }
    }

    // Continue loop
    this.animId = requestAnimationFrame(() => this.scanLoop());
  }

  handleDetected(rawCode) {
    if (!rawCode) return;
    const now = Date.now();
    if (this.lastDetectedCode === rawCode && (now - this.lastDetectedTime) < this.throttleMs) {
      return; // Throttled
    }
    this.lastDetectedCode = rawCode;
    this.lastDetectedTime = now;
    this.playSuccessBeep();
    if (this.onDetected) {
      this.onDetected(rawCode);
    }
  }
}

window.QRCameraScanner = QRCameraScanner;
