"use client";

import React, { useState } from "react";
import { Settings } from "@/lib/types";

interface SettingsViewProps {
  settings: Settings;
  onSaved: () => void;
}

export default function SettingsView({ settings, onSaved }: SettingsViewProps) {
  const [formData, setFormData] = useState<Settings>(settings);
  const [testResult, setTestResult] = useState<{ status: "idle" | "loading" | "success" | "error"; message?: string }>({
    status: "idle",
  });

  const handleChange = (field: keyof Settings, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("✅ Đã lưu cài đặt thành công!");
        onSaved();
      }
    } catch {
      alert("Lỗi khi lưu cài đặt!");
    }
  };

  const testConnection = async () => {
    if (!formData.google_sheet_url?.trim()) {
      alert("Vui lòng nhập đường dẫn Google Sheets Web App trước!");
      return;
    }
    setTestResult({ status: "loading" });
    try {
      const res = await fetch("/api/test-google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formData.google_sheet_url.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ status: "success", message: "Kết nối thành công! Đã gửi dữ liệu kiểm tra lên Google Sheet." });
      } else {
        setTestResult({ status: "error", message: `Thất bại: ${data.error}` });
      }
    } catch (e) {
      setTestResult({ status: "error", message: `Lỗi kết nối: ${String(e)}` });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold text-slate-900 mb-6">
        ⚙️ Cài Đặt Hệ Thống & Tự Động Đồng Bộ Google Sheets
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Google Sheets */}
        <div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 mb-5">
            <h3 className="text-sm font-extrabold text-emerald-900 mb-1 flex items-center gap-1.5">
              🟢 Phương Án B: Tự Động Cập Nhật Lên Google Sheets
            </h3>
            <p className="text-xs text-emerald-700 mb-4">
              Mỗi khi học sinh nộp vở tại góc lớp hoặc Cô Linh chấm điểm, dữ liệu sẽ tự động đẩy ngay lập tức lên Google Sheet online theo thời gian thực!
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Đường dẫn Google Sheets Web App URL:
              </label>
              <input
                type="text"
                value={formData.google_sheet_url || ""}
                onChange={(e) => handleChange("google_sheet_url", e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={testConnection}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                🔗 Kiểm Tra Kết Nối
              </button>
              <button
                onClick={handleSave}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
              >
                💾 Lưu Cài Đặt
              </button>
            </div>

            {testResult.status === "loading" && (
              <p className="text-xs text-indigo-600 mt-2">⏳ Đang gửi dữ liệu kiểm tra...</p>
            )}
            {testResult.status === "success" && (
              <p className="text-xs text-emerald-700 font-bold mt-2">✅ {testResult.message}</p>
            )}
            {testResult.status === "error" && (
              <p className="text-xs text-rose-600 font-bold mt-2">❌ {testResult.message}</p>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <h4 className="font-bold text-slate-800 mb-2">📖 Hướng dẫn thiết lập Google Sheets trong 1 phút:</h4>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Mở file Google Sheets trên trình duyệt.</li>
              <li>Chọn menu <strong>Tiện ích mở rộng (Extensions)</strong> $\rightarrow$ <strong>Apps Script</strong>.</li>
              <li>Dán mã từ file <code className="bg-slate-200 px-1 rounded">google_sheet_script.js</code> vào.</li>
              <li>Bấm <strong>Triển khai (Deploy)</strong> $\rightarrow$ <strong>Tùy chọn triển khai mới</strong> $\rightarrow$ Chọn ai có quyền truy cập: <em>Bất kỳ ai (Anyone)</em>.</li>
              <li>Sao chép link Web App dán vào ô bên trên. Xong!</li>
            </ol>
          </div>
        </div>

        {/* Right: Class & Teacher Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            🏫 Thông Tin Lớp Học & Bảo Mật
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tên Lớp:
            </label>
            <input
              type="text"
              value={formData.class_name || ""}
              onChange={(e) => handleChange("class_name", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tên Giáo Viên:
            </label>
            <input
              type="text"
              value={formData.teacher_name || ""}
              onChange={(e) => handleChange("teacher_name", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tên Trường:
            </label>
            <input
              type="text"
              value={formData.school_name || ""}
              onChange={(e) => handleChange("school_name", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Mã PIN Khóa Góc Nộp Bài (Bảo Mật):
            </label>
            <input
              type="password"
              maxLength={6}
              value={formData.teacher_pin || ""}
              onChange={(e) => handleChange("teacher_pin", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dùng để giáo viên mở khóa khi muốn thoát khỏi chế độ nộp bài của học sinh.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
          >
            💾 Lưu Cài Đặt Hệ Thống
          </button>
        </div>
      </div>
    </div>
  );
}
