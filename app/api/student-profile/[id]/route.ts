import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sid = Number(params.id);
    if (isNaN(sid)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const data = getStudentProfile(sid);
    if (!data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
