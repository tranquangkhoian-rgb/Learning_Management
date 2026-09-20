import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản Lý Nộp Bài & Điểm Học Sinh - Cô Linh",
  description: "Hệ thống Quản lý Nộp bài & Điểm số bằng QR Code (Lớp 30 học sinh)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
