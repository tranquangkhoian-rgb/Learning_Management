import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheetUrl = body.url?.trim();

    if (!sheetUrl) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập đường dẫn Google Sheets Web App!" }, { status: 400 });
    }

    const testPayload = {
      action: "test_connection",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      student_code: "TEST01",
      student_name: "Kiểm tra kết nối",
      class_name: "Lớp 3A7",
      assignment_title: "Kiểm tra đồng bộ",
      subject: "Hệ thống",
      attempt_number: 1,
      is_late: "Đúng hạn",
      score: 10,
      status: "Kết nối thành công",
      teacher_note: "Next.js và Google Sheets đã kết nối hoàn hảo!",
      operator: "Cô Linh",
    };

    const resp = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    const respBody = await resp.text();
    return NextResponse.json({
      success: true,
      message: "Gửi dữ liệu kiểm tra thành công!",
      response: respBody,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
