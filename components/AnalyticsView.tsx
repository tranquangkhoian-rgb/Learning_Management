"use client";

import React, { useState, useEffect } from "react";
import { AnalyticsData } from "@/lib/types";

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [subTab, setSubTab] = useState<"student" | "assignment">("student");

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (!data) {
    return <div className="p-8 text-center text-slate-400">Đang tải thống kê...</div>;
  }

  const { whole_class, student_stats, assignment_stats } = data;

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sĩ Số Lớp</div>
          <div className="text-3xl font-extrabold text-slate-900">{whole_class.total_students}</div>
          <div className="text-xs text-slate-500 mt-1">Học sinh lớp 3A7</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng Số Bài Đã Giao</div>
          <div className="text-3xl font-extrabold text-slate-900">{whole_class.total_assignments}</div>
          <div className="text-xs text-slate-500 mt-1">Các môn học</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tỷ Lệ Hoàn Thành Cả Lớp</div>
          <div className="text-3xl font-extrabold text-emerald-600">{whole_class.class_completion_rate}%</div>
          <div className="text-xs text-slate-500 mt-1">Đạt yêu cầu hoàn thành</div>
        </div>
      </div>

      {/* 4 Insight Highlight Cards (Mục 7.3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-extrabold uppercase text-emerald-700 mb-2 flex items-center gap-1.5">
            🌟 Nộp Đủ & Đúng Hạn
          </h4>
          <ul className="text-xs space-y-1.5 divide-y divide-slate-100">
            {whole_class.top_on_time.map((s) => (
              <li key={s.student_id} className="pt-1.5 flex justify-between">
                <span className="font-semibold text-slate-800">{s.code} - {s.full_name}</span>
                <span className="font-bold text-emerald-600">{s.on_time_count} bài</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-extrabold uppercase text-rose-700 mb-2 flex items-center gap-1.5">
            ⚠️ Còn Thiếu Bài Tập
          </h4>
          <ul className="text-xs space-y-1.5 divide-y divide-slate-100">
            {whole_class.top_missing.map((s) => (
              <li key={s.student_id} className="pt-1.5 flex justify-between">
                <span className="font-semibold text-slate-800">{s.code} - {s.full_name}</span>
                <span className="font-bold text-rose-600">{s.num_missing} bài</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-extrabold uppercase text-orange-700 mb-2 flex items-center gap-1.5">
            ⏰ Thường Nộp Trễ Hạn
          </h4>
          <ul className="text-xs space-y-1.5 divide-y divide-slate-100">
            {whole_class.top_late.map((s) => (
              <li key={s.student_id} className="pt-1.5 flex justify-between">
                <span className="font-semibold text-slate-800">{s.code} - {s.full_name}</span>
                <span className="font-bold text-orange-600">{s.late_count} lần</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-extrabold uppercase text-indigo-700 mb-2 flex items-center gap-1.5">
            👏 Tiến Bộ Sau Khi Sửa
          </h4>
          <ul className="text-xs space-y-1.5 divide-y divide-slate-100">
            {whole_class.top_improved.map((s) => (
              <li key={s.student_id} className="pt-1.5 flex justify-between">
                <span className="font-semibold text-slate-800">{s.code} - {s.full_name}</span>
                <span className="font-bold text-indigo-600">+{s.improved_count} bài</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sub-tab Detail Tables */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-base font-bold text-slate-900">📊 Chi Tiết Thống Kê</h3>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSubTab("student")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                subTab === "student" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
              }`}
            >
              Theo Từng Học Sinh
            </button>
            <button
              onClick={() => setSubTab("assignment")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                subTab === "assignment" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
              }`}
            >
              Theo Từng Bài Tập
            </button>
          </div>
        </div>

        {subTab === "student" ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã</th>
                  <th className="py-2.5 px-3">Họ Tên</th>
                  <th className="py-2.5 px-3 text-center">Đã Nộp</th>
                  <th className="py-2.5 px-3 text-center">Chưa Nộp</th>
                  <th className="py-2.5 px-3 text-center">Đúng Hạn</th>
                  <th className="py-2.5 px-3 text-center">Nộp Trễ</th>
                  <th className="py-2.5 px-3 text-center">Cần Làm Lại</th>
                  <th className="py-2.5 px-3 text-center">Hoàn Thành</th>
                  <th className="py-2.5 px-3 text-center">ĐTB</th>
                  <th className="py-2.5 px-3 text-center">Tiến Bộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student_stats.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono">{s.code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.full_name}</td>
                    <td className="py-2.5 px-3 text-center">{s.num_submitted ?? 0}/{s.total_assigned ?? 0}</td>
                    <td className={`py-2.5 px-3 text-center font-bold ${(s.num_missing ?? 0) > 0 ? "text-rose-600" : ""}`}>
                      {s.num_missing ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{s.on_time_count ?? 0}</td>
                    <td className="py-2.5 px-3 text-center text-orange-600">{s.late_count ?? 0}</td>
                    <td className="py-2.5 px-3 text-center">{s.asg_requiring_retry_count ?? 0}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{s.num_completed ?? 0}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-indigo-600">{s.avg_score ?? "-"}</td>
                    <td className="py-2.5 px-3 text-center">
                      {(s.improved_count ?? 0) > 0 ? <span className="text-indigo-600 font-bold">👏 +{s.improved_count}</span> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tên Bài Tập</th>
                  <th className="py-2.5 px-3">Môn</th>
                  <th className="py-2.5 px-3">Hạn Nộp</th>
                  <th className="py-2.5 px-3 text-center">Đã Nộp</th>
                  <th className="py-2.5 px-3 text-center">Chưa Nộp</th>
                  <th className="py-2.5 px-3 text-center">Đúng Hạn</th>
                  <th className="py-2.5 px-3 text-center">Trễ Hạn</th>
                  <th className="py-2.5 px-3 text-center">Cần Sửa</th>
                  <th className="py-2.5 px-3 text-center">Đã Nộp Lại</th>
                  <th className="py-2.5 px-3 text-center">Hoàn Thành</th>
                  <th className="py-2.5 px-3 text-center">ĐTB Lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignment_stats.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{a.title}</td>
                    <td className="py-2.5 px-3">{a.subject}</td>
                    <td className="py-2.5 px-3 text-slate-500">{a.due_date}</td>
                    <td className="py-2.5 px-3 text-center">{a.num_submitted ?? 0}/{a.total_students ?? 0}</td>
                    <td className={`py-2.5 px-3 text-center font-bold ${(a.num_missing ?? 0) > 0 ? "text-rose-600" : ""}`}>
                      {a.num_missing ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{a.num_on_time ?? 0}</td>
                    <td className="py-2.5 px-3 text-center text-orange-600">{a.num_late ?? 0}</td>
                    <td className="py-2.5 px-3 text-center text-amber-600 font-bold">{a.num_need_fix ?? 0}</td>
                    <td className="py-2.5 px-3 text-center text-blue-600">{a.num_resubmitted ?? 0}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{a.num_completed ?? 0}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-indigo-600">{a.class_avg_score ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
