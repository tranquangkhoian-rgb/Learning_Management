"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Student, Assignment, Settings } from "@/lib/types";

interface StudentPortalProps {
  student: Student;
  settings: Settings;
  onLogout: () => void;
  assignments: Assignment[];
}

interface StudentProfileData {
  student: Student;
  assignments: {
    assignment_id?: number;
    id?: number;
    title?: string;
    assignment_title?: string;
    subject?: string;
    due_date?: string;
    submit_count?: number;
    status?: string;
    latest_status?: string;
    latest_score?: number | null;
    teacher_note?: string | null;
    is_late?: boolean;
  }[];
}

export default function StudentPortal({
  student,
  settings,
  onLogout,
  assignments,
}: StudentPortalProps) {
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [selectedAsgId, setSelectedAsgId] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/student-profile/${student.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (e) {
      console.error("Error fetching student profile", e);
    }
  }, [student.id]);

  useEffect(() => {
    fetchProfile();
    if (assignments.length > 0) {
      setSelectedAsgId(assignments[0].id);
    }
  }, [fetchProfile, assignments]);

  const handleSubmitAssignment = async () => {
    if (!selectedAsgId) {
      alert("Vui lòng chọn bài tập muốn nộp!");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/scan-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_code: student.code,
          assignment_id: Number(selectedAsgId),
          operator: "Học sinh",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg(`🎉 Tuyệt vời! Em đã nộp bài thành công cho Cô Linh.`);
        setTimeout(() => setAlertMsg(null), 4000);
        await fetchProfile();
      } else {
        alert(data.error || "Không thể nộp bài tập!");
      }
    } catch (e) {
      alert("Lỗi khi nộp bài: " + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const asgList = profileData?.assignments || [];
  const submittedList = asgList.filter((a) => (a.submit_count || 0) > 0);
  const passedList = asgList.filter(
    (a) => (a.status || a.latest_status) === "Đã đạt" || (a.latest_score !== null && a.latest_score !== undefined && a.latest_score >= 8)
  );
  const gradedList = asgList.filter((a) => a.latest_score !== null && a.latest_score !== undefined);
  const avgScore =
    gradedList.length > 0
      ? (gradedList.reduce((acc, a) => acc + Number(a.latest_score), 0) / gradedList.length).toFixed(1)
      : "-";

  const lastName = student.full_name.trim().split(" ").pop() || "A";
  const initial = lastName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Student Top Bar */}
      <header className="bg-white border-b-2 border-emerald-500 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/20">
              🎒
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-tight">
                Cổng Thông Tin Học Sinh • {settings.class_name || "Lớp 3A7"}
              </h1>
              <p className="text-xs text-slate-500">
                {settings.school_name || "Trường Tiểu Học Ánh Dương"} • GVCN: {settings.teacher_name || "Cô Linh"}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>🚪</span> Đăng Xuất (Đổi Học Sinh)
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Alert Toast */}
        {alertMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
            {alertMsg}
          </div>
        )}

        {/* Student Profile Hero Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white text-3xl font-black flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
              {initial}
            </div>
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-extrabold uppercase tracking-wide">
                🎒 Học Sinh Lớp 3A7
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                {student.order_num}. {student.full_name}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-medium">
                <span>🏷️ Mã: <strong className="text-slate-800 font-mono">{student.code}</strong></span>
                <span>🔢 STT: <strong className="text-slate-800">{student.order_num}</strong></span>
                <span>🏫 Lớp: <strong className="text-slate-800">3A7</strong></span>
                <span>👩‍🏫 GVCN: <strong className="text-slate-800">{settings.teacher_name || "Cô Linh"}</strong></span>
              </div>
            </div>
          </div>

          <div className="w-20 h-20 p-2 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center shadow-sm">
            <img
              src={`/api/qr?text=${encodeURIComponent(student.code)}`}
              alt={student.code}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl mb-1">📝</div>
            <div className="text-3xl font-black text-slate-900">{asgList.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Tổng bài được giao</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl mb-1 text-blue-500">📥</div>
            <div className="text-3xl font-black text-blue-600">{submittedList.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Đã nộp bài</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl mb-1 text-indigo-500">⭐</div>
            <div className="text-3xl font-black text-indigo-600">{avgScore}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Điểm trung bình của em</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl mb-1 text-emerald-500">🏆</div>
            <div className="text-3xl font-black text-emerald-600">{passedList.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Bài đạt xuất sắc / chuẩn</div>
          </div>
        </div>

        {/* Quick Self-Submit Banner */}
        <div className="bg-gradient-to-r from-indigo-50 via-indigo-100/70 to-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
              📤 Tự Nộp Bài Tập
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Hôm nay con có bài tập muốn nộp cho Cô Linh?
            </h3>
            <p className="text-xs text-indigo-700">
              Chọn bài tập bên cạnh rồi nhấn nút nộp bài nhé!
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedAsgId}
              onChange={(e) => setSelectedAsgId(e.target.value)}
              className="flex-1 md:w-64 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.subject}] {a.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleSubmitAssignment}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold whitespace-nowrap shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSubmitting ? "Đang nộp..." : "🚀 Nộp Bài Ngay"}
            </button>
          </div>
        </div>

        {/* Assignments Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                📋 Bảng Điểm & Lời Nhận Xét Của Cô Linh Cho Riêng Em
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                🔒 Điểm số được bảo mật tuyệt đối, chỉ mình con xem được
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Tên Bài Tập</th>
                  <th className="px-5 py-3">Môn Học</th>
                  <th className="px-5 py-3">Hạn Nộp</th>
                  <th className="px-5 py-3">Trạng Thái</th>
                  <th className="px-5 py-3 text-center">Điểm Số</th>
                  <th className="px-5 py-3">Lời Nhận Xét Của Cô Linh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asgList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                      Hiện tại chưa có bài tập nào được giao.
                    </td>
                  </tr>
                ) : (
                  asgList.map((a, idx) => {
                    const status = a.status || a.latest_status || "Chưa nộp";
                    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    if (status === "Đã đạt") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    else if (status === "Cần sửa" || status === "Cần nộp lại") badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    else if (status === "Chưa nộp") badgeClass = "bg-red-50 text-red-700 border-red-200";
                    else if (status === "Nộp trễ") badgeClass = "bg-orange-50 text-orange-700 border-orange-200";

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {a.title || a.assignment_title}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            {a.subject || "Bài tập"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {a.due_date ? a.due_date.replace("T", " ") : "-"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {a.latest_score !== null && a.latest_score !== undefined ? (
                            <span className="text-base font-black text-indigo-600">
                              {a.latest_score}<span className="text-xs text-slate-400 font-normal">/10</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Chưa chấm</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {a.teacher_note ? (
                            <div className="p-2.5 rounded-lg bg-amber-50 border-l-4 border-amber-400 text-amber-900 text-xs leading-relaxed font-medium">
                              💬 <strong>Cô Linh:</strong> "{a.teacher_note}"
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa có lời nhận xét</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
