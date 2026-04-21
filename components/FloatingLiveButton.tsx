// Persistent floating button — "LIVE on Whatnot". Bottom-right on every page.
import Link from "next/link";

export default function FloatingLiveButton() {
    return (
        <Link
            href="https://www.whatnot.com/en-GB/user/jmiread"
            target="_blank"
            rel="noopener"
            aria-label="Watch live on Whatnot"
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-red-500 to-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/40 transition hover:scale-105 hover:shadow-red-900/60"
        >
            <span className="vw-live-dot inline-block h-2 w-2 rounded-full bg-white" />
            LIVE on Whatnot
        </Link>
    );
}
