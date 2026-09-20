"use client";

import React, { useState, useEffect } from "react";
import { Assignment, TrackingRow, SubmissionEvent } from "@/lib/types";

interface TrackingViewProps {
  assignments: Assignment[];
}

export default function TrackingView({ assignments }: TrackingViewProps) {
  const [selectedAsgId, setSelectedAsgId] = useState<number | "">("");
  const [matrix, setMatrix] = useState<TrackingRow[]>([]);
  const [search, setSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    studentName: string;
    events: SubmissionEvent[];
  }>({ open: false, studentName: "", events: [] });

  useEffect(() => {
    if (assignments.length > 0 && !selectedAsgId) {
      setSelectedAsgId(assignments[0].id);
    }
  }, [assignments, selectedAsgId]);

  const loadMatrix = async (aid: number) => {
    try {
      const res = await fetch(`/api/tracking/${aid}`);
      const data = await res.json();
      setMatrix(data.matrix || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedAsgId) {
      loadMatrix(Number(selectedAsgId));
    }
  }, [selectedAsgId]);

  const filtered = matrix.filter((row) => {
    const matchSearch = row.full_name.toLowerCase().includes(search.toLowerCase()) || row.code.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    if (filterStatus === "ALL") return true;
    if (filterStatus === "CHUA_NOP") return row.submit_count === 0;
    if (filterStatus === "DUNG_HAN") return row.submit_count > 0 && !row.is_late && row.current_status !== "Nộp trễ";
    if (filterStatus === "NOP_TRE") return row.is_late || row.current_status === "Nộp trễ";
    if (filterStatus === "CAN_SUA") return row.current_status.includes("sửa");
    if (filterStatus === "DA_NOP_LAI") return row.submit_count > 1;
    if (filterStatus === "HOAN_THANH") return row.current_status === "Đã hoàn thành";
    return true;
  });

  const viewHistory = async (studentId: number, studentName: string) => {
    try {
      const res = await fetch(`/api/history?student_id=${studentId}&assignment_id=${selectedAsgId}`);
      const events = await res.json();
      setHistoryModal({ open: true, studentName, events: Array.isArray(events) ? events : [] });
    } catch {
      alert("Lỗi khi tải lịch sử!");
    }
  };

  const getStatusBadge = (row: TrackingRow) => {
    const map = {
      green: "bg-emerald-50 text-emerald-700 border-emerald-200",
      yellow: "bg-amber-50 text-amber-800 border-amber-200",
      orange: "bg-orange-50 text-orange-800 border-orange-200",
      red: "bg-rose-50 text-rose-800 border-rose-200",
      blue: "bg-blue-50 text-blue-800 border-blue-200",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[row.color_group]}`}>
        {row.current_status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          📋 Bảng Theo Dõi Tiến Độ Bài Tập
        </h2>
        <a
          href={`/api/export-csv?assignment_id=${selectedAsgId}`}
          className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          📥 Xuất File Excel / CSV
        </a>
      </div>

      {/* Select & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <select
          value={selectedAsgId}
          onChange={(e) => setSelectedAsgId(Number(e.target.value))}
          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
        >
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              [{a.subject}] {a.title}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm kiếm học sinh..."
          className="px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 text-sm"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[
          { key: "ALL", label: `Tất cả (${matrix.length})` },
          { key: "CHUA_NOP", label: "🔴 Chưa nộp" },
          { key: "DUNG_HAN", label: "🔵 Đã nộp đúng hạn" },
          { key: "NOP_TRE", label: "🟠 Nộp trễ" },
          { key: "CAN_SUA", label: "🟡 Đang cần sửa" },
          { key: "DA_NOP_LAI", label: "🔵 Đã nộp lại" },
          { key: "HOAN_THANH", label: "🟢 Đã hoàn thành" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
              filterStatus === f.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 11-column Responsive Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
              <th className="py-3 px-3.5">STT</th>
              <th className="py-3 px-3.5">Mã</th>
              <th className="py-3 px-3.5">Họ và Tên</th>
              <th className="py-3 px-3.5">Trạng Thái</th>
              <th className="py-3 px-3.5">Thời Gian Nộp</th>
              <th className="py-3 px-3.5">Hạn</th>
              <th className="py-3 px-3.5 text-center">Lần Nộp</th>
              <th className="py-3 px-3.5 text-center">Làm Lại</th>
              <th className="py-3 px-3.5 text-center">Điểm 1</th>
              <th className="py-3 px-3.5 text-center">Điểm Cuối</th>
              <th className="py-3 px-3.5">Nhận Xét</th>
              <th className="py-3 px-3.5">Lịch Sử</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row, idx) => (
              <tr key={row.student_id} className="hover:bg-slate-50/70 transition">
                <td className="py-3 px-3.5 font-bold text-slate-500">{row.stt || (row as any).order_num || (idx + 1)}</td>
                <td className="py-3 px-3.5 font-mono text-xs text-slate-600">{row.code || "-"}</td>
                <td className="py-3 px-3.5 font-bold text-slate-900">{row.full_name || "-"}</td>
                <td className="py-3 px-3.5">{getStatusBadge(row)}</td>
                <td className="py-3 px-3.5 text-xs text-slate-500">
                  {row.latest_submit_time ? (row.latest_submit_time.includes(" ") ? row.latest_submit_time.split(" ")[1] : row.latest_submit_time) : "-"}
                </td>
                <td className="py-3 px-3.5 text-xs">
                  {(row.submit_count ?? 0) === 0 ? "-" : row.is_late ? (
                    <span className="text-orange-600 font-bold">Trễ hạn</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Đúng hạn</span>
                  )}
                </td>
                <td className="py-3 px-3.5 text-center font-bold">{row.submit_count ?? 0}</td>
                <td className={`py-3 px-3.5 text-center font-bold ${(row.retry_count ?? 0) > 0 ? "text-amber-600" : ""}`}>
                  {row.retry_count ?? 0}
                </td>
                <td className="py-3 px-3.5 text-center font-bold text-indigo-600">
                  {row.first_score !== null && row.first_score !== undefined ? row.first_score : "-"}
                </td>
                <td className="py-3 px-3.5 text-center font-extrabold text-indigo-600">
                  {row.latest_score !== null && row.latest_score !== undefined ? row.latest_score : "-"}
                </td>
                <td className="py-3 px-3.5 text-xs text-slate-600 max-w-[180px] truncate">
                  {row.teacher_note || "-"}
                </td>
                <td className="py-3 px-3.5">
                  <button
                    onClick={() => viewHistory(row.student_id, row.full_name)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                  >
                    📜 Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {historyModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">
                Lịch Sử: {historyModal.studentName}
              </h3>
              <button
                onClick={() => setHistoryModal({ open: false, studentName: "", events: [] })}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            {historyModal.events.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Chưa có lịch sử nộp/chấm bài.</p>
            ) : (
              <div className="space-y-3 relative pl-6 border-l-2 border-indigo-100">
                {historyModal.events.map((ev) => {
                  const isSubmit = ev.event_type.includes("submit");
                  return (
                    <div key={ev.id} className="relative">
                      <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isSubmit ? "bg-indigo-600" : "bg-emerald-600"}`} />
                      <div className="bg-slate-50 rounded-xl p-3 text-xs">
                        <div className="text-[11px] text-slate-400 mb-0.5">
                          {ev.timestamp} • Thao tác: <strong>{ev.operator}</strong>
                        </div>
                        <div className="font-bold text-slate-800">
                          {isSubmit
                            ? `📥 Nộp bài (Lần ${ev.attempt_number}) - ${ev.is_late ? "Trễ hạn" : "Đúng hạn"}`
                            : `✏️ Chấm điểm (Lần ${ev.attempt_number})`}
                        </div>
                        {ev.score !== null && (
                          <div className="mt-1 font-semibold text-indigo-700">
                            Điểm: {ev.score} | Trạng thái: {ev.status}
                          </div>
                        )}
                        {ev.teacher_note && (
                          <div className="italic text-slate-600 mt-1">Nhận xét: &ldquo;{ev.teacher_note}&rdquo;</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
