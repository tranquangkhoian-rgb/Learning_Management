"use client";

import React, { useState, useEffect, useRef } from "react";
import { Assignment, Student, SubmissionEvent } from "@/lib/types";

interface GradingViewProps {
  assignments: Assignment[];
  students: Student[];
  onGradedSuccess: () => void;
  onOpenNewAssignment: () => void;
}

export default function GradingView({
  assignments,
  students,
  onGradedSuccess,
  onOpenNewAssignment,
}: GradingViewProps) {
  const [selectedAsgId, setSelectedAsgId] = useState<number | "">("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<SubmissionEvent[]>([]);
  const [score, setScore] = useState<string>("");
  const [status, setStatus] = useState<string>("Đã đạt");
  const [teacherNote, setTeacherNote] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (assignments.length > 0 && !selectedAsgId) {
      setSelectedAsgId(assignments[0].id);
    }
  }, [assignments, selectedAsgId]);

  const selectStudent = async (st: Student) => {
    setSelectedStudent(st);
    setScore("");
    setTeacherNote("");
    setStatus("Đã đạt");

    if (selectedAsgId) {
      try {
        const res = await fetch(`/api/history?student_id=${st.id}&assignment_id=${selectedAsgId}`);
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setHistory([]);
      }
    }
  };

  const handleScanGrade = (code: string) => {
    const match = code.trim().toUpperCase().match(/HS\d+/);
    const cleanCode = match ? match[0] : code.trim().toUpperCase();
    const st = students.find((s) => s.code.toUpperCase() === cleanCode);
    if (st) {
      selectStudent(st);
    } else {
      alert(`Không tìm thấy học sinh với mã "${code}"!`);
    }
  };

  const startGradeCamera = async () => {
    // Ensure jsQR is loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && !(window as any).jsQR) {
      const s = document.createElement("script");
      s.src = "js/vendor/jsqr.js";
      document.head.appendChild(s);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);

        // Scan loop
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
        let lastCheck = 0;

        const loop = async () => {
          if (!videoRef.current || !streamRef.current) return;
          const now = performance.now();
          if (videoRef.current.readyState >= 2 && now - lastCheck >= 70) {
            lastCheck = now;
            let detected: string | null = null;
            if (detector) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  detected = barcodes[0].rawValue;
                }
              } catch {}
            }
            // jsQR fallback
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jsqr = (window as any).jsQR;
            if (!detected && jsqr && ctx && videoRef.current.videoWidth > 0) {
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
                let qr = jsqr(imgData.data, w, h, { inversionAttempts: "dontInvert" });
                if (!qr || !qr.data) {
                  qr = jsqr(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
                }
                if (qr && qr.data) {
                  detected = qr.data;
                }
              } catch {}
            }
            if (detected) {
              handleScanGrade(detected);
            }
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    } catch (e) {
      console.warn("Could not start grade camera:", e);
    }
  };

  const stopGradeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const setQuickScore = (val: number) => {
    setScore(String(val));
    if (val >= 8) setStatus("Đã đạt");
    else if (val >= 5) setStatus("Cần sửa");
    else setStatus("Cần nộp lại");
  };

  const addQuickNote = (noteText: string) => {
    setTeacherNote((prev) => (prev ? `${prev} ${noteText}` : noteText));
  };

  const submitGrading = async () => {
    if (!selectedStudent || !selectedAsgId) return;

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          assignment_id: Number(selectedAsgId),
          score: score ? Number(score) : null,
          status,
          teacher_note: teacherNote,
          operator: "Cô Linh",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Lỗi khi lưu điểm!");
        return;
      }

      alert(`✅ Đã lưu điểm cho học sinh ${selectedStudent.full_name} (${status})!`);
      setSelectedStudent(null);
      onGradedSuccess();
    } catch (e) {
      alert("Lỗi khi kết nối máy chủ: " + String(e));
    }
  };

  const statusOptions = [
    { label: "🟢 Đã đạt", value: "Đã đạt" },
    { label: "🟡 Cần sửa", value: "Cần sửa" },
    { label: "🔵 Cần nộp lại", value: "Cần nộp lại" },
    { label: "🔴 Chưa hoàn thành", value: "Chưa hoàn thành" },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          ✍️ Chấm Bài & Nhập Điểm Nhanh
        </h2>
        <button
          onClick={onOpenNewAssignment}
          className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          ➕ Giao Bài Tập Mới
        </button>
      </div>

      <div className="max-w-md mb-6">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Chọn bài tập cần chấm:
        </label>
        <select
          value={selectedAsgId}
          onChange={(e) => setSelectedAsgId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
        >
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              [{a.subject}] {a.title} (Hạn: {a.due_date})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Camera & Student Selector */}
        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 mb-2">📸 Quét mã QR trên vở học sinh</h3>
          <div className="relative aspect-[4/3] max-w-sm mx-auto bg-black rounded-xl overflow-hidden mb-3">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-36 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            <div className="absolute bottom-2 inset-x-0 text-center text-white text-[11px]">
              Đưa mã QR trên vở vào khung
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {!isCameraActive ? (
              <button
                onClick={startGradeCamera}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
              >
                Bật Camera Quét
              </button>
            ) : (
              <button
                onClick={stopGradeCamera}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
              >
                Tắt Camera
              </button>
            )}
          </div>

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Hoặc chọn nhanh học sinh trong lớp:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
            {students.map((st) => (
              <button
                key={st.id}
                onClick={() => selectStudent(st)}
                className={`px-2 py-1.5 rounded text-left text-xs font-medium truncate transition ${
                  selectedStudent?.id === st.id
                    ? "bg-indigo-600 text-white font-bold"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                {st.order_num}. {st.full_name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Grading Form */}
        <div>
          {selectedStudent ? (
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedStudent.order_num}. {selectedStudent.full_name}
                  </h3>
                  <p className="text-xs text-slate-500">Mã: {selectedStudent.code} • Lớp: {selectedStudent.class_name}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                  {history.filter((h) => h.event_type.includes("submit")).length > 0
                    ? `Lần nộp: ${history.filter((h) => h.event_type.includes("submit")).length}`
                    : "Chưa có lượt quét"}
                </span>
              </div>

              {/* Previous history */}
              {history.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs mb-4 max-h-32 overflow-y-auto border border-slate-200">
                  <strong className="block text-slate-700 mb-1">Lịch sử các lần trước:</strong>
                  {history.map((ev, idx) => (
                    <div key={idx} className="text-slate-600 py-0.5 border-b border-slate-100 last:border-0">
                      {ev.event_type.includes("submit") ? (
                        <span>📥 Lần {ev.attempt_number} nộp: {ev.timestamp} ({ev.is_late ? "Trễ hạn" : "Đúng hạn"})</span>
                      ) : (
                        <span>✏️ Lần {ev.attempt_number} chấm: Điểm: {ev.score ?? "-"} | {ev.status} | {ev.teacher_note || "Không nhận xét"}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Score input */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Điểm số (Thang điểm 10):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Nhập điểm..."
                  className="w-full text-center text-2xl font-extrabold text-indigo-600 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[10, 9.5, 9, 8.5, 8, 7, 6, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setQuickScore(val)}
                      className={`w-9 h-9 rounded-lg border font-bold text-xs transition ${
                        score === String(val)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kết quả đánh giá:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                        status === opt.value
                          ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher note */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nhận xét của cô:
                </label>
                <input
                  type="text"
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Ghi chú nhận xét ngắn..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["✨ Sạch đẹp, tốt", "⚠️ Cẩn thận tính toán", "✍️ Rèn chữ viết", "👏 Đã sửa đúng, tiến bộ"].map((t) => (
                    <button
                      key={t}
                      onClick={() => addQuickNote(t)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={submitGrading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
                >
                  💾 Lưu Điểm & Chấm Tiếp
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
              <div className="text-4xl mb-3">📑</div>
              <h4 className="text-base font-bold text-slate-700 mb-1">Chưa chọn học sinh</h4>
              <p className="text-xs max-w-xs">
                Hãy quét mã QR trên vở hoặc bấm vào tên học sinh ở danh sách bên trái để chấm bài.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
