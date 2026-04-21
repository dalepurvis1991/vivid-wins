"use client";

// Fire-and-forget confetti. Mounts N pieces that CSS animates down-screen.
// Only runs when `fire` is true — keeps initial SSR clean.

import { useEffect, useState } from "react";

const COLORS = [
    "#FF7A00",
    "#FFC332",
    "#FF4757",
    "#6ee7ff",
    "#b388ff",
    "#ffffff",
];

export default function ConfettiBurst({
    fire,
    pieces = 90,
}: {
    fire: boolean;
    pieces?: number;
}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (fire) setReady(true);
    }, [fire]);

    if (!ready) return null;

    return (
        <>
            {Array.from({ length: pieces }).map((_, i) => {
                const left = Math.random() * 100;
                const delay = Math.random() * 1.2;
                const duration = 2.8 + Math.random() * 2;
                const color = COLORS[i % COLORS.length];
                const rotate = Math.random() * 360;
                return (
                    <span
                        key={i}
                        className="vw-confetti-piece"
                        style={{
                            left: `${left}vw`,
                            background: color,
                            animationDelay: `${delay}s`,
                            animationDuration: `${duration}s`,
                            transform: `rotate(${rotate}deg)`,
                            borderRadius: i % 3 === 0 ? "2px" : "50%",
                        }}
                    />
                );
            })}
        </>
    );
}
