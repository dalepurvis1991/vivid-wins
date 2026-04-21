"use client";

// TicketReveal — Pokémon-TCG-style card-flip draw animation.
// Each ticket is rendered as a sealed foil card (face-down) that the user
// can click to reveal. The card wobbles in anticipation, then flips in 3D
// with a glow burst. Instant-win reveals get a rainbow holographic sheen,
// sparkle particles, and a rarity stamp; main-draw entries get an elegant
// indigo "ticket stub" aesthetic.
//
// No DOM measurement, no strip math, no hydration-sensitive randomness —
// just a deterministic state machine (idle → wobble → flipping → revealed)
// that renders identically on server and client.

import { useEffect, useRef, useState } from "react";

type Prize = {
    prize_type: "site_credit" | "booster_pack" | "bonus_ticket";
    prize_value_pennies: number;
    pack_label: string | null;
} | null;

export type RevealEntry = {
    ticket_number: number;
    is_instant_winner: boolean;
    prize: Prize;
};

type Result = {
    kind: "main" | "credit" | "pack" | "bonus";
    label: string;
    sub: string;
    emoji: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    // Front-face theme
    accentFrom: string; // CSS colour
    accentTo: string;
    accentRing: string;
    stampText: string; // "RARE" / "EPIC" / "BONUS" / "MAIN DRAW"
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

function resultFromEntry(entry: RevealEntry): Result {
    if (!entry.is_instant_winner || !entry.prize) {
        return {
            kind: "main",
            label: "Main Draw",
            sub: "You're in the live draw",
            emoji: "🎟",
            rarity: "common",
            accentFrom: "#3b3df0",
            accentTo: "#7d5bff",
            accentRing: "rgba(125, 131, 255, 0.6)",
            stampText: "MAIN DRAW",
        };
    }
    if (entry.prize.prize_type === "site_credit") {
        const p = entry.prize.prize_value_pennies;
        const rarity: Result["rarity"] = p >= 1000 ? "epic" : "rare";
        return {
            kind: "credit",
            label: `${fmt(p)} credit`,
            sub: "added to your wallet",
            emoji: "💰",
            rarity,
            accentFrom: "#1fae6b",
            accentTo: "#9af7c8",
            accentRing: "rgba(154, 247, 200, 0.7)",
            stampText: rarity === "epic" ? "EPIC" : "RARE",
        };
    }
    if (entry.prize.prize_type === "bonus_ticket") {
        return {
            kind: "bonus",
            label: "+1 Free Ticket",
            sub: "bonus entry — revealed next",
            emoji: "🎟️",
            rarity: "legendary",
            accentFrom: "#f6b10c",
            accentTo: "#fff2a8",
            accentRing: "rgba(255, 242, 168, 0.95)",
            stampText: "GOLDEN",
        };
    }
    return {
        kind: "pack",
        label: entry.prize.pack_label ?? "Booster pack",
        sub: "ships within 48 hours",
        emoji: "📦",
        rarity: "epic",
        accentFrom: "#ff7a00",
        accentTo: "#ffd36b",
        accentRing: "rgba(255, 211, 107, 0.85)",
        stampText: "EPIC",
    };
}

type Status = "idle" | "wobble" | "flipping" | "revealed";

const WOBBLE_MS = 900;
const FLIP_MS = 800;
const BURST_MS = 900;

// Deterministic sparkle offsets — seed from ticket_number so server/client
// agree. 12 particles per burst.
function sparklePositions(seed: number) {
    let a = (seed >>> 0) || 1;
    const rand = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: 14 }).map((_, i) => {
        const angle = rand() * Math.PI * 2;
        const dist = 100 + rand() * 140;
        return {
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            delay: rand() * 0.4,
            size: 6 + Math.floor(rand() * 10),
            idx: i,
        };
    });
}

