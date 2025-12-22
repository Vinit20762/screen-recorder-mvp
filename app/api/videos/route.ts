import { NextResponse } from "next/server";
import { getAllVideos } from "@/lib/videoMetadataStore";
import { readAnalytics } from "@/lib/analyticsStore";

export async function GET() {
  try {
    const videos = getAllVideos();
    
    // Enrich videos with analytics data
    const videosWithAnalytics = videos.map(video => {
      const analytics = readAnalytics(video.id);
      return {
        ...video,
        views: analytics.views || 0,
        averageCompletion: analytics.watchSessions && analytics.watchSessions.length > 0
          ? Math.round(analytics.watchSessions.reduce((acc: number, val: number) => acc + val, 0) / analytics.watchSessions.length)
          : 0,
        duration: analytics.duration || 0,
      };
    });

    return NextResponse.json(videosWithAnalytics);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

