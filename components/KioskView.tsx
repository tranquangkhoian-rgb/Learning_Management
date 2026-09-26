"use client";

import React, { useState, useEffect, useRef } from "react";
import { Assignment, Student } from "@/lib/types";

interface KioskViewProps {
  assignments: Assignment[];
  students: Student[];
  onSubmissionSuccess: () => void;
}

export default function KioskView({ assignments, students, onSubmissionSuccess }: KioskViewProps) {
  const [selectedAsgId, setSelectedAsgId] = useState<number | "">("");
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [celebrateData, setCelebrateData] = useState<{
    student: Student;
    assignment: Assignment;
    attempt_number: number;
    is_late: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState(2);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScanCodeRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (assignments.length > 0 && !selectedAsgId) {
      setSelectedAsgId(assignments[0].id);
    }
  }, [assignments, selectedAsgId]);

  // Audio chimes
  const playBeep = (isSuccess: boolean) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
        const now = audioCtxRef.current.currentTime;
        if (isSuccess) {
          const osc1 = audioCtxRef.current.createOscillator();
          const gain1 = audioCtxRef.current.createGain();
          osc1.frequency.setValueAtTime(659.25, now); // E5
          gain1.gain.setValueAtTime(0.15, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc1.connect(gain1);
          gain1.connect(audioCtxRef.current.destination);
          osc1.start(now);
          osc1.stop(now + 0.15);

          const osc2 = audioCtxRef.current.createOscillator();
          const gain2 = audioCtxRef.current.createGain();
          osc2.frequency.setValueAtTime(880, now + 0.12); // A5
          gain2.gain.setValueAtTime(0.18, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc2.connect(gain2);
          gain2.connect(audioCtxRef.current.destination);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.35);
        } else {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        }
      }
    } catch {}
  };

  // Camera Management
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startBarcodeLoop();
      }
    } catch (err) {
      console.warn("Could not start camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startBarcodeLoop = () => {
    let animId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: any = null;
    if ("BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {}
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastScanCheck = 0;

    const checkFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animId = requestAnimationFrame(checkFrame);
        return;
      }

      const now = performance.now();
      if (now - lastScanCheck >= 70) {
        lastScanCheck = now;
        let detectedRaw: string | null = null;

        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detectedRaw = barcodes[0].rawValue;
            }
          } catch {}
        }

        // jsQR fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsqr = (window as any).jsQR;
        if (!detectedRaw && jsqr && ctx && videoRef.current.videoWidth > 0) {
          try {
            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
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
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
            }
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            let code = jsqr(imgData.data, w, h, { inversionAttempts: "dontInvert" });
            if (!code || !code.data) {
              code = jsqr(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
            }
            if (code && code.data) {
              detectedRaw = code.data;
            }
          } catch {}
        }

        if (detectedRaw) {
          handleScan(detectedRaw);
        }
      }

      animId = requestAnimationFrame(checkFrame);
    };

    animId = requestAnimationFrame(checkFrame);
    return () => cancelAnimationFrame(animId);
  };

  useEffect(() => {
    // Ensure jsQR script is loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && !(window as any).jsQR) {
      const s = document.createElement("script");
      s.src = "js/vendor/jsqr.js";
      document.head.appendChild(s);
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleScan = async (code: string) => {
    if (!code || !selectedAsgId) return;
    const match = code.trim().toUpperCase().match(/HS\d+/);
    const cleanCode = match ? match[0] : code.trim().toUpperCase();
    const now = Date.now();
    if (lastScanCodeRef.current === cleanCode && now - lastScanTimeRef.current < 2500) {
      return; // Throttled
    }
    lastScanCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    try {
      const res = await fetch("/api/scan-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_code: cleanCode,
          assignment_id: Number(selectedAsgId),
          operator: "Học sinh",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playBeep(false);
        alert(data.error || "Mã QR không hợp lệ!");
        return;
      }

      playBeep(true);
      setCelebrateData(data);
      onSubmissionSuccess();

      // Countdown 2s then close
      setCountdown(2);
      let count = 2;
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          setCelebrateData(null);
        }
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedAsg = assignments.find(a => a.id === Number(selectedAsgId));
  const isPastDeadline = selectedAsg ? new Date() > new Date(selectedAsg.due_date.replace(" ", "T")) : false;

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Header */}
      <div className="mb-6">
        <span className="inline-block px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2">
          🌟 Góc Tự Quản Lớp Học
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
          Góc Nộp Vở & Phiếu Bài Tập
        </h2>
        <p className="text-slate-500 text-sm sm:text-base">
          Chọn bài tập và đưa mã QR dán trên vở vào trước camera để nộp bài nhé!
        </p>
      </div>

      {/* Main Kiosk Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-lg border-2 border-indigo-100 text-left">
        {/* Assignment selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            📝 Đang nộp cho bài tập:
          </label>
          <select
            value={selectedAsgId}
            onChange={(e) => setSelectedAsgId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.subject}] {a.title}
              </option>
            ))}
          </select>
          {selectedAsg && (
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
              <span>⏰ Hạn nộp: <strong>{selectedAsg.due_date}</strong></span>
              {isPastDeadline ? (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">Quá hạn (Nộp trễ)</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Đang trong hạn</span>
              )}
            </div>
          )}
        </div>

        {/* Camera Box */}
        <div className="relative w-full aspect-[4/3] max-w-md mx-auto bg-black rounded-2xl overflow-hidden shadow-xl mb-4">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {/* Scanning Overlay Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] overflow-hidden">
              <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34D399] animate-pulse" style={{ animation: "scanLine 2s infinite ease-in-out" }} />
            </div>
          </div>
          <div className="absolute bottom-3 inset-x-0 text-center text-white text-xs font-semibold drop-shadow-md">
            Đặt mã QR vào giữa khung hình
          </div>
        </div>

        {/* Camera Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              📷 Bật Camera
            </button>
          ) : (
            <button
              onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔄 Đổi Camera Trước/Sau
            </button>
          )}
          <button
            onClick={() => setShowQuickPicker(!showQuickPicker)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            🔍 Chọn Tên Nhanh (Nếu không có Camera)
          </button>
        </div>

        {/* Quick Student Grid Fallback */}
        {showQuickPicker && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-2">Bấm vào tên học sinh để nộp bài nhanh:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {students.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleScan(st.code)}
                  className="px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 truncate transition"
                >
                  <strong>{st.order_num}.</strong> {st.full_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Celebration Modal on Submit */}
      {celebrateData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-bounce-short">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-emerald-500/30">
              🎉
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              {celebrateData.student.order_num}. {celebrateData.student.full_name}
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              {celebrateData.attempt_number > 1
                ? `Đã ghi nhận Nộp Lại bài tập "${celebrateData.assignment.title}"!`
                : `Đã ghi nhận nộp bài tập "${celebrateData.assignment.title}" thành công!`}
            </p>
            <div className="flex justify-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${celebrateData.attempt_number > 1 ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                Lần nộp: {celebrateData.attempt_number}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${celebrateData.is_late ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>
                {celebrateData.is_late ? "⏰ Nộp trễ hạn" : "⭐ Đúng hạn"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sẵn sàng cho bạn tiếp theo sau <strong>{countdown}</strong>s...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
