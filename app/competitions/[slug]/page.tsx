// Competition detail — prize imagery, odds, progress, buy button. Handles
// Stripe redirect-back (?entry=success&qty=N|cancelled) and reveals each
// ticket's result through a CS:GO-style carousel animation.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BuyTicketButton from "@/components/BuyTicketButton";
import Countdown from "@/components/Countdown";
import RevealSection from "@/components/RevealSection";
import type { RevealEntry } from "@/components/TicketReveal";

export const dynamic = "force-dynamic";

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default async function CompetitionDetail({
    params,
    searchParams,
}: {
    params: { slug: string };
    searchParams: { entry?: string; qty?: string };
}) {
    const supabase = createClient();
    const { data: comp } = await supabase
        .from("competitions")
        .select(
            "id, slug, title, description, image_url, ticket_price_pennies, total_tickets, tickets_sold, main_prize_label, main_prize_value_pennies, status, draw_at",
        )
        .eq("slug", params.slug)
        .maybeSingle();

    if (!comp) notFound();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let recentEntries: RevealEntry[] = [];

    if (user && searchParams.entry === "success") {
        const qty = Math.max(
            1,
            Math.min(25, Number(searchParams.qty ?? 1) || 1),
        );
        // Pull a generous window — any bonus_ticket chain triggered by this
        // purchase generates extra entries that we also want in the reveal.
        // MAX_BONUS_CHAIN in the buy_ticket() RPC is 4, so worst case every
        // ticket triggers 4 bonuses → qty * 5 covers it. Hard-cap at 125.
        const fetchLimit = Math.min(125, qty * 5);
        const admin = createAdminClient();
        const { data: entries } = await admin
            .from("competition_entries")
            .select(
                "ticket_number, is_instant_winner, instant_win_id, created_at",
            )
            .eq("competition_id", comp.id)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(fetchLimit);

        if (entries && entries.length > 0) {
            const winIds = entries
                .filter((e) => e.is_instant_winner && e.instant_win_id)
                .map((e) => e.instant_win_id as string);

            const prizeById = new Map<
                string,
                {
                    prize_type:
                        | "site_credit"
                        | "booster_pack"
                        | "bonus_ticket";
                    prize_value_pennies: number;
                    pack_label: string | null;
                }
            >();
            if (winIds.length > 0) {
                const { data: iws } = await admin
                    .from("competition_instant_wins")
                    .select(
                        "id, prize_type, prize_value_pennies, pack_label",
                    )
                    .in("id", winIds);
                if (iws) {
                    for (const iw of iws) {
                        prizeById.set(iw.id, {
                            prize_type: iw.prize_type,
                            prize_value_pennies: iw.prize_value_pennies,
                            pack_label: iw.pack_label,
                        });
                    }
                }
            }

            // Oldest-first so reveal order matches purchase order.
            recentEntries = entries
                .slice()
                .reverse()
                .map((e) => ({
                    ticket_number: e.ticket_number,
                    is_instant_winner: e.is_instant_winner,
                    prize:
                        e.is_instant_winner && e.instant_win_id
                            ? prizeById.get(e.instant_win_id) ?? null
                            : null,
                }));
        }
    }

    const pct =
        comp.total_tickets > 0
            ? Math.round((comp.tickets_sold / comp.total_tickets) * 100)
            : 0;

    const remaining = Math.max(0, comp.total_tickets - comp.tickets_sold);
    const creditWinners = Math.floor(comp.total_tickets * 0.175);
    const packWinners = Math.floor(comp.total_tickets * 0.05);
    const bonusWinners = Math.floor(comp.total_tickets * 0.05);

    return (
        <main className="mx-auto max-w-6xl px-6 py-8">
            <Link
                href="/competitions"
                className="text-sm text-vw-muted hover:text-vw-text"
            >
                ← All competitions
            </Link>

            {/* Redirect-back banners */}
            {searchParams.entry === "cancelled" ? (
                <div className="mt-6 rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
                    Payment cancelled — no tickets bought. Try again when
                    you're ready.
                </div>
            ) : null}

            {recentEntries.length > 0 ? (
                <div className="vw-rise mt-6">
                    <RevealSection entries={recentEntries} />
                </div>
            ) : null}

            <div className="mt-8 grid gap-10 md:grid-cols-[1.1fr_1fr]">
                <div>
                    {comp.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={comp.image_url}
                            alt={comp.main_prize_label}
                            className="w-full rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
                        />
                    ) : (
                        <div className="aspect-[4/3] w-full rounded-2xl border border-white/10 bg-vw-surface" />
                    )}
                </div>

                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-200">
                        <span className="vw-live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                        Live now
                    </div>
                    <h1 className="mt-3 text-4xl font-black tracking-tight">
                        {comp.title}
                    </h1>
                    <div className="mt-2 flex items-baseline gap-2 text-sm">
                        <span className="text-vw-muted">Win:</span>
                        <span className="font-bold">
                            {comp.main_prize_label}
                        </span>
                        <span className="text-vw-accent-soft">
                            · {fmt(comp.main_prize_value_pennies)}
                        </span>
                    </div>
                    {comp.description ? (
                        <p className="mt-4 text-sm leading-relaxed text-vw-muted">
                            {comp.description}
                        </p>
                    ) : null}

                    <div className="mt-6 rounded-2xl border border-white/10 bg-vw-surface/60 p-5">
                        <div className="flex justify-between text-xs text-vw-muted">
                            <span>
                                <b className="text-vw-text">
                                    {comp.tickets_sold}
                                </b>{" "}
                                / {comp.total_tickets} tickets sold
                            </span>
                            <Countdown drawAt={comp.draw_at} />
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50">
                            <div
                                className="vw-progress-fill h-full"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                        <div className="rounded-xl border border-white/10 bg-vw-surface/60 p-3">
                            <div className="text-lg font-black text-vw-accent-soft">
                                {creditWinners}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                                Credit wins (17.5%)
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-vw-surface/60 p-3">
                            <div className="text-lg font-black text-vw-accent-soft">
                                {packWinners}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                                Booster packs (5%)
                            </div>
                        </div>
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                            <div className="text-lg font-black text-yellow-200">
                                {bonusWinners}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-yellow-200/80">
                                Golden tickets (5%)
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-vw-surface/60 p-3">
                            <div className="text-lg font-black text-vw-accent-soft">
                                1
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-vw-muted">
                                Main prize
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        {comp.status !== "live" ? (
                            <div className="rounded-full bg-white/10 px-5 py-3 text-center text-sm font-bold text-vw-muted">
                                {comp.status === "sold_out"
                                    ? "Sold out"
                                    : comp.status === "drawn"
                                      ? "Drawn — winner announced"
                                      : "Opens soon"}
                            </div>
                        ) : user ? (
                            <BuyTicketButton
                                competitionId={comp.id}
                                pricePennies={comp.ticket_price_pennies}
                                remaining={remaining}
                            />
                        ) : (
                            <Link
                                href="/login"
                                className="block rounded-full bg-vw-accent px-6 py-3.5 text-center font-bold text-black shadow-lg shadow-orange-900/30 transition hover:bg-vw-accent-soft"
                            >
                                Sign in to buy tickets —{" "}
                                {fmt(comp.ticket_price_pennies)} each
                            </Link>
                        )}
                    </div>

                    <p className="mt-4 text-[11px] leading-relaxed text-vw-muted">
                        Skill question gates every paid entry. Free postal
                        entry is always available. 18+.
                    </p>
                </div>
            </div>
        </main>
    );
}
