"use client";

import React, { useState, useEffect } from "react";
import { Student } from "@/lib/types";

interface StudentProfileViewProps {
  students: Student[];
}

interface ProfileAssignment {
  assignment_id: number;
  title: string;
  subject: string;
  due_date: string;
  submit_count: number;
  retry_count: number;
  first_score: number | null;
  latest_score: number | null;
  status: string;
  color: string;
  teacher_note: string;
}

export default function StudentProfileView({ students }: StudentProfileViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");
  const [profileData, setProfileData] = useState<{
    student: Student;
    assignments: ProfileAssignment[];
  } | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const loadProfile = async (sid: number) => {
    try {
      const res = await fetch(`/api/student-profile/${sid}`);
      const json = await res.json();
      setProfileData(json);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadProfile(Number(selectedStudentId));
    }
  }, [selectedStudentId]);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          👤 Hồ Sơ Học Tập Học Sinh
        </h2>
      </div>

      <div className="max-w-xs mb-6">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Chọn học sinh:
        </label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.order_num}. {s.full_name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      {profileData && (
        <div>
          {/* Header Card */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-extrabold shadow-md">
              {profileData.student.full_name.split(" ").pop()?.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {profileData.student.order_num}. {profileData.student.full_name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Mã: <strong>{profileData.student.code}</strong> • {profileData.student.class_name} • Giới tính: {profileData.student.gender}
              </p>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-800 mb-3">📚 Tiến trình từng bài tập:</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-3.5">Tên Bài Tập</th>
                  <th className="py-3 px-3.5">Môn</th>
                  <th className="py-3 px-3.5">Hạn Nộp</th>
                  <th className="py-3 px-3.5">Trạng Thái</th>
                  <th className="py-3 px-3.5 text-center">Lần Nộp</th>
                  <th className="py-3 px-3.5 text-center">Làm Lại</th>
                  <th className="py-3 px-3.5 text-center">Điểm 1</th>
                  <th className="py-3 px-3.5 text-center">Điểm Cuối</th>
                  <th className="py-3 px-3.5">Nhận Xét</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profileData.assignments.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-bold text-slate-900">{a.title}</td>
                    <td className="py-3 px-3.5 text-slate-600">{a.subject}</td>
                    <td className="py-3 px-3.5 text-xs text-slate-500">{a.due_date}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        a.color === "green" ? "bg-emerald-100 text-emerald-800" :
                        a.color === "yellow" ? "bg-amber-100 text-amber-800" :
                        a.color === "orange" ? "bg-orange-100 text-orange-800" :
                        a.color === "blue" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold">{a.submit_count}</td>
                    <td className="py-3 px-3.5 text-center">{a.retry_count}</td>
                    <td className="py-3 px-3.5 text-center">{a.first_score ?? "-"}</td>
                    <td className="py-3 px-3.5 text-center font-extrabold text-indigo-600">{a.latest_score ?? "-"}</td>
                    <td className="py-3 px-3.5 text-xs text-slate-600 max-w-[200px] truncate">{a.teacher_note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
