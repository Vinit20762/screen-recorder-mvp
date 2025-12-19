"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Recorder() {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

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

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, {
                    type: "video/webm",
                });

                const url = URL.createObjectURL(blob);
                setVideoUrl(url);

                combinedStream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setRecording(true);
            setVideoUrl(null); // reset previous recording
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Center Black Preview Box */}
            <div className="w-[900px] h-[500px] bg-black rounded-xl border border-neutral-800 flex items-center justify-center">
                {!videoUrl && (
                    <span className="text-gray-500 text-sm">
                        Screen preview will appear here
                    </span>
                )}

                {videoUrl && (
                    <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain rounded-xl"
                    />
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                <Button
                    variant="outline"
                    onClick={startRecording}
                    disabled={recording}
                >
                    Start
                </Button>

                <Button
                    variant="outline"
                    onClick={stopRecording}
                    disabled={!recording}
                >
                    Stop
                </Button>

                {videoUrl && (
                    <a href={videoUrl} download="recording.webm">
                        <Button>Download</Button>
                    </a>
                )}
            </div>
        </div>
    );
}
