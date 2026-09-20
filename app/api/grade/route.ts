import { NextResponse } from "next/server";
import { recordGrading } from "@/lib/db";
import { syncToGoogleSheetAsync } from "@/lib/google-sheets";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, assignment_id, score, status, teacher_note, operator } = body;

    if (!student_id || !assignment_id) {
      return NextResponse.json({ error: "Thiếu student_id hoặc assignment_id!" }, { status: 400 });
    }

    const res = recordGrading(
      Number(student_id),
      Number(assignment_id),
      score,
      status || "Đã đạt",
      teacher_note || "",
      operator || "Cô Linh"
    );

    if (!res.success || !res.student || !res.assignment) {
      return NextResponse.json(res, { status: 400 });
    }

    // Trigger Google Sheets auto-sync
    syncToGoogleSheetAsync({
      action: "log_event",
      event_type: "grade",
      timestamp: res.graded_at,
      student_code: res.student.code,
      student_name: res.student.full_name,
      class_name: res.student.class_name,
      assignment_title: res.assignment.title,
      subject: res.assignment.subject,
      attempt_number: res.attempt_number,
      is_late: "",
      score: res.score,
      status: res.status,
      teacher_note: res.teacher_note,
      operator: operator || "Cô Linh",
    });

    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
