import { NextResponse } from "next/server";
import { getAssignmentTrackingMatrix } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aid = searchParams.get("assignment_id");

    if (!aid) {
      return NextResponse.json({ error: "Missing assignment_id" }, { status: 400 });
    }

    const data = getAssignmentTrackingMatrix(Number(aid));
    if (!data) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const { assignment, matrix } = data;
    const header = "STT,Mã HS,Họ và tên,Giới tính,Trạng thái,Thời gian nộp gần nhất,Đúng/Trễ hạn,Số lần đã nộp,Số lần làm lại,Điểm lần 1,Điểm gần nhất,Nhận xét của giáo viên\n";
    
    let csv = header;
    for (const row of matrix) {
      const isLateStr = row.is_late ? "Trễ hạn" : (row.submit_count > 0 ? "Đúng hạn" : "");
      const firstScoreStr = row.first_score !== null ? String(row.first_score) : "";
      const latestScoreStr = row.latest_score !== null ? String(row.latest_score) : "";
      const noteClean = (row.teacher_note || "").replace(/"/g, '""');

      csv += `${row.stt},"${row.code}","${row.full_name}","${row.gender}","${row.current_status}","${row.latest_submit_time}","${isLateStr}",${row.submit_count},${row.retry_count},"${firstScoreStr}","${latestScoreStr}","${noteClean}"\n`;
    }

    // Prepend UTF-8 BOM (\uFEFF)
    const bomCsv = "\uFEFF" + csv;
    const filename = `TheoDoi_${assignment.id}_${assignment.title.slice(0, 20).replace(/\s+/g, "_")}.csv`;

    return new Response(bomCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
