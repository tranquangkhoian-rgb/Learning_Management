import { NextResponse } from "next/server";
import { getComprehensiveAnalytics } from "@/lib/db";

export async function GET() {
  try {
    const data = getComprehensiveAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
