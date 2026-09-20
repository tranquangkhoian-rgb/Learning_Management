"use client";

import React, { useState } from "react";
import { Student, Settings } from "@/lib/types";

interface LoginViewProps {
  students: Student[];
  settings: Settings;
  onTeacherLogin: () => void;
  onStudentLogin: (student: Student) => void;
  onEnterKiosk: () => void;
}

export default function LoginView({
  students,
  settings,
  onTeacherLogin,
  onStudentLogin,
  onEnterKiosk,
}: LoginViewProps) {
  const [roleTab, setRoleTab] = useState<"teacher" | "student">("teacher");
  const [pinInput, setPinInput] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<boolean>(false);
  const [studentCodeInput, setStudentCodeInput] = useState<string>("");
  const [studentError, setStudentError] = useState<string>("");

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings.teacher_pin || "1234";
    if (pinInput.trim() === correctPin) {
      setPinError(false);
      onTeacherLogin();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = studentCodeInput.trim().toUpperCase();
    if (!code) {
      setStudentError("Vui lòng nhập mã học sinh (ví dụ: HS01)");
      return;
    }
    const st = students.find((s) => s.code.toUpperCase() === code);
    if (st) {
      setStudentError("");
      onStudentLogin(st);
    } else {
      setStudentError(`Không tìm thấy học sinh với mã "${code}" trong Lớp 3A7!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white text-3xl shadow-lg shadow-indigo-500/20">
            🏫
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hệ Thống Nộp Bài & Điểm Số
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {settings.school_name || "Trường Tiểu Học Ánh Dương"} • {settings.class_name || "Lớp 3A7"} • GVCN: {settings.teacher_name || "Cô Linh"}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          
          {/* Role Tabs Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 gap-1">
            <button
              type="button"
              onClick={() => setRoleTab("teacher")}
              className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                roleTab === "teacher"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>👩‍🏫</span> Dành Cho Giáo Viên
            </button>
            <button
              type="button"
              onClick={() => setRoleTab("student")}
              className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                roleTab === "student"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🎒</span> Dành Cho Học Sinh
            </button>
          </div>

          {/* Teacher Pane */}
          {roleTab === "teacher" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 text-xl font-bold mb-1">
                  👩‍🏫
                </div>
                <h3 className="text-lg font-bold text-slate-900">Đăng Nhập Cô Linh (GVCN)</h3>
                <p className="text-xs text-slate-500">
                  Quản lý chấm bài, theo dõi 11 cột, thống kê và in thẻ QR
                </p>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mã PIN Bảo Mật:
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      maxLength={10}
                      placeholder="Nhập mã PIN (Mặc định: 1234)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono tracking-widest text-center text-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm"
                    >
                      {showPin ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {pinError && (
                    <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center">
                      ❌ Mã PIN không chính xác! Vui lòng thử lại.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-remember"
                    defaultChecked
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="chk-remember" className="text-xs text-slate-500 select-none cursor-pointer">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all"
                >
                  Đăng Nhập Quản Trị 🚀
                </button>
              </form>

              <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                💡 Gợi ý: Mã PIN mặc định là <strong className="text-slate-700">1234</strong>
              </div>
            </div>
          )}

          {/* Student Pane */}
          {roleTab === "student" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 text-xl font-bold mb-1">
                  🎒
                </div>
                <h3 className="text-lg font-bold text-slate-900">Cổng Thông Tin Học Sinh Lớp 3A7</h3>
                <p className="text-xs text-slate-500">
                  Xem điểm số cá nhân, lời cô nhận xét và nộp bài tập
                </p>
              </div>

              {/* Code Input */}
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nhập mã học sinh:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    placeholder="Ví dụ: HS01 ... HS29"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono uppercase tracking-widest text-center font-bold"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    Vào Xem ➔
                  </button>
                </div>
                {studentError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center">
                    {studentError}
                  </div>
                )}
              </form>

              {/* 29 Students Picker Grid */}
              <div className="space-y-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Hoặc chạm vào tên của con
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {students.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onStudentLogin(st)}
                      className="p-2 text-left rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-all"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {st.order_num}
                      </span>
                      <span className="truncate">{st.full_name}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Kiosk Shortcut Card */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-900/20">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              🎯
            </div>
            <div>
              <h4 className="font-bold text-sm">Góc Nộp Bài Tự Quản Tại Lớp (Kiosk)</h4>
              <p className="text-xs text-indigo-200">
                Xếp hàng quét mã QR trên vở trên máy tính lớp học (không cần mật khẩu)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEnterKiosk}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs whitespace-nowrap shadow-md"
          >
            Vào Nhanh Góc Nộp Bài ➔
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          © 2026 Lớp 3A7 • Trường Tiểu Học Ánh Dương • Hệ Thống Nộp Bài & Điểm Số Cô Linh
        </div>

      </div>
    </div>
  );
}
