"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { saveVideo, getVideo } from "@/lib/videoStore";

const VIDEO_KEY = "latest-recording";

export default function Recorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  /* 🔁 Restore persisted video on page load */
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

        /* ✅ Persist video in browser */
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
    </div>
  );
}
