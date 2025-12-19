import { ModeToggle } from "@/components/ui/ModeToggle"
import Link from "next/link"

export default function Navbar() {
    return (
        <nav className="w-full border-b px-6 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Marvedge Recorder</h1>
            <div className="flex items-center gap-2">
                <Link href="/">
                    <button className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:cursor-pointer">Home</button>
                </Link>
                <Link href="/recording">
                    <button className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:cursor-pointer">Recorder</button>
                </Link>
                <button className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:cursor-pointer">Trim Video</button>
                <button className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:cursor-pointer mr-6">Videos</button>
                <ModeToggle />
            </div>
        </nav>
    )
}
