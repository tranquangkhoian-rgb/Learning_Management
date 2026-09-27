"use client";

import React, { useState } from "react";

interface PinModalProps {
  isOpen: boolean;
  correctPin: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinModal({ isOpen, correctPin, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === (correctPin || "1234")) {
      setError(false);
      setPin("");
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xs w-full text-center shadow-2xl">
        <div className="text-3xl mb-2">🔒</div>
        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Bảo Mật Giáo Viên</h3>
        <p className="text-xs text-slate-500 mb-4">Vui lòng nhập mã PIN để mở khóa trang quản lý:</p>

        <form onSubmit={handleVerify}>
          <input
            type="password"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="****"
            className="w-full text-center text-3xl font-extrabold tracking-widest text-slate-900 py-2 border rounded-xl mb-2 focus:ring-2 focus:ring-indigo-500/20"
          />

          {error && <p className="text-xs text-rose-600 font-bold mb-3">Mã PIN không đúng!</p>}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              Mở Khóa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
