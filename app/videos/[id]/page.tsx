"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const videoUrl = `https://marvedge-recorder-mvp.s3.eu-north-1.amazonaws.com/videos/${params.id}.webm`;

  useEffect(() => {
    fetch(`/api/analytics?id=${params.id}`)
      .then(r => r.json())
      .then(setAnalytics);
  }, []);

  const onPlay = () => {
    const duration = videoRef.current!.duration;

    videoRef.current!.onended = () => {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: params.id,
          watched: duration,
          duration,
        }),
      });
    };
  };

  return (
    <div className="p-8 flex flex-col items-center gap-4">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onPlay={onPlay}
        className="w-[900px]"
      />

      {analytics && (
        <div className="text-sm text-gray-500">
          👁 Views: {analytics.views} <br />
          ⏱ Avg Watch:{" "}
          {analytics.views
            ? Math.round(
                (analytics.totalWatchTime / analytics.views / analytics.duration) * 100
              )
            : 0}
          %
        </div>
      )}
    </div>
  );
}
