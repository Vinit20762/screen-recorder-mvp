import { NextResponse } from "next/server";
import { 
  readAnalytics, 
  incrementView, 
  recordWatchSession,
  getAverageCompletion 
} from "@/lib/analyticsStore";

// Track a view (when someone loads the video page)
export async function POST(req: Request) {
  try {
    const { id, watched, duration, action } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    if (action === "view") {
      // Increment view count
      incrementView(id);
      const analytics = readAnalytics(id);
      return NextResponse.json({
        success: true,
        views: analytics.views,
      });
    }

    if (action === "watch" && watched !== undefined && duration !== undefined) {
      // Record a watch session
      recordWatchSession(id, watched, duration);
      const analytics = readAnalytics(id);
      return NextResponse.json({
        success: true,
        averageCompletion: getAverageCompletion(id),
        totalWatchTime: analytics.totalWatchTime,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in analytics POST:", error);
    return NextResponse.json(
      { error: "Failed to record analytics" },
      { status: 500 }
    );
  }
}

// Get analytics data
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    const analytics = readAnalytics(id);
    const averageCompletion = getAverageCompletion(id);

    return NextResponse.json({
      views: analytics.views,
      totalWatchTime: analytics.totalWatchTime,
      duration: analytics.duration,
      averageCompletion,
      watchSessions: analytics.watchSessions?.length || 0,
    });
  } catch (error) {
    console.error("Error in analytics GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
