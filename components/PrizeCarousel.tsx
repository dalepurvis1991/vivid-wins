"use client";

// Homepage prize carousel — auto-rotating spotlight for live prizes.
// Shows one headline prize at a time with fade+slide transitions, and a
// row of thumbnails the user can click to jump. Falls back gracefully
// when < 2 slides are supplied.

import Link from "next/link";
import { useEffect, useState } from "react";

export type CarouselPrize = {
    slug: string;
    title: string;
    image_url: string | null;
    main_prize_label: string;
    main_prize_value_pennies: number;
    ticket_price_pennies: number;
    total_tickets: number;
    tickets_sold: number;
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default function PrizeCarousel({
    prizes,
    interval = 4500,
}: {
    prizes: CarouselPrize[];
    interval?: number;
}) {
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused || prizes.length <= 1) return;
        const t = setInterval(
            () => setIdx((i) => (i + 1) % prizes.length),
            interval,
        );
        return () => clearInterval(t);
    }, [paused, prizes.length, interval]);

    if (prizes.length === 0) return null;

    const active = prizes[idx]!;
    const pct =
        active.total_tickets > 0
            ? Math.round((active.tickets_sold / active.total_tickets) * 100)
            : 0;

    return (
        <section
            className="mx-auto max-w-6xl px-6 py-12"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="mx-auto mb-8 max-w-2xl text-center">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                    Prize spotlight
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                    What you could be taking home.
                </h2>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-vw-surface via-vw-surface-2 to-black/40 p-0 shadow-2xl shadow-black/40">
                {/* Slides layered absolutely, cross-faded via opacity */}
                <div className="relative aspect-[16/9] md:aspect-[21/9]">
                    {prizes.map((p, i) => (
                        <Slide key={p.slug} prize={p} active={i === idx} />
                    ))}

                    {/* Progress bar overlaid bottom */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-black/40">
                        <div
                            className="h-full bg-gradient-to-r from-vw-accent via-vw-accent-soft to-vw-accent"
                            style={{ width: `${pct}%` }}
                        />
                    </div>

                    {/* Caption column (on top of slide) */}
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 md:p-10">
                        <div className="pointer-events-auto w-full">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-200">
                                        <span className="vw-live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                        Live competition
                                    </div>
                                    <h3 className="mt-2 text-2xl font-black leading-tight md:text-4xl">
                                        {active.title}
                                    </h3>
                                    <div className="mt-1 text-sm text-vw-muted md:text-base">
                                        Win{" "}
                                        <b className="text-vw-accent-soft">
                                            {active.main_prize_label}
                                        </b>{" "}
                                        · {fmt(active.main_prize_value_pennies)}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-right">
                                        <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                                            From
                                        </div>
                                        <div className="font-black text-vw-accent-soft">
                                            {fmt(active.ticket_price_pennies)}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/competitions/${active.slug}`}
                                        className="rounded-full bg-vw-accent px-5 py-2 text-sm font-black uppercase tracking-wider text-black transition hover:bg-vw-accent-soft"
                                    >
                                        Enter →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrow controls */}
                    {prizes.length > 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    setIdx(
                                        (i) =>
                                            (i - 1 + prizes.length) %
                                            prizes.length,
                                    )
                                }
                                aria-label="Previous prize"
                                className="group absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-lg backdrop-blur transition hover:border-vw-accent-soft/60 hover:bg-vw-accent/20"
                            >
                                ←
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setIdx((i) => (i + 1) % prizes.length)
                                }
                                aria-label="Next prize"
                                className="group absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2 text-lg backdrop-blur transition hover:border-vw-accent-soft/60 hover:bg-vw-accent/20"
                            >
                                →
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Thumbnails */}
            {prizes.length > 1 ? (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {prizes.map((p, i) => (
                        <button
                            key={p.slug}
                            type="button"
                            onClick={() => setIdx(i)}
                            aria-label={`View ${p.title}`}
                            className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                                i === idx
                                    ? "border-vw-accent-soft shadow-lg shadow-orange-900/30"
                                    : "border-white/10 opacity-60 hover:border-white/30 hover:opacity-100"
                            }`}
                        >
                            {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={p.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-vw-surface text-2xl">
                                    🎟
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

function Slide({
    prize,
    active,
}: {
    prize: CarouselPrize;
    active: boolean;
}) {
    return (
        <div
            className={`absolute inset-0 transition-all duration-700 ease-out ${
                active
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-[1.03] pointer-events-none"
            }`}
        >
            {prize.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={prize.image_url}
                    alt={prize.main_prize_label}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-vw-surface text-6xl">
                    🎟
                </div>
            )}
        </div>
    );
}
