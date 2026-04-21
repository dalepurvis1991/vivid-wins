// Top strip — pulsing live dot + "next draw live on Whatnot".
import Link from "next/link";

export default function LiveStrip() {
    return (
        <div className="w-full border-b border-white/5 bg-gradient-to-r from-black/60 via-[#1a0f33]/80 to-black/60 text-xs">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center">
                <span className="vw-live-dot inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="text-vw-muted">
                    Next draw goes{" "}
                    <span className="font-bold text-vw-text">LIVE</span> on
                    Whatnot —{" "}
                    <Link
                        href="https://www.whatnot.com/en-GB/user/jmiread"
                        target="_blank"
                        rel="noopener"
                        className="font-extrabold text-vw-accent-soft hover:text-vw-accent"
                    >
                        @JMIRead
                    </Link>{" "}
                    · UK-dispatched · Verified PSA / BGS / CGC
                </span>
            </div>
        </div>
    );
}
