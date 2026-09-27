"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Student, Book, BookLoan, ReadingRaceEntry, LibraryStats } from "@/lib/types";

interface LibraryViewProps {
  students: Student[];
}

export default function LibraryView({ students }: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<"race" | "borrow" | "return" | "catalog" | "stats">("race");
  const [stats, setStats] = useState<LibraryStats>({
    totalBooks: 75,
    borrowedCount: 0,
    readersCount: 29,
    overdueCount: 0,
    totalCompletedReadings: 0,
    categories: {}
  });
  const [raceList, setRaceList] = useState<ReadingRaceEntry[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeLoans, setActiveLoans] = useState<BookLoan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [raceSearch, setRaceSearch] = useState("");
  const [raceFilter, setRaceFilter] = useState<"all" | "top3" | "milestone15" | "finished">("all");

  // Borrow form state
  const [borrowStudentId, setBorrowStudentId] = useState<string>("");
  const [borrowBookId, setBorrowBookId] = useState<string>("");
  const [borrowDays, setBorrowDays] = useState<number>(14);
  const [borrowNotes, setBorrowNotes] = useState<string>("");

  // Manual return state
  const [returnCode, setReturnCode] = useState<string>("");

  // Avatar modal state
  const [selectedPetStudentId, setSelectedPetStudentId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [resStats, resRace, resBooks, resLoans] = await Promise.all([
        fetch("/api/library/stats"),
        fetch("/api/race"),
        fetch("/api/books"),
        fetch("/api/loans"),
      ]);
      if (resStats.ok) setStats(await resStats.json());
      if (resRace.ok) setRaceList(await resRace.json());
      if (resBooks.ok) setBooks(await resBooks.json());
      if (resLoans.ok) setActiveLoans(await resLoans.json());
    } catch (e) {
      console.error("Error loading library data in Next.js:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reading race update
  const handleUpdateRace = async (studentId: number, delta: number) => {
    try {
      const res = await fetch("/api/race/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, delta }),
      });
      if (res.ok) {
        setRaceList(await res.json());
        loadData();
      }
    } catch (e) {
      console.error("Failed to update race:", e);
    }
  };

  // Change avatar
  const handleSelectAvatar = async (studentId: number, avatar: string) => {
    try {
      const res = await fetch("/api/race/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, delta: 0, avatar }),
      });
      if (res.ok) {
        setRaceList(await res.json());
        setSelectedPetStudentId(null);
      }
    } catch (e) {
      console.error("Failed to update avatar:", e);
    }
  };

  // Borrow book
  const handleBorrow = async () => {
    if (!borrowStudentId || !borrowBookId) {
      alert("Vui lòng chọn học sinh và cuốn sách!");
      return;
    }
    try {
      const res = await fetch("/api/loans/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: parseInt(borrowStudentId),
          book_id: parseInt(borrowBookId),
          due_days: borrowDays,
          notes: borrowNotes,
        }),
      });
      if (res.ok) {
        alert("✅ Cho mượn sách thành công!");
        setBorrowBookId("");
        setBorrowNotes("");
        loadData();
      } else {
        const err = await res.json();
        alert("❌ " + (err.error || "Không thể cho mượn"));
      }
    } catch (e: any) {
      alert("❌ Lỗi: " + e.message);
    }
  };

  // Return book
  const handleReturn = async (bookIdentifier: string | number) => {
    try {
      const res = await fetch("/api/loans/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookIdentifier }),
      });
      if (res.ok) {
        const ret = await res.json();
        let msg = `✅ Trả sách thành công!\n📖 Cuốn sách: ${ret.book_title} đã được đưa về kệ.`;
        if (ret.student_id && ret.student_name !== "Chưa rõ") {
          const wantAdd = confirm(`${msg}\n\n🌟 Bạn có muốn CỘNG +1 Ô vào Đường đua đọc sách cho bạn ${ret.student_name} không?`);
          if (wantAdd) {
            await handleUpdateRace(ret.student_id, 1);
          }
        } else {
          alert(msg);
        }
        setReturnCode("");
        loadData();
      } else {
        const err = await res.json();
        alert("❌ " + (err.error || "Không thể trả sách"));
      }
    } catch (e: any) {
      alert("❌ Lỗi: " + e.message);
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchCat = categoryFilter === "all" || b.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchQ =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.contributed_by.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      String(b.stt) === q;
    return matchCat && matchQ;
  });

  const filteredRaceList = raceList.filter((st) => {
    if (raceFilter === "top3" && ((st.rank || 99) > 3 || (Number(st.completed) || 0) <= 0)) return false;
    if (raceFilter === "milestone15" && (Number(st.completed) || 0) < 15) return false;
    if (raceFilter === "finished" && (Number(st.completed) || 0) < 33) return false;
    if (raceSearch.trim()) {
      const q = raceSearch.toLowerCase().trim();
      return st.name.toLowerCase().includes(q) || st.code.toLowerCase().includes(q);
    }
    return true;
  });

  const handleResetBooksCatalog = async () => {
    if (!confirm("Khôi phục danh mục 75 cuốn sách gốc từ file Excel? Dữ liệu sách hiện tại sẽ được cập nhật lại theo danh sách chuẩn.")) {
      return;
    }
    try {
      const res = await fetch("/api/books/reset", { method: "POST" });
      if (res.ok) {
        alert("✅ Đã khôi phục 75 cuốn sách chuẩn thành công!");
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintAllBooksQr = () => {
    if (!books || books.length === 0) {
      alert("Chưa có danh sách sách trong kho để in!");
      return;
    }
    const sorted = [...books].sort((a, b) => (a.stt || 0) - (b.stt || 0));
    const totalCount = sorted.length;
    const className = "LỚP 3A7";
    const schoolName = "TRƯỜNG TH ÁNH DƯƠNG";

    const cardsHtml = sorted.map((b, idx) => {
      const qrSvg = `<img src="/api/qr?text=${encodeURIComponent(b.code)}" alt="${b.code}" style="width:100%;height:100%;" />`;
      const safeTitle = (b.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeAuthor = (b.author || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeContrib = (b.contributed_by || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeCategory = (b.category || "Chung").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeShelf = (b.shelf_code || "K1").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const bookStt = b.stt || (idx + 1);

      return `
        <div class="book-qr-card">
          <div class="qr-col">
            <div class="qr-graphic">${qrSvg}</div>
            <div class="book-code-mono">${b.code}</div>
          </div>
          <div class="info-col">
            <div class="header-line">
              <span class="class-tag">${className}</span>
              <span class="stt-tag">STT #${bookStt}</span>
            </div>
            <div class="book-title" title="${safeTitle}">${safeTitle}</div>
            ${safeAuthor ? `<div class="book-author">✍️ ${safeAuthor}</div>` : ""}
            <div class="footer-meta">
              <span class="shelf-pill">📍 Kệ ${safeShelf}</span>
              <span class="cat-pill">${safeCategory}</span>
            </div>
            ${safeContrib ? `<div class="contrib-line">🎁 Sách của: <strong>${safeContrib}</strong></div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Mã QR Sách Lớp 3A7 (${totalCount} Cuốn) - Xuất PDF / In</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    .no-print-bar { position: sticky; top: 0; z-index: 9999; background: #065f46; color: #ffffff; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .no-print-bar .title-group h2 { margin: 0; font-size: 16px; font-weight: 800; }
    .no-print-bar .title-group p { margin: 2px 0 0; font-size: 12px; opacity: 0.9; }
    .btn-action { border: none; outline: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    .btn-print { background: #10b981; color: #ffffff; }
    .btn-close { background: rgba(255,255,255,0.2); color: #ffffff; margin-left: 8px; }
    .page-container { max-width: 210mm; margin: 12px auto; background: #ffffff; padding: 6mm; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border-radius: 8px; }
    .sheet-header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 6px; margin-bottom: 8px; }
    .sheet-header h1 { margin: 0; font-size: 14pt; font-weight: 900; color: #065f46; text-transform: uppercase; }
    .sheet-header p { margin: 2px 0 0; font-size: 9pt; font-weight: 600; color: #475569; }
    .books-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .book-qr-card { border: 1.5px dashed #059669; border-radius: 6px; padding: 4px 6px; background: #ffffff; display: flex; align-items: center; gap: 6px; height: 38mm; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; }
    .qr-col { width: 29mm; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .qr-graphic { width: 27mm; height: 27mm; }
    .qr-graphic img { width: 100% !important; height: 100% !important; display: block; }
    .book-code-mono { font-family: monospace; font-size: 8pt; font-weight: 900; color: #065f46; margin-top: 1px; }
    .info-col { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .header-line { display: flex; justify-content: space-between; align-items: center; }
    .class-tag { font-size: 6.5pt; font-weight: 800; color: #047857; text-transform: uppercase; }
    .stt-tag { font-size: 6.5pt; font-weight: 800; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 0.5px 3px; border-radius: 3px; }
    .book-title { font-size: 8.5pt; font-weight: 800; color: #0f172a; line-height: 1.15; max-height: 2.3em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 1px 0; }
    .book-author { font-size: 6.5pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .footer-meta { display: flex; align-items: center; gap: 4px; margin-top: 1px; }
    .shelf-pill { font-size: 6.5pt; font-weight: 700; background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; }
    .cat-pill { font-size: 6pt; font-weight: 700; background: #f1f5f9; color: #475569; padding: 1px 4px; border-radius: 3px; }
    .contrib-line { font-size: 6.5pt; color: #047857; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    @media print {
      body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
      .no-print-bar { display: none !important; }
      .page-container { max-width: 100% !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; }
      .book-qr-card { border: 1px dashed #334155 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="title-group">
      <h2>📚 BỘ NHÃN MÃ QR KHO SÁCH (${totalCount} CUỐN)</h2>
      <p>💡 Chọn máy in hoặc chọn <strong>"Lưu dưới dạng PDF" (Save as PDF)</strong> để xuất file PDF in tem nhãn.</p>
    </div>
    <div>
      <button class="btn-action btn-print" onclick="window.print()">🖨️ In / Xuất PDF Ngay</button>
      <button class="btn-action btn-close" onclick="window.close()">✖️ Đóng</button>
    </div>
  </div>
  <div class="page-container">
    <div class="sheet-header">
      <h1>DANH MỤC TEM MÃ QR SÁCH - ${className}</h1>
      <p>${schoolName} • TỔNG CỘNG: ${totalCount} ĐẦU SÁCH • HỆ THỐNG THƯ VIỆN LỚP HỌC</p>
    </div>
    <div class="books-grid">
      ${cardsHtml}
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  </script>
</body>
</html>`;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(fullHtml);
      printWin.document.close();
    }
  };

  const petAvatars = ['🐶', '🐱', '🦊', '🐰', '🐼', '🦁', '🐯', '🐨', '🦄', '🐸',
                      '🐵', '🐻', '🐧', '🐤', '🦉', '🐺', '🐗', '🐴', '🐝', '🐙',
                      '🦋', '🐢', '🐬', '🐳', '🦖', '🦔', '🐿️', '🦩', '🦚', '🐮'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-white border border-emerald-100 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white grid place-items-center text-3xl shadow-md">
            📖
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#17352a] tracking-tight">
              3A7 – HÀNH TRÌNH ĐỌC SÁCH
            </h2>
            <p className="text-xs sm:text-sm font-extrabold text-emerald-700 tracking-wider">
              ONE BOOK, ONE THOUGHT • ĐƯỜNG ĐUA 33 QUYỂN SÁCH
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-all flex items-center gap-1.5"
        >
          🔄 Làm Mới Dữ Liệu
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 size-9 rounded-xl text-white bg-emerald-600 grid place-items-center font-bold">
            📚
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.totalBooks || 75}</p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Sách trong thư viện</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 size-9 rounded-xl text-white bg-sky-600 grid place-items-center font-bold">
            📖
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.borrowedCount || 0}</p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Đang được mượn</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 size-9 rounded-xl text-white bg-violet-600 grid place-items-center font-bold">
            👥
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.readersCount || 29}</p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Độc giả Lớp 3A7</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 size-9 rounded-xl text-white bg-rose-500 grid place-items-center font-bold">
            ⏰
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.overdueCount || 0}</p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Đã quá hạn</p>
        </div>
      </div>

      {/* 3D Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none sm:grid sm:grid-cols-5 sm:gap-3">
        {[
          { id: "race", label: "🎯 Hành Trình", color: "bg-emerald-600" },
          { id: "borrow", label: "📥 Mượn Sách", color: "bg-sky-600" },
          { id: "return", label: "📤 Trả Sách", color: "bg-amber-600" },
          { id: "catalog", label: "📚 Kho Sách", color: "bg-violet-600" },
          { id: "stats", label: "📊 Thống Kê", color: "bg-teal-600" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-h-[46px] sm:min-h-[50px] shrink-0 whitespace-nowrap rounded-2xl px-3 sm:px-2 text-xs sm:text-sm font-black uppercase transition-all shadow-sm border ${
              activeTab === tab.id
                ? `${tab.color} text-white border-transparent shadow-md scale-102`
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HÀNH TRÌNH (RACE) */}
      {activeTab === "race" && (
        <section className="rounded-3xl bg-white p-4 sm:p-7 shadow-sm border border-emerald-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Toàn lớp cùng tiến lên
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#17352a]">Đường đua 33 quyển sách 🏁</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Danh sách tự xếp từ bạn đọc nhiều nhất xuống ít nhất. Bằng số sách sẽ cùng hạng.
              </p>
            </div>
          </div>

          {/* Milestone Goals Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-sky-200 bg-sky-50/70">
              <span className="text-2xl">🎯</span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-sky-700 tracking-wider">MỐC THÁNG 12</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 truncate">15 Quyển Sách</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-200 bg-amber-50/70">
              <span className="text-2xl">🏁</span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">ĐÍCH THÁNG 4</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 truncate">33 Quyển Sách</p>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70">
              <span className="text-2xl">🌟</span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">MỤC TIÊU LỚP</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 truncate">29 Độc Giả 3A7</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <input
              type="text"
              value={raceSearch}
              onChange={(e) => setRaceSearch(e.target.value)}
              placeholder="🔍 Tìm tên bạn trên đường đua (29 bạn)..."
              className="w-full h-11 rounded-xl border border-slate-300 px-3.5 font-semibold text-xs sm:text-sm focus:outline-emerald-500"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
              {[
                { id: "all", label: `Tất cả (${raceList.length})` },
                { id: "top3", label: "🏆 Top 3 Dẫn Đầu" },
                { id: "milestone15", label: "🎯 Đạt Mốc 15+" },
                { id: "finished", label: "🏁 Về Đích (33+)" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRaceFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                    raceFilter === f.id
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredRaceList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-bold text-sm">
              Không tìm thấy độc giả nào phù hợp với bộ lọc
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md+) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-emerald-100">
                <div className="min-w-[980px]">
                  {/* Header */}
                  <div className="grid grid-cols-[56px_200px_1fr_96px_180px] items-end gap-3 bg-[#17352a] px-4 py-3 text-xs sm:text-sm font-bold text-white">
                    <span>Hạng</span>
                    <span>Độc giả</span>
                    <div className="relative h-12 text-xs text-emerald-100">
                      <div className="absolute inset-x-0 top-0 h-5 font-black text-white">
                        <span className="absolute left-[45.45%] -translate-x-1/2">Tháng 12</span>
                        <span className="absolute right-0">Tháng 4</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-5">
                        <span className="absolute left-0">0</span>
                        <span className="absolute left-1/3 -translate-x-1/2">11</span>
                        <span className="absolute left-[45.45%] -translate-x-1/2 font-black text-sky-300">15</span>
                        <span className="absolute left-2/3 -translate-x-1/2">22</span>
                        <span className="absolute right-0 font-black text-amber-300">33 🏁</span>
                      </div>
                    </div>
                    <span className="text-right">Tiến độ</span>
                    <span className="text-center">Cô cập nhật</span>
                  </div>

                  {/* Rows */}
                  {filteredRaceList.map((st) => {
                    const completed = Number(st.completed) || 0;
                    const pct = Math.min(100, Math.round((completed / 33) * 1000) / 10);
                    const rank = st.rank || 1;

                    return (
                      <div
                        key={st.student_id}
                        className={`grid grid-cols-[56px_200px_1fr_96px_180px] items-center gap-3 border-t border-emerald-100 px-4 py-3 transition-colors ${
                          completed > 0 && rank === 1
                            ? "bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100"
                            : completed > 0 && rank === 2
                            ? "bg-gradient-to-r from-slate-100 via-white to-slate-100"
                            : completed > 0 && rank === 3
                            ? "bg-gradient-to-r from-orange-100 via-white to-orange-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          {completed > 0 && rank <= 3 ? (
                            <span className="text-2xl">
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                            </span>
                          ) : (
                            <span className="grid size-8 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700 text-xs">
                              {rank}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => setSelectedPetStudentId(st.student_id)}
                            title="Bấm để đổi thú cưng"
                            className="size-10 rounded-full border border-emerald-200 bg-white grid place-items-center text-xl shrink-0 hover:scale-110 transition-transform shadow-xs"
                          >
                            {st.avatar || "🐶"}
                          </button>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800 text-sm">{st.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400">{st.code}</p>
                          </div>
                        </div>

                        {/* Dynamic track */}
                        <div className="relative h-10 flex items-center">
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-emerald-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="absolute left-1/3 top-1/2 -translate-y-1/2 h-4 w-px bg-white/90" />
                          <span className="absolute left-[45.45%] top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-sky-400" />
                          <span className="absolute left-2/3 top-1/2 -translate-y-1/2 h-4 w-px bg-white/90" />

                          <span
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-white border-2 border-emerald-600 shadow-md grid place-items-center text-xs transition-all duration-300"
                            style={{ left: `${pct}%` }}
                          >
                            {completed > 0 ? st.avatar || "🐶" : "🐾"}
                          </span>
                        </div>

                        {/* Progress text */}
                        <div className="text-right">
                          <p className="font-black text-emerald-700 text-sm">{completed}/33</p>
                          {completed > 33 ? (
                            <p className="text-[11px] font-bold text-amber-600">+{completed - 33} vượt đích</p>
                          ) : completed === 33 ? (
                            <p className="text-[11px] font-bold text-emerald-600">Về đích! 🏁</p>
                          ) : (
                            <p className="text-[11px] text-slate-400">còn {33 - completed}</p>
                          )}
                        </div>

                        {/* Teacher controls */}
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateRace(st.student_id, -1)}
                            disabled={completed <= 0}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            -1 ô
                          </button>
                          <button
                            onClick={() => handleUpdateRace(st.student_id, 1)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                          >
                            + 1 ô
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE CARD VIEW (visible on mobile < md, hidden on md+) */}
              <div className="md:hidden space-y-3">
                {filteredRaceList.map((st) => {
                  const completed = Number(st.completed) || 0;
                  const pct = Math.min(100, Math.round((completed / 33) * 1000) / 10);
                  const rank = st.rank || 1;

                  return (
                    <div
                      key={st.student_id}
                      className={`rounded-2xl border p-3.5 space-y-3 shadow-xs transition-all ${
                        completed > 0 && rank === 1
                          ? "bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-300"
                          : completed > 0 && rank === 2
                          ? "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300"
                          : completed > 0 && rank === 3
                          ? "bg-gradient-to-br from-orange-50 to-orange-100/60 border-orange-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Top: Rank + Avatar + Name + Progress */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {completed > 0 && rank <= 3 ? (
                            <span className="text-2xl shrink-0">
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                            </span>
                          ) : (
                            <span className="grid size-7 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700 text-xs shrink-0">
                              {rank}
                            </span>
                          )}
                          <button
                            onClick={() => setSelectedPetStudentId(st.student_id)}
                            title="Bấm để đổi thú cưng"
                            className="size-9 rounded-full border border-emerald-200 bg-white grid place-items-center text-lg shrink-0 hover:scale-110 transition-transform shadow-xs"
                          >
                            {st.avatar || "🐶"}
                          </button>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-900 text-sm leading-tight">{st.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500">{st.code} • Hạng {rank}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-emerald-700 text-sm leading-tight">
                            {completed}/33 <span className="text-[10px] text-slate-500 font-semibold">cuốn</span>
                          </p>
                          {completed > 33 ? (
                            <p className="text-[10px] font-bold text-amber-600">+{completed - 33} vượt đích!</p>
                          ) : completed === 33 ? (
                            <p className="text-[10px] font-bold text-emerald-600">🏁 Về đích!</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium">còn {33 - completed}</p>
                          )}
                        </div>
                      </div>

                      {/* Track with Milestones */}
                      <div className="space-y-1 pt-1">
                        {/* Milestone scale */}
                        <div className="relative h-4 text-[9.5px] font-extrabold">
                          <span className="absolute left-0 text-slate-400">0</span>
                          <span className="absolute left-1/3 -translate-x-1/2 text-slate-500">11</span>
                          <span className="absolute left-[45.45%] -translate-x-1/2 text-sky-700 bg-sky-100 px-1 py-0.5 rounded text-[9px] font-black">
                            🎯 15 (T12)
                          </span>
                          <span className="absolute left-2/3 -translate-x-1/2 text-slate-500">22</span>
                          <span className="absolute right-0 text-amber-700 bg-amber-100 px-1 py-0.5 rounded text-[9px] font-black">
                            33 🏁 (T4)
                          </span>
                        </div>

                        {/* Track Bar */}
                        <div className="relative h-7 flex items-center">
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="absolute left-1/3 top-1/2 -translate-y-1/2 h-3.5 w-0.5 bg-white/90" />
                          <span className="absolute left-[45.45%] top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-sky-400" />
                          <span className="absolute left-2/3 top-1/2 -translate-y-1/2 h-3.5 w-0.5 bg-white/90" />

                          <span
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-white border-2 border-emerald-600 shadow-md grid place-items-center text-xs transition-all duration-300"
                            style={{ left: `${pct}%` }}
                          >
                            {completed > 0 ? st.avatar || "🐶" : "🐾"}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-slate-200">
                        <button
                          onClick={() => handleUpdateRace(st.student_id, -1)}
                          disabled={completed <= 0}
                          className="h-10 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          ↩️ -1 ô
                        </button>
                        <button
                          onClick={() => handleUpdateRace(st.student_id, 1)}
                          className="col-span-2 h-10 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1"
                        >
                          📖 + 1 ô ĐÃ ĐỌC
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="mt-4 text-xs font-semibold text-slate-500 text-center">
            🐾 Mỗi bạn có một thú cưng chạy trên đường đua 33 quyển. Bấm vào thú cưng để đổi biểu tượng yêu thích!
          </p>
        </section>
      )}

      {/* TAB 2: MƯỢN SÁCH (BORROW) */}
      {activeTab === "borrow" && (
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="rounded-3xl bg-white p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Bước 1</p>
              <h3 className="text-xl font-black text-slate-900">Chọn Học Sinh</h3>
              <select
                value={borrowStudentId}
                onChange={(e) => setBorrowStudentId(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-slate-300 px-3 font-semibold text-sm focus:outline-emerald-500"
              >
                <option value="">-- Chọn tên trong danh sách 29 bạn --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.order_num}. {s.full_name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Bước 2</p>
              <h3 className="text-xl font-black text-slate-900">Chọn Cuốn Sách</h3>
              <select
                value={borrowBookId}
                onChange={(e) => setBorrowBookId(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-slate-300 px-3 font-semibold text-sm focus:outline-sky-500"
              >
                <option value="">-- Chọn cuốn sách cần mượn ({books.filter(b => b.status === "available").length} cuốn sẵn sàng) --</option>
                {books
                  .filter((b) => b.status === "available")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code}] {b.title} ({b.category})
                    </option>
                  ))}
              </select>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500">Số ngày mượn:</label>
                  <select
                    value={borrowDays}
                    onChange={(e) => setBorrowDays(parseInt(e.target.value))}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-2 text-sm font-semibold"
                  >
                    <option value={7}>7 ngày (1 tuần)</option>
                    <option value={14}>14 ngày (2 tuần)</option>
                    <option value={30}>30 ngày (1 tháng)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Ghi chú:</label>
                  <input
                    type="text"
                    value={borrowNotes}
                    onChange={(e) => setBorrowNotes(e.target.value)}
                    placeholder="Đọc tại lớp..."
                    className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleBorrow}
                className="mt-5 w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md transition-all"
              >
                ✅ Xác Nhận Cho Mượn Sách
              </button>
            </div>
          </section>

          {/* Active loans list */}
          <section className="rounded-3xl bg-white p-5 sm:p-7 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4">
              Sách Đang Được Mượn ({activeLoans.length})
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {activeLoans.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">
                  Toàn bộ sách đã ở trên kệ!
                </p>
              ) : (
                activeLoans.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        [{l.book_code}] {l.book_title}
                      </p>
                      <p className="text-xs text-slate-500">
                        Mượn bởi: <strong className="text-sky-700">{l.student_name}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleReturn(l.book_code)}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-700 font-bold text-xs hover:bg-amber-100 shrink-0"
                    >
                      ↩️ Trả Sách
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: TRẢ SÁCH (RETURN) */}
      {activeTab === "return" && (
        <section className="max-w-2xl mx-auto rounded-3xl bg-white p-6 sm:p-10 border border-amber-200 text-center shadow-sm">
          <div className="size-20 rounded-full bg-amber-100 text-amber-700 grid place-items-center text-4xl mx-auto mb-4">
            📤
          </div>
          <h3 className="text-2xl font-black text-slate-900">Trả Sách Thư Viện</h3>
          <p className="mt-2 text-sm text-slate-500">
            Không cần chọn học sinh. Chỉ cần nhập Mã sách hoặc STT sách để trả ngay.
          </p>

          <div className="mt-6 flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={returnCode}
              onChange={(e) => setReturnCode(e.target.value.toUpperCase())}
              placeholder="Nhập: SACH001 hoặc 1"
              className="flex-1 h-12 rounded-xl border border-slate-300 px-4 text-center font-bold uppercase tracking-wider"
            />
            <button
              onClick={() => handleReturn(returnCode)}
              className="px-5 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Trả Sách ➔
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 text-left">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Sách đang mượn cần trả:</h4>
            <div className="space-y-2">
              {activeLoans.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <span>
                    [{l.book_code}] <strong>{l.book_title}</strong> ({l.student_name})
                  </span>
                  <button
                    onClick={() => handleReturn(l.book_code)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold"
                  >
                    Trả
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: KHO SÁCH (CATALOG) */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Danh mục thư viện</p>
                <h3 className="text-xl font-black text-slate-900">75 Đầu Sách Lớp 3A7</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintAllBooksQr}
                  className="px-3.5 py-1.5 rounded-xl border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  🖨️ In QR Sách (PDF)
                </button>
                <button
                  onClick={handleResetBooksCatalog}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  🔄 Khôi Phục 75 Cuốn Gốc
                </button>
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Tìm tên sách, tác giả, người đóng góp, kệ..."
              className="w-full h-12 rounded-2xl border border-slate-300 px-4 font-semibold text-sm"
            />

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {["all", "Kỹ năng sống", "Truyện hay", "Tư duy", "Danh nhân"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full border transition-all ${
                    categoryFilter === cat
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {cat === "all" ? "Tất cả (75)" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Book Cards */}
          <div className="space-y-3">
            {filteredBooks.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center shrink-0">
                    <span className="text-[10px] font-bold leading-none">STT</span>
                    <span className="text-base font-black leading-none">{b.stt}</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{b.title}</h4>
                    <p className="text-xs text-slate-500">
                      Tác giả: <strong>{b.author || "Chưa rõ"}</strong> • Thể loại: {b.category} • Kệ {b.shelf_code}
                    </p>
                    <p className="text-xs text-violet-700 font-bold mt-0.5">
                      Của: {b.contributed_by} • Tình trạng: {b.condition}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black ${
                      b.status === "available"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.status === "available" ? "● Sẵn sàng" : "● Đang mượn"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: THỐNG KÊ (STATS) */}
      {activeTab === "stats" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>🏆</span> Top Độc Giả Đọc Nhiều Nhất
            </h3>
            <div className="space-y-3">
              {raceList.slice(0, 5).map((r, idx) => (
                <div
                  key={r.student_id}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    idx === 0
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">{r.avatar || "🐶"}</span>
                    <div>
                      <p className="font-extrabold text-sm text-slate-800">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.code}</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-700 text-sm">
                    {r.completed} / 33 quyển
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>📊</span> Thể Loại Sách Trong Thư Viện
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.categories || {}).map(([cat, count]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm"
                >
                  <span className="font-bold text-slate-700">📖 {cat}</span>
                  <span className="font-black text-sky-700">{count} cuốn</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pet Avatar Selector Modal */}
      {selectedPetStudentId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900 text-center">
              🐾 Chọn Thú Cưng Đồng Hành
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {petAvatars.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSelectAvatar(selectedPetStudentId, p)}
                  className="size-12 rounded-2xl border border-slate-200 text-2xl hover:bg-emerald-50 hover:scale-110 transition-all grid place-items-center"
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPetStudentId(null)}
              className="w-full py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
