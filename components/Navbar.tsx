"use client";

import React from "react";
import { Settings } from "@/lib/types";

interface NavbarProps {
  settings: Settings;
  activeTab: string;
  isKioskLocked: boolean;
  onSelectTab: (tab: string) => void;
  onEnterKiosk: () => void;
  onUnlockTeacher: () => void;
  onLogout?: () => void;
}

export default function Navbar({
  settings,
  activeTab,
  isKioskLocked,
  onSelectTab,
  onEnterKiosk,
  onUnlockTeacher,
  onLogout,
}: NavbarProps) {
  const tabs = [
    { id: "kiosk", label: "🎯 Góc Nộp Bài" },
    { id: "grade", label: "✍️ Chấm Bài Nhanh", highlight: true },
    { id: "tracking", label: "📋 Bảng Theo Dõi Bài" },
    { id: "analytics", label: "📊 Thống Kê 3 Chiều" },
    { id: "students", label: "👤 Hồ Sơ Học Sinh" },
    { id: "print", label: "🏷️ In Thẻ QR Mini (A4)" },
    { id: "settings", label: "⚙️ Cài Đặt & Google Sheets" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl shadow-md">
            📚
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {settings.class_name || "Lớp 3A7"} • {settings.teacher_name || "Cô Linh"}
            </h1>
            <p className="text-xs text-slate-500">
              {settings.school_name || "Trường Tiểu Học Ánh Dương"} • Hệ Thống Nộp Bài & Điểm Số
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isKioskLocked ? (
            <>
              <button
                onClick={onEnterKiosk}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                🎯 Góc Nộp Bài
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center gap-1"
                >
                  🚪 Đăng Xuất
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onUnlockTeacher}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
            >
              🔒 Mở Khóa Giáo Viên
            </button>
          )}
        </div>
      </div>

      {!isKioskLocked && (
        <nav className="border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none bg-white">
          <div className="max-w-7xl mx-auto px-4 flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                    isActive
                      ? "text-indigo-600 border-indigo-600 bg-indigo-50/40"
                      : tab.highlight
                      ? "text-amber-600 border-transparent hover:text-amber-700 hover:bg-slate-50"
                      : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
