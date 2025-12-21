import { NextResponse } from "next/server";
import { readAnalytics, writeAnalytics } from "@/lib/analyticsStore";

export async function POST(req: Request) {
  const { id, watched, duration } = await req.json();
  const current = readAnalytics(id);

  writeAnalytics(id, {
    views: current.views + 1,
    totalWatchTime: current.totalWatchTime + watched,
    duration,
  });

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")!;
  return NextResponse.json(readAnalytics(id));
}
