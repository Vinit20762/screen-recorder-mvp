"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { getVideo } from "@/lib/videoStore";

const VIDEO_KEY = "latest-recording";

export default function TrimPage() {
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);

    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0); // 🔹 CHANGE #2: track duration
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    // Load FFmpeg once
    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                const ffmpeg = new FFmpeg();

                ffmpeg.on("log", ({ message }) => {
                    console.log("FFmpeg:", message);
                });

                await ffmpeg.load({
                    coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
                    wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
                    workerURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js",
                });

                ffmpegRef.current = ffmpeg;
                setFfmpegLoaded(true);
            } catch (err) {
                setError("Failed to load FFmpeg");
            }
        };

        loadFFmpeg();
    }, []);

    // Restore persisted recording
    useEffect(() => {
        const restoreVideo = async () => {
            const blob = await getVideo(VIDEO_KEY);
            if (!blob) return;

            setVideoBlob(blob);
            setVideoUrl(URL.createObjectURL(blob));
        };

        restoreVideo();
    }, []);

    // 🔹 CHANGE #1: Revoke object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (trimmedUrl) URL.revokeObjectURL(trimmedUrl);
        };
    }, [videoUrl, trimmedUrl]);

    const trimVideo = async () => {
        if (!videoBlob || !ffmpegRef.current) {
            setError("Video or FFmpeg not ready");
            return;
        }

        if (start >= end) {
            setError("Start time must be less than end time");
            return;
        }

        // 🔹 CHANGE #2: Prevent trimming beyond video duration
        if (end > Math.floor(videoDuration)) {
            setError("End time exceeds video duration");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const ffmpeg = ffmpegRef.current;

            await ffmpeg.writeFile("input.webm", await fetchFile(videoBlob));

            await ffmpeg.exec([
                "-i",
                "input.webm",
                "-ss",
                String(start),
                "-to",
                String(end),
                "-c",
                "copy",
                "output.webm",
            ]);

            const data = await ffmpeg.readFile("output.webm");

            const uint8Array = data instanceof Uint8Array ? data : new Uint8Array();

            if (uint8Array.length === 0) {
                throw new Error("Trimmed video is empty");
            }

            const trimmedBlob = new Blob([uint8Array.slice()], {
                type: "video/webm",
            });

            setTrimmedUrl(URL.createObjectURL(trimmedBlob));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to trim video");
        } finally {
            setLoading(false);
        }
    };

    const uploadToS3 = async () => {
        if (!trimmedUrl) return;

        const blob = await fetch(trimmedUrl).then(r => r.blob());

        const formData = new FormData();
        formData.append("file", blob, "trimmed.webm");

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        window.location.href = `/videos/${data.id}`;
    };


    return (
        <main className="flex flex-col items-center gap-6 p-6">
            <h1 className="text-2xl font-semibold">Trim Video</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {!ffmpegLoaded && (
                <div className="text-gray-600">Loading FFmpeg...</div>
            )}

            <div className="w-[900px] h-[500px] bg-black rounded-xl flex items-center justify-center">
                {!videoUrl && (
                    <span className="text-gray-500">No recorded video found</span>
                )}

                {videoUrl && !trimmedUrl && (
                    <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => {
                            const duration = Math.floor(e.currentTarget.duration);
                            setEnd(duration);
                            setVideoDuration(duration); // 🔹 CHANGE #2: store duration
                        }}
                    />
                )}

                {trimmedUrl && (
                    <video
                        src={trimmedUrl}
                        controls
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            {videoUrl && (
                <div className="flex gap-4 items-center">
                    <div>
                        <label className="text-sm">Start (sec)</label>
                        <input
                            type="number"
                            min={0}
                            value={start}
                            onChange={(e) => setStart(Number(e.target.value))}
                            className="border px-2 py-1 ml-2 w-20"
                        />
                    </div>

                    <div>
                        <label className="text-sm">End (sec)</label>
                        <input
                            type="number"
                            min={start + 1}
                            value={end}
                            onChange={(e) => setEnd(Number(e.target.value))}
                            className="border px-2 py-1 ml-2 w-20"
                        />
                    </div>

                    <Button onClick={trimVideo} disabled={loading || !ffmpegLoaded}>
                        {loading ? "Trimming..." : "Trim"}
                    </Button>
                </div>
            )}

            {trimmedUrl && (
                <a href={trimmedUrl} download="trimmed.webm">
                    <Button>Download Trimmed Video</Button>
                </a>
            )}
            <Button onClick={uploadToS3}>Upload & Share</Button>
        </main>
    );
}
