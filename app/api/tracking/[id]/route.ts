import { NextResponse } from "next/server";
import { getAssignmentTrackingMatrix } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const aid = Number(params.id);
    if (isNaN(aid)) {
      return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
    }

    const data = getAssignmentTrackingMatrix(aid);
    if (!data) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
