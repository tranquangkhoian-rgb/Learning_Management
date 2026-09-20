import { NextResponse } from "next/server";
import { getSubmissionHistory } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sid = searchParams.get("student_id");
    const aid = searchParams.get("assignment_id");

    if (!sid || !aid) {
      return NextResponse.json({ error: "Missing student_id or assignment_id" }, { status: 400 });
    }

    const history = getSubmissionHistory(Number(sid), Number(aid));
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
