"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Video = {
  id: string;
  createdAt: string;
  fileName: string;
  size?: number;
  views: number;
  averageCompletion: number;
  duration: number;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch videos");
        return r.json();
      })
      .then((data) => {
        setVideos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <main className="min-h-[calc(100vh-64px)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Videos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {videos.length === 0
              ? "No videos uploaded yet"
              : `${videos.length} video${videos.length === 1 ? "" : "s"} total`}
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No videos have been uploaded yet
            </p>
            <Link href="/recording">
              <Button>Start Recording</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video}
                formatDate={formatDate}
                formatDuration={formatDuration}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function VideoCard({ 
  video,
  formatDate,
  formatDuration,
  formatFileSize
}: { 
  video: Video;
  formatDate: (dateString: string) => string;
  formatDuration: (seconds: number) => string;
  formatFileSize: (bytes?: number) => string;
}) {
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setCopying(true);
    try {
      // Fetch shareable URL from API to get the production URL
      const response = await fetch(`/api/videos/${video.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video URL: ${response.status}`);
      }
      const data = await response.json();
      
      // Use shareUrl (video page link) if available, otherwise construct it
      // This ensures analytics are tracked when someone views the video
      let shareLink: string;
      if (data.shareUrl) {
        shareLink = data.shareUrl;
      } else {
        // Construct the video page URL (not localhost, use current origin or production URL)
        const baseUrl = window.location.origin;
        shareLink = `${baseUrl}/videos/${video.id}`;
      }
      
      console.log("Sharing video page URL:", shareLink);
      await navigator.clipboard.writeText(shareLink);
      setShareableUrl(shareLink);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShareableUrl(null);
      }, 2000);
    } catch (err) {
      console.error("Error sharing video:", err);
      // Fallback: use the video page URL
      const shareLink = `${window.location.origin}/videos/${video.id}`;
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Video Thumbnail/Preview Area */}
      <div className="w-full h-48 bg-black flex items-center justify-center relative">
        <svg
          className="w-16 h-16 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link
            href={`/videos/${video.id}?internal=true`}
            className="flex-1 group"
          >
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {video.fileName}
            </h3>
          </Link>
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="ml-2 shrink-0"
            disabled={copying}
          >
            {copied ? (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>Created:</span>
            <span className="font-medium">
              {formatDate(video.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Views:</span>
            <span className="font-medium">{video.views}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Completion:</span>
            <span className="font-medium">
              {video.averageCompletion}%
            </span>
          </div>

          {video.size && (
            <div className="flex items-center justify-between">
              <span>Size:</span>
              <span className="font-medium">
                {formatFileSize(video.size)}
              </span>
            </div>
          )}
        </div>

        {/* Analytics Badge */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Analytics:
            </span>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
              {video.views} views
            </span>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
              {video.averageCompletion}% avg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

