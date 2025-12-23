"use client";

import { use, useEffect, useRef, useState } from "react";

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const watchStartTime = useRef<number | null>(null);
  const hasTrackedView = useRef(false);
  const lastTrackedTime = useRef<number>(0);
  const viewTrackingAbortController = useRef<AbortController | null>(null);

  // Fetch video URL (pre-signed URL from API)
  useEffect(() => {
    if (!id) return;

    fetch(`/api/videos/${id}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch video URL: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.url) {
          setVideoUrl(data.url);
        } else if (data.error) {
          console.error("API error:", data.error);
          // Fallback to direct URL if API fails (for public buckets)
          const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "marvedge-recorder-mvp";
          const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1";
          const fallbackUrl = `https://${bucketName}.s3.${region}.amazonaws.com/videos/${id}.webm`;
          setVideoUrl(fallbackUrl);
        } else {
          // Fallback to direct URL if no URL in response
          const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "marvedge-recorder-mvp";
          const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1";
          const fallbackUrl = `https://${bucketName}.s3.${region}.amazonaws.com/videos/${id}.webm`;
          setVideoUrl(fallbackUrl);
        }
      })
      .catch((err) => {
        console.error("Error fetching video URL:", err);
        // Fallback to direct URL on error
        const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "marvedge-recorder-mvp";
        const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1";
        const fallbackUrl = `https://${bucketName}.s3.${region}.amazonaws.com/videos/${id}.webm`;
        setVideoUrl(fallbackUrl);
      });
  }, [id]);

  // Track view when page loads
  useEffect(() => {

    // Abort any pending view tracking request
    if (viewTrackingAbortController.current) {
      viewTrackingAbortController.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    viewTrackingAbortController.current = abortController;

    // Use sessionStorage to prevent double-tracking across remounts
    const viewKey = `view_tracked_${id}`;
    const hasTrackedInSession = sessionStorage.getItem(viewKey);

    if (!hasTrackedInSession && !hasTrackedView.current) {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id,
          action: "view",
        }),
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Analytics API error: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          hasTrackedView.current = true;
          sessionStorage.setItem(viewKey, "true");
          // Refresh analytics after tracking view
          return fetch(`/api/analytics?id=${id}`, {
            signal: abortController.signal,
          });
        })
        .then((r) => {
          if (!r.ok) {
            throw new Error(`Failed to fetch analytics: ${r.status}`);
          }
          return r.json();
        })
        .then((analytics) => {
          setAnalytics(analytics);
        })
        .catch((err) => {
          // Ignore abort errors
          if (err.name !== "AbortError") {
            console.error("Error tracking view:", err);
          }
        });
    } else {
      // Just fetch analytics if view already tracked
      fetch(`/api/analytics?id=${id}`, {
        signal: abortController.signal,
      })
        .then((r) => r.json())
        .then(setAnalytics)
        .catch((err) => {
          // Ignore abort errors
          if (err.name !== "AbortError") {
            console.error("Error fetching analytics:", err);
          }
        });
    }

    // Cleanup function
    return () => {
      if (viewTrackingAbortController.current) {
        viewTrackingAbortController.current.abort();
      }
    };
  }, [id]);

  // Track watch time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      watchStartTime.current = Date.now();
      lastTrackedTime.current = video.currentTime;
    };

    const handlePause = () => {
      if (watchStartTime.current !== null && video.duration) {
        const timeWatched = video.currentTime - lastTrackedTime.current;
        if (timeWatched > 0) {
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: id,
              action: "watch",
              watched: video.currentTime,
              duration: video.duration,
            }),
          }).then(() => {
            // Refresh analytics
            fetch(`/api/analytics?id=${id}`)
              .then((r) => r.json())
              .then(setAnalytics);
          });
        }
        lastTrackedTime.current = video.currentTime;
      }
    };

    const handleEnded = () => {
      if (video.duration) {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id,
            action: "watch",
            watched: video.duration,
            duration: video.duration,
          }),
        }).then(() => {
          // Refresh analytics
          fetch(`/api/analytics?id=${id}`)
            .then((r) => r.json())
            .then(setAnalytics);
        });
      }
      watchStartTime.current = null;
    };

    // Track time updates periodically (every 5 seconds)
    const timeUpdateInterval = setInterval(() => {
      if (video && !video.paused && video.currentTime > 0 && video.duration) {
        const timeSinceLastTrack = video.currentTime - lastTrackedTime.current;
        // Track if watched at least 5 seconds since last track
        if (timeSinceLastTrack >= 5) {
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: id,
              action: "watch",
              watched: video.currentTime,
              duration: video.duration,
            }),
          });
          lastTrackedTime.current = video.currentTime;
        }
      }
    }, 5000);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      clearInterval(timeUpdateInterval);
    };
  }, [id, videoUrl]);

  if (!videoUrl) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">Loading video...</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl">
        {videoError && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Video Error:</p>
            <p className="text-sm">{videoError}</p>
            <p className="text-xs mt-2">
              Video URL: {videoUrl.substring(0, 100)}...
            </p>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          preload="metadata"
          className="w-full rounded-lg shadow-lg"
          onError={() => {
            setVideoError("Failed to load video. Please try refreshing the page.");
          }}
          onLoadedMetadata={() => {
            setVideoError(null);
          }}
          onLoadStart={() => {
            setVideoError(null);
          }}
        />
      </div>

      {analytics && (
        <div className="w-full max-w-4xl bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Video Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Views</span>
              <span className="text-2xl font-bold">{analytics.views || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Average Completion
              </span>
              <span className="text-2xl font-bold">{analytics.averageCompletion || 0}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600 dark:text-gray-400">Watch Sessions</span>
              <span className="text-2xl font-bold">{analytics.watchSessions || 0}</span>
            </div>
          </div>
          {analytics.duration > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Video Duration: </span>
              <span className="text-sm font-medium">
                {Math.floor(analytics.duration / 60)}:
                {String(Math.floor(analytics.duration % 60)).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