function CardBack({ wobble }: { wobble: boolean }) {
    return (
        <div
            className={`vw-card-face vw-card-back relative h-full w-full ${wobble ? "vw-card-wobble" : ""}`}
            style={{
                background:
                    "linear-gradient(135deg, #2a1160 0%, #130a26 40%, #4b1d1d 100%)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
            }}
        >
            {/* Foil sheen */}
            <div className="vw-foil-sheen" />
            {/* Border frame */}
            <div
                className="absolute inset-2 rounded-[14px] border-2"
                style={{
                    borderColor: "rgba(255, 211, 107, 0.7)",
                    boxShadow:
                        "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 30px rgba(255,122,0,0.18)",
                }}
            />
            {/* Centre crest */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div
                    className="text-[11px] font-black uppercase tracking-[0.4em]"
                    style={{ color: "var(--vw-accent-soft)" }}
                >
                    Vivid Wins
                </div>
                <div
                    className="mt-3 flex h-24 w-24 items-center justify-center rounded-full border-2 text-5xl"
                    style={{
                        borderColor: "rgba(255, 211, 107, 0.6)",
                        background:
                            "radial-gradient(circle at 40% 30%, rgba(255,211,107,0.25), rgba(0,0,0,0.4))",
                        boxShadow:
                            "0 0 30px rgba(255,122,0,0.35), inset 0 0 20px rgba(0,0,0,0.6)",
                    }}
                >
                    ?
                </div>
                <div className="mt-4 text-[10px] uppercase tracking-[0.5em] text-vw-muted">
                    Foil Sealed
                </div>
                <div className="mt-1 text-xs font-bold text-white/80">
                    Tap to reveal
                </div>
            </div>
        </div>
    );
}

function CardFront({
    result,
    revealed,
    ticketNumber,
}: {
    result: Result;
    revealed: boolean;
    ticketNumber: number;
}) {
    const isWin = result.kind !== "main";
    return (
        <div
            className={`vw-card-face vw-card-front relative h-full w-full ${revealed && isWin ? "vw-glow-pulse" : ""}`}
            style={{
                background: `linear-gradient(160deg, ${result.accentFrom} 0%, #1a0f33 55%, #0b0715 100%)`,
                boxShadow: `0 22px 60px rgba(0,0,0,0.6), 0 0 0 1px ${result.accentRing} inset`,
            }}
        >
            {/* Holographic sheen for wins */}
            {isWin ? <div className="vw-holo absolute inset-0" /> : null}

            {/* Top strip: ticket # */}
            <div className="absolute left-3 right-3 top-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em]">
                <span style={{ color: result.accentTo }}>Vivid Wins</span>
                <span className="font-mono text-white/80">#{ticketNumber}</span>
            </div>

            {/* Centre: emoji + label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                <div
                    className="text-[88px] leading-none"
                    style={{
                        filter: isWin
                            ? "drop-shadow(0 0 18px rgba(255,211,107,0.95))"
                            : "drop-shadow(0 6px 18px rgba(0,0,0,0.5))",
                    }}
                >
                    {result.emoji}
                </div>
                <div
                    className="mt-3 text-2xl font-black leading-tight"
                    style={{
                        color: "#fff",
                        textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                    }}
                >
                    {result.label}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/70">
                    {result.sub}
                </div>
            </div>

            {/* Rarity stamp (only when revealed) */}
            {revealed ? (
                <div
                    className="vw-stamp absolute right-3 top-10 rounded-md border-2 px-2 py-1 text-[10px] font-black tracking-[0.25em]"
                    style={{
                        borderColor: result.accentTo,
                        color: result.accentTo,
                        background: "rgba(0,0,0,0.55)",
                    }}
                >
                    {result.stampText}
                </div>
            ) : null}

            {/* Corner flourish */}
            <div
                className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[9px] uppercase tracking-[0.35em]"
                style={{ color: "rgba(255,255,255,0.55)" }}
            >
                <span>Foil Edition</span>
                <span>001/∞</span>
            </div>

            {/* Subtle frame */}
            <div
                className="pointer-events-none absolute inset-2 rounded-[14px] border"
                style={{
                    borderColor: "rgba(255,255,255,0.18)",
                    boxShadow: "inset 0 0 40px rgba(0,0,0,0.45)",
                }}
            />
        </div>
    );
}

function TicketCard({
    entry,
    index,
    total,
    isActive,
    onDone,
    onReveal,
    onInstantWin,
}: {
    entry: RevealEntry;
    index: number;
    total: number;
    isActive: boolean;
    onDone: () => void;
    onReveal: () => void;
    onInstantWin: () => void;
}) {
    const [status, setStatus] = useState<Status>("idle");
    const [burstOn, setBurstOn] = useState(false);
    const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const result = resultFromEntry(entry);
    const sparkles = sparklePositions(entry.ticket_number);

    useEffect(() => {
        if (!isActive || status !== "idle") return;
        const t = setTimeout(() => {
            void start();
        }, 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]);

    useEffect(() => {
        return () => {
            if (burstTimer.current) clearTimeout(burstTimer.current);
        };
    }, []);

    async function start() {
        if (status !== "idle") return;
        onReveal();
        setStatus("wobble");
        await new Promise((r) => setTimeout(r, WOBBLE_MS));
        setStatus("flipping");
        // Fire the burst halfway through the flip so it peaks as the card lands
        burstTimer.current = setTimeout(() => setBurstOn(true), FLIP_MS - 250);
        await new Promise((r) => setTimeout(r, FLIP_MS + 60));
        setStatus("revealed");
        if (entry.is_instant_winner) onInstantWin();
        // Let the burst finish then clear it so future renders don't replay
        setTimeout(() => setBurstOn(false), BURST_MS);
        onDone();
    }

    const isWin = entry.is_instant_winner;
    const flipped = status === "flipping" || status === "revealed";

    return (
        <div
            className={`rounded-2xl border p-4 transition ${
                status === "revealed"
                    ? isWin
                        ? "border-vw-accent-soft/60 bg-gradient-to-br from-vw-accent/10 via-vw-surface to-vw-surface-2 shadow-xl shadow-orange-900/30"
                        : "border-white/10 bg-vw-surface/50"
                    : "border-white/10 bg-vw-surface/40"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-black/40 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                            Ticket {index + 1} / {total}
                        </div>
                        <div className="font-mono text-xl font-black">
                            #{entry.ticket_number}
                        </div>
                    </div>
                    {status === "revealed" ? (
                        <div className="vw-rise">
                            {isWin ? (
                                <>
                                    <div className="text-xs font-black uppercase tracking-wider text-vw-accent-soft">
                                        🎉 Instant winner
                                    </div>
                                    <div className="text-lg font-bold">
                                        {entry.prize?.prize_type ===
                                        "site_credit"
                                            ? `${fmt(entry.prize.prize_value_pennies)} site credit`
                                            : entry.prize?.prize_type ===
                                                "bonus_ticket"
                                              ? "+1 Free Ticket"
                                              : `${entry.prize?.pack_label ?? "Booster pack"}`}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-xs font-black uppercase tracking-wider text-vw-accent-soft">
                                        In the main draw
                                    </div>
                                    <div className="text-sm text-vw-muted">
                                        Watch the live pull on Whatnot.
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>

                {status === "idle" ? (
                    <button
                        onClick={start}
                        className="rounded-full bg-vw-accent px-5 py-2 text-sm font-black uppercase tracking-wider text-black transition hover:bg-vw-accent-soft"
                    >
                        ✨ Reveal card
                    </button>
                ) : status === "wobble" ? (
                    <span className="rounded-full bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-vw-accent-soft">
                        Peeling foil…
                    </span>
                ) : status === "flipping" ? (
                    <span className="rounded-full bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-vw-accent-soft">
                        Flipping…
                    </span>
                ) : null}
            </div>

            {/* Card stage */}
            <div
                className="vw-card-stage relative mx-auto mt-4"
                style={{ width: 260, height: 360 }}
            >
                {/* Embers behind the card */}
                {status !== "idle"
                    ? [
                          { left: "10%", delay: "0s" },
                          { left: "22%", delay: "0.4s" },
                          { left: "78%", delay: "0.2s" },
                          { left: "90%", delay: "0.6s" },
                          { left: "50%", delay: "0.9s" },
                      ].map((p, i) => (
                          <span
                              key={i}
                              className="vw-ember"
                              style={{
                                  left: p.left,
                                  bottom: "-8px",
                                  animationDelay: p.delay,
                              }}
                          />
                      ))
                    : null}

                <div
                    className={`vw-card-inner ${flipped ? "vw-card-flipped" : ""}`}
                    style={{ transitionDuration: `${FLIP_MS}ms` }}
                    onClick={status === "idle" ? start : undefined}
                    role={status === "idle" ? "button" : undefined}
                    aria-label={status === "idle" ? "Reveal ticket" : undefined}
                >
                    <CardBack wobble={status === "wobble"} />
                    <CardFront
                        result={result}
                        revealed={status === "revealed"}
                        ticketNumber={entry.ticket_number}
                    />
                </div>

                {/* Glow burst (fires as the card lands) */}
                {burstOn ? (
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        aria-hidden
                    >
                        <div
                            className="vw-burst"
                            style={{ width: 220, height: 220 }}
                        />
                    </div>
                ) : null}

                {/* Sparkles on instant wins */}
                {status === "revealed" && isWin
                    ? sparkles.map((s) => (
                          <span
                              key={s.idx}
                              className="vw-sparkle"
                              style={
                                  {
                                      width: s.size,
                                      height: s.size,
                                      animationDelay: `${s.delay}s`,
                                      "--dx": `${s.dx}px`,
                                      "--dy": `${s.dy}px`,
                                  } as React.CSSProperties
                              }
                          />
                      ))
                    : null}
            </div>

            {status === "revealed" && isWin ? (
                <div className="vw-rise mt-4 rounded-xl border border-vw-accent-soft/30 bg-vw-accent/10 p-3 text-sm">
                    {result.kind === "credit" ? (
                        <>
                            <b className="text-vw-accent-soft">
                                {result.label}
                            </b>{" "}
                            added to your wallet — spend it on any competition.
                        </>
                    ) : result.kind === "bonus" ? (
                        <>
                            <b className="text-vw-accent-soft">Golden ticket!</b>{" "}
                            A <b>free bonus ticket</b> has been added to this
                            draw on us — reveal it next.
                        </>
                    ) : (
                        <>
                            Your <b className="text-vw-accent-soft">
                                {result.label}
                            </b>{" "}
                            booster pack ships within 48 hours.
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
}

export default function TicketReveal({
    entries,
    onInstantWin,
}: {
    entries: RevealEntry[];
    onInstantWin: () => void;
}) {
    // Sequential reveal: tickets beyond `cursor` are locked until the previous
    // one finishes. Users can also click a card manually to jump ahead.
    const [cursor, setCursor] = useState(0);
    const [autoPlay, setAutoPlay] = useState(false);

    const winCount = entries.filter((e) => e.is_instant_winner).length;
    const creditTotal = entries.reduce(
        (sum, e) =>
            sum +
            (e.is_instant_winner && e.prize?.prize_type === "site_credit"
                ? e.prize.prize_value_pennies
                : 0),
        0,
    );
    const packCount = entries.filter(
        (e) => e.is_instant_winner && e.prize?.prize_type === "booster_pack",
    ).length;
    const bonusCount = entries.filter(
        (e) => e.is_instant_winner && e.prize?.prize_type === "bonus_ticket",
    ).length;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-vw-surface/60 p-4">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-vw-accent-soft">
                        Reveal time
                    </div>
                    <div className="mt-1 text-xl font-black">
                        You bought {entries.length}{" "}
                        {entries.length === 1 ? "ticket" : "tickets"} —{" "}
                        {cursor} revealed
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setAutoPlay(true)}
                    disabled={autoPlay || cursor >= entries.length}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:border-vw-accent-soft/60 hover:text-vw-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {autoPlay ? "Revealing all…" : "Reveal all"}
                </button>
            </div>

            <div className="grid gap-3">
                {entries.map((e, i) => (
                    <TicketCard
                        key={`${e.ticket_number}-${i}`}
                        entry={e}
                        index={i}
                        total={entries.length}
                        isActive={autoPlay && i === cursor}
                        onReveal={() => {}}
                        onInstantWin={onInstantWin}
                        onDone={() => setCursor((c) => Math.max(c, i + 1))}
                    />
                ))}
            </div>

            {cursor >= entries.length && entries.length > 0 ? (
                <div className="vw-rise rounded-2xl border border-vw-accent-soft/40 bg-gradient-to-br from-vw-accent/20 via-vw-surface to-vw-surface-2 p-5">
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-vw-accent-soft">
                        Final tally
                    </div>
                    <div className="mt-2 text-2xl font-black">
                        {winCount === 0
                            ? "All tickets in the main draw 🎯"
                            : `${winCount} instant ${winCount === 1 ? "win" : "wins"}!`}
                    </div>
                    <div className="mt-1 text-sm text-vw-muted">
                        {creditTotal > 0
                            ? `${fmt(creditTotal)} added to your wallet. `
                            : null}
                        {packCount > 0
                            ? `${packCount} booster ${packCount === 1 ? "pack" : "packs"} shipping within 48h. `
                            : null}
                        {bonusCount > 0
                            ? `${bonusCount} free bonus ${bonusCount === 1 ? "ticket" : "tickets"} landed in this draw. `
                            : null}
                        {entries.length - winCount > 0
                            ? `${entries.length - winCount} ${entries.length - winCount === 1 ? "ticket is" : "tickets are"} in the main draw — tune in on Whatnot.`
                            : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
