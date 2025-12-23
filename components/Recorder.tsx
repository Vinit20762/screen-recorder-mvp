"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { saveVideo, getVideo, deleteVideo } from "@/lib/videoStore";

const VIDEO_KEY = "latest-recording";

export default function Recorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Share/Upload states
  const [uploading, setUploading] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // restore persisted video on page load 
  useEffect(() => {
    const restoreVideo = async () => {
      const blob = await getVideo(VIDEO_KEY);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    };

    restoreVideo();
  }, []);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        /* Persist video in browser */
        await saveVideo(VIDEO_KEY, blob);

        const url = URL.createObjectURL(blob);
        setVideoUrl(url);

        combinedStream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setVideoUrl(null);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const uploadToS3 = async () => {
    if (!videoUrl) return;

    setUploading(true);
    setUploadError(null);
    setShareableUrl(null);

    try {
      // Get the video blob from the stored video
      const blob = await getVideo(VIDEO_KEY);
      if (!blob) {
        throw new Error("Video not found");
      }

      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload video");
      }

      const data = await res.json();
      // Create shareable application URL instead of S3 URL
      const appUrl = `${window.location.origin}/videos/${data.id}`;
      setShareableUrl(appUrl);

      // Cleaup- Delete video from IndexedDB after successful upload
      console.log("Upload successful, cleaning up IndexedDB...");
      try {
        await deleteVideo(VIDEO_KEY);
        console.log("IndexedDB cleanup successful - video removed from browsr storage");
      } catch (cleanupError) {
        console.error("Failed to cleanup IndexedDB:", cleanupError);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload video"
      );
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareableUrl) return;

    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleShareAgain = () => {
    setShareableUrl(null);
    setUploadError(null);
    setCopied(false);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Preview box */}
      <div className="w-[900px] h-[500px] bg-black rounded-xl border flex items-center justify-center">
        {!videoUrl && (
          <span className="text-gray-500">
            Screen preview will appear here
          </span>
        )}
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 items-center w-full max-w-2xl">
        <div className="flex gap-4">
          <Button onClick={startRecording} disabled={recording}>
            Start
          </Button>

          <Button onClick={stopRecording} disabled={!recording}>
            Stop
          </Button>

          {videoUrl && (
            <>
              <a href={videoUrl} download="recording.webm">
                <Button variant="outline">Download</Button>
              </a>

              <Button
                onClick={() => router.push("/trim")}
                variant="secondary"
              >
                Trim Video
              </Button>
            </>
          )}
        </div>

        {/* Share Section */}
        {videoUrl && (
          <div className="w-full flex flex-col gap-4 items-center">
            {!shareableUrl && !uploading && !uploadError && (
              <Button onClick={uploadToS3} className="min-w-32">
                Save and Share
              </Button>
            )}

            {uploading && (
              <div className="flex flex-col items-center gap-2">
                <Button disabled className="min-w-32">
                  Uploading...
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we upload your video
                </p>
              </div>
            )}

            {uploadError && (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded w-full text-center">
                  {uploadError}
                </div>
                <Button onClick={handleShareAgain} variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {shareableUrl && (
              <div className="flex flex-col gap-3 items-center w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-medium">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Video Saved successfully!
                </div>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={shareableUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant={copied ? "default" : "outline"}
                    className="min-w-24"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  This link will be valid for 7 days
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
