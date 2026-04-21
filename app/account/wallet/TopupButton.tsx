"use client";

// Top-up launcher — asks for an amount, POSTs to /api/stripe/checkout,
// redirects to Stripe. Min £1, max £500 per the API route's zod schema.

import { useState } from "react";

const PRESETS = [5_00, 10_00, 20_00, 50_00];

export default function TopupButton() {
    const [amountPence, setAmountPence] = useState(10_00);
    const [custom, setCustom] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function go() {
        setLoading(true);
        setError(null);
        let amount = amountPence;
        if (custom) {
            const parsed = Math.round(Number(custom) * 100);
            if (!Number.isFinite(parsed) || parsed < 100 || parsed > 500_00) {
                setError("Enter an amount between £1 and £500.");
                setLoading(false);
                return;
            }
            amount = parsed;
        }
        const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purpose: "topup", amountPennies: amount }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
            setError(data.error ?? "Top-up failed");
            setLoading(false);
            return;
        }
        window.location.href = data.url;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => {
                            setAmountPence(p);
                            setCustom("");
                        }}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            amountPence === p && !custom
                                ? "border-vw-accent-soft bg-vw-accent-soft/10 text-vw-accent-soft"
                                : "border-white/15 text-vw-muted hover:border-white/40"
                        }`}
                    >
                        £{p / 100}
                    </button>
                ))}
                <input
                    type="number"
                    min={1}
                    max={500}
                    step="0.01"
                    placeholder="Custom £"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-32 rounded-full border border-white/15 bg-vw-bg/80 px-4 py-2 text-sm outline-none focus:border-vw-accent-soft"
                />
            </div>
            <button
                onClick={go}
                disabled={loading}
                className="rounded-full bg-vw-accent px-6 py-2.5 font-semibold text-black transition hover:bg-vw-accent-soft disabled:opacity-50"
            >
                {loading ? "Redirecting…" : "Top up with card"}
            </button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}
