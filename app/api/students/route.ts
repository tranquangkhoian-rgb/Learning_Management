import { NextResponse } from "next/server";
import { getStudents, addStudent } from "@/lib/db";

export async function GET() {
  try {
    const students = getStudents();
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, full_name, gender, class_name } = body;
    if (!code || !full_name) {
      return NextResponse.json({ error: "Mã và Họ tên học sinh là bắt buộc!" }, { status: 400 });
    }
    const student = addStudent(code, full_name, gender || "Nam", class_name || "Lớp 3A7");
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
