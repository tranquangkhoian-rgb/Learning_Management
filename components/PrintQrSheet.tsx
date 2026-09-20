"use client";

import React, { useMemo } from "react";
import { Student, Settings } from "@/lib/types";
import { generateQrSvg } from "@/lib/qr";

interface PrintQrSheetProps {
  students: Student[];
  settings: Settings;
}

function MiniCard({ student, settings }: { student: Student; settings: Settings }) {
  const svgContent = useMemo(() => {
    try {
      return generateQrSvg(student.code, 4);
    } catch {
      return null;
    }
  }, [student.code]);

  return (
    <div className="border border-dashed border-slate-400 p-2 rounded-lg bg-white flex items-center gap-2.5 break-inside-avoid shadow-none">
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded border border-slate-200 overflow-hidden flex items-center justify-center p-0.5">
        {svgContent ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <img
            src={`/api/qr?text=${encodeURIComponent(student.code)}`}
            alt={student.code}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="text-[10px] font-bold text-indigo-700 uppercase leading-none">
          {settings.class_name || "LỚP 3A7"}
        </div>
        <div className="text-xs font-black text-slate-900 leading-tight my-0.5 truncate">
          {student.order_num}. {student.full_name}
        </div>
        <div className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
          MÃ: {student.code}
        </div>
      </div>
    </div>
  );
}

export default function PrintQrSheet({ students, settings }: PrintQrSheetProps) {
  return (
    <div className="space-y-4">
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            🏷️ Bảng Thẻ QR Mini Cho 29 Học Sinh (Khổ A4)
          </h2>
          <p className="text-xs text-slate-500">
            Đã định dạng vừa vặn khổ A4 (Lưới 3 cột). Mã QR chuẩn ISO/IEC 18004 với viền trắng Quiet Zone 4 modules, cực kỳ nhạy khi quét bằng điện thoại.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
        >
          🖨️ In Ngay (Khổ A4)
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 max-w-[210mm] mx-auto print:p-2 print:border-0 print:max-w-none print:m-0">
        <div className="text-center mb-6 pb-3 border-b-2 border-slate-900 print:mb-4">
          <h3 className="text-lg font-extrabold uppercase text-slate-900 tracking-wider">
            DANH SÁCH THẺ MÃ QR HỌC SINH
          </h3>
          <p className="text-xs font-bold text-slate-600">
            {(settings.class_name || "LỚP 3A7").toUpperCase()} • NĂM HỌC 2026 - 2027 • GVCN: {(settings.teacher_name || "CÔ LINH").toUpperCase()}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2 sm:gap-3 print:gap-2">
          {students.map((st) => (
            <MiniCard key={st.id} student={st} settings={settings} />
          ))}
        </div>
      </div>
    </div>
  );
}
