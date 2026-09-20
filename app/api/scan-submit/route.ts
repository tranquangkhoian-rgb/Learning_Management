import { NextResponse } from "next/server";
import { recordSubmission } from "@/lib/db";
import { syncToGoogleSheetAsync } from "@/lib/google-sheets";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_code, student_id, assignment_id, operator } = body;
    const targetCodeOrId = student_code || student_id;

    if (!targetCodeOrId || !assignment_id) {
      return NextResponse.json({ error: "Thiếu thông tin học sinh hoặc bài tập!" }, { status: 400 });
    }

    const res = recordSubmission(targetCodeOrId, Number(assignment_id), operator || "Học sinh");
    if (!res.success || !res.student || !res.assignment) {
      return NextResponse.json(res, { status: 400 });
    }

    // Trigger Google Sheets auto-sync
    syncToGoogleSheetAsync({
      action: "log_event",
      event_type: "submit",
      timestamp: res.submitted_at,
      student_code: res.student.code,
      student_name: res.student.full_name,
      class_name: res.student.class_name,
      assignment_title: res.assignment.title,
      subject: res.assignment.subject,
      attempt_number: res.attempt_number,
      is_late: res.is_late ? "Trễ hạn" : "Đúng hạn",
      score: "",
      status: res.status,
      teacher_note: "",
      operator: operator || "Học sinh",
    });

    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
