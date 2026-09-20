import { NextResponse } from "next/server";
import { getAssignments, addAssignment } from "@/lib/db";

export async function GET() {
  try {
    const assignments = getAssignments();
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subject, assigned_date, due_date, max_score, notes } = body;
    if (!title || !due_date) {
      return NextResponse.json({ error: "Tên bài tập và Hạn nộp là bắt buộc!" }, { status: 400 });
    }
    const asg = addAssignment(
      title,
      subject || "Toán",
      assigned_date || new Date().toISOString().split("T")[0],
      due_date,
      max_score ? Number(max_score) : 10.0,
      notes || ""
    );
    return NextResponse.json(asg, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
