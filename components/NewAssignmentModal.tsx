"use client";

import React, { useState } from "react";

interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewAssignmentModal({ isOpen, onClose, onCreated }: NewAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [maxScore, setMaxScore] = useState("10");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      alert("Vui lòng nhập Tên bài tập và Hạn nộp!");
      return;
    }

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          assigned_date: assignedDate,
          due_date: dueDate.replace("T", " "),
          max_score: Number(maxScore),
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        alert("✅ Đã tạo bài tập mới thành công!");
        onCreated();
        onClose();
      }
    } catch {
      alert("Lỗi khi tạo bài tập!");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-base text-slate-900">➕ Giao Bài Tập Mới</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên Bài Tập:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Phiếu bài tập Toán tuần 4"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Môn Học:</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
            >
              <option value="Toán">Toán</option>
              <option value="Tiếng Việt">Tiếng Việt</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Tự nhiên & Xã hội">Tự nhiên & Xã hội</option>
              <option value="Đạo đức">Đạo đức</option>
              <option value="Môn khác">Môn khác</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ngày Giao:</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hạn Nộp:</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Thang Điểm:</label>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghi Chú Yêu Cầu:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Yêu cầu học sinh nộp vở tại góc lớp..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              Tạo Bài Tập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
