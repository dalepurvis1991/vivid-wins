"use client";

// Client-only countdown for the live draw time. Accepts an ISO string;
// renders nothing if the timestamp is missing or already past.

import { useEffect, useState } from "react";

function format(ms: number) {
    if (ms <= 0) return "Draw live now";
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function Countdown({
    drawAt,
    label = "Draws in",
}: {
    drawAt: string | null | undefined;
    label?: string;
}) {
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    if (!drawAt || now == null) {
        return (
            <span className="text-vw-muted">Draw date TBA</span>
        );
    }
    const delta = new Date(drawAt).getTime() - now;
    return (
        <span className="text-vw-muted">
            {label}{" "}
            <span className="font-bold text-vw-text">{format(delta)}</span>
        </span>
    );
}
