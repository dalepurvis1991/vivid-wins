"use client";

// Client component — quantity stepper (1–25) + POST /api/stripe/checkout,
// then redirect the browser to the returned Stripe Checkout URL.

import { useMemo, useState } from "react";

const MAX_QTY = 25;

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default function BuyTicketButton({
    competitionId,
    pricePennies,
    remaining,
    disabled,
}: {
    competitionId: string;
    pricePennies: number;
    remaining: number;
    disabled?: boolean;
}) {
    const hardMax = Math.max(1, Math.min(MAX_QTY, remaining));
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const total = useMemo(() => qty * pricePennies, [qty, pricePennies]);

    const clamp = (n: number) => Math.max(1, Math.min(hardMax, Math.floor(n)));

    async function buy() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    purpose: "entry",
                    competitionId,
                    quantity: qty,
                }),
            });
            const data = (await res.json()) as {
                url?: string;
                error?: string;
            };
            if (res.status === 401) {
                window.location.href = "/login";
                return;
            }
            if (!res.ok || !data.url) {
                setError(data.error ?? "Checkout failed");
                setLoading(false);
                return;
            }
            window.location.href = data.url;
        } catch (e) {
            setError(String(e));
            setLoading(false);
        }
    }

    const quickPicks = [1, 3, 5, 10].filter((n) => n <= hardMax);

    return (
        <div className="flex flex-col gap-3">
            {/* Quantity stepper */}
            <div className="rounded-2xl border border-white/10 bg-vw-surface/60 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-vw-muted">
                    <span>How many tickets?</span>
                    <span>Max {hardMax}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setQty((q) => clamp(q - 1))}
                        disabled={qty <= 1 || loading}
                        aria-label="Decrease quantity"
                        className="h-11 w-11 rounded-full border border-white/15 bg-black/30 text-xl font-black transition hover:border-vw-accent-soft/60 hover:text-vw-accent-soft disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        −
                    </button>

                    <div className="flex-1 text-center">
                        <input
                            type="number"
                            min={1}
                            max={hardMax}
                            value={qty}
                            onChange={(e) =>
                                setQty(clamp(Number(e.target.value) || 1))
                            }
                            disabled={loading}
                            className="w-full bg-transparent text-center font-mono text-4xl font-black tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                            {qty === 1 ? "ticket" : "tickets"}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setQty((q) => clamp(q + 1))}
                        disabled={qty >= hardMax || loading}
                        aria-label="Increase quantity"
                        className="h-11 w-11 rounded-full border border-white/15 bg-black/30 text-xl font-black transition hover:border-vw-accent-soft/60 hover:text-vw-accent-soft disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        +
                    </button>
                </div>

                {quickPicks.length > 1 ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {quickPicks.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setQty(n)}
                                disabled={loading}
                                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                                    qty === n
                                        ? "border-vw-accent-soft bg-vw-accent/20 text-vw-accent-soft"
                                        : "border-white/15 text-vw-muted hover:border-white/30"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="mt-4 flex items-baseline justify-between border-t border-white/5 pt-3">
                    <span className="text-xs uppercase tracking-wider text-vw-muted">
                        Total
                    </span>
                    <span className="font-mono text-2xl font-black text-vw-accent-soft">
                        {fmt(total)}
                    </span>
                </div>
            </div>

            <button
                onClick={buy}
                disabled={loading || disabled || hardMax === 0}
                className="w-full rounded-full bg-vw-accent px-6 py-3.5 text-base font-bold text-black shadow-lg shadow-orange-900/30 transition hover:bg-vw-accent-soft hover:shadow-orange-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading
                    ? "Redirecting to Stripe…"
                    : qty === 1
                      ? `Buy 1 ticket — ${fmt(total)}`
                      : `Buy ${qty} tickets — ${fmt(total)}`}
            </button>

            {error ? (
                <p className="text-sm text-red-300">{error}</p>
            ) : null}
        </div>
    );
}
