// Competitions index — all live/scheduled comps in a grid.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Countdown from "@/components/Countdown";

export const dynamic = "force-dynamic";

type CompRow = {
    id: string;
    slug: string;
    title: string;
    image_url: string | null;
    ticket_price_pennies: number;
    total_tickets: number;
    tickets_sold: number;
    main_prize_label: string;
    main_prize_value_pennies: number;
    status: string;
    draw_at: string | null;
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default async function CompetitionsIndex() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("competitions")
        .select(
            "id, slug, title, image_url, ticket_price_pennies, total_tickets, tickets_sold, main_prize_label, main_prize_value_pennies, status, draw_at",
        )
        .in("status", ["live", "scheduled"])
        .order("status", { ascending: true })
        .order("created_at", { ascending: false });

    const comps = (data ?? []) as CompRow[];

    return (
        <main className="mx-auto max-w-6xl px-6 py-12">
            <div className="text-center">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                    Live now
                </div>
                <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                    Every competition. Every chance.
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-vw-muted">
                    Every ticket has a shot at instant site credit (17.5%), a
                    booster pack (5%), a golden bonus ticket (5%), or the
                    grand prize live on Whatnot.
                </p>
            </div>

            {error ? (
                <div className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                    Couldn't load competitions: {error.message}
                </div>
            ) : null}

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {comps.map((c) => {
                    const pct =
                        c.total_tickets > 0
                            ? Math.round(
                                  (c.tickets_sold / c.total_tickets) * 100,
                              )
                            : 0;
                    return (
                        <Link
                            key={c.id}
                            href={`/competitions/${c.slug}`}
                            className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-vw-surface to-vw-surface-2 transition hover:border-vw-accent-soft/60 hover:shadow-xl hover:shadow-orange-900/20"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden bg-vw-bg">
                                {c.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={c.image_url}
                                        alt={c.main_prize_label}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                ) : null}
                                <span
                                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                        c.status === "live"
                                            ? "bg-red-500/90 text-white"
                                            : "bg-black/70 text-vw-muted"
                                    }`}
                                >
                                    {c.status === "live" ? "● Live" : c.status}
                                </span>
                                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-vw-accent-soft">
                                    Win {fmt(c.main_prize_value_pennies)}
                                </span>
                            </div>
                            <div className="p-5">
                                <h2 className="line-clamp-2 text-lg font-bold leading-tight">
                                    {c.title}
                                </h2>
                                <p className="mt-1 text-xs uppercase tracking-wide text-vw-muted">
                                    {c.main_prize_label}
                                </p>

                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/50">
                                    <div
                                        className="vw-progress-fill h-full"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-vw-muted">
                                    <span>
                                        <b className="text-vw-text">
                                            {c.tickets_sold}
                                        </b>{" "}
                                        / {c.total_tickets} · {pct}%
                                    </span>
                                    <Countdown drawAt={c.draw_at} />
                                </div>

                                <div className="mt-5 flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-black text-vw-accent-soft">
                                            {fmt(c.ticket_price_pennies)}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                                            per ticket
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-vw-accent/10 px-4 py-2 text-xs font-bold text-vw-accent-soft transition group-hover:bg-vw-accent group-hover:text-black">
                                        Enter →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {!error && comps.length === 0 ? (
                <p className="mt-12 text-center text-vw-muted">
                    No competitions live right now — check back soon.
                </p>
            ) : null}
        </main>
    );
}
