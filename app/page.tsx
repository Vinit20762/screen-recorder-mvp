import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4">
          Record, Trim & Share Videos
        </h1>

        <p className="text-gray-400 mb-8">
          Marvedge Recorder lets you capture your screen and microphone,
          trim recordings, and share them instantly.
        </p>

        <Link href="/recording">
          <button className="cursor-pointer px-6 py-3 rounded-md bg-white text-black font-medium hover:bg-gray-200 transition">
            Start Recording
          </button>
        </Link>
      </div>
    </main>
  );
}
