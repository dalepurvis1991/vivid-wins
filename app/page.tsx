// Homepage — hero, stats, marquee, open competitions, why us, how it works,
// partners, final CTA. Mirrors the polish of the static preview while
// running on real Supabase data.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WinnersMarquee from "@/components/WinnersMarquee";
import Countdown from "@/components/Countdown";
import PrizeCarousel, {
    type CarouselPrize,
} from "@/components/PrizeCarousel";

export const dynamic = "force-dynamic";

type Featured = {
    slug: string;
    title: string;
    main_prize_label: string;
    main_prize_value_pennies: number;
    ticket_price_pennies: number;
    image_url: string | null;
    total_tickets: number;
    tickets_sold: number;
    draw_at: string | null;
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

export default async function Home() {
    const supabase = createClient();
    const { data } = await supabase
        .from("competitions")
        .select(
            "slug, title, main_prize_label, main_prize_value_pennies, ticket_price_pennies, image_url, total_tickets, tickets_sold, draw_at",
        )
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(4);

    const featured = (data ?? []) as Featured[];

    const carouselPrizes: CarouselPrize[] = featured.map((f) => ({
        slug: f.slug,
        title: f.title,
        image_url: f.image_url,
        main_prize_label: f.main_prize_label,
        main_prize_value_pennies: f.main_prize_value_pennies,
        ticket_price_pennies: f.ticket_price_pennies,
        total_tickets: f.total_tickets,
        tickets_sold: f.tickets_sold,
    }));

    return (
        <main>
            {/* ==================== HERO ==================== */}
            <section className="relative overflow-hidden">
                <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-vw-accent-soft">
                            <span className="vw-live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                            UK's fastest-growing Pokémon prize draws
                        </div>
                        <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                            Pull the{" "}
                            <span className="bg-gradient-to-r from-vw-accent via-vw-accent-soft to-vw-accent bg-clip-text text-transparent">
                                hits you've been chasing
                            </span>{" "}
                            — for a few quid.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-vw-muted">
                            Grab a ticket, reveal instant wins on the spot,
                            then watch the main prize drawn live on Whatnot.
                            Sealed booster boxes, PSA 10 Charizards, vintage
                            grails — shipped within 48 hours.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/competitions"
                                className="rounded-full bg-vw-accent px-7 py-3.5 font-bold text-black shadow-lg shadow-orange-900/30 transition hover:bg-vw-accent-soft hover:shadow-orange-900/50"
                            >
                                Browse Live Competitions →
                            </Link>
                            <Link
                                href="https://www.whatnot.com/en-GB/user/jmiread"
                                target="_blank"
                                rel="noopener"
                                className="flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 font-bold transition hover:border-vw-accent-soft hover:text-vw-accent-soft"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/images/whatnot-logo.png"
                                    alt=""
                                    aria-hidden
                                    className="h-5 w-5 rounded"
                                />
                                Watch Live on Whatnot
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-vw-muted">
                            <span className="flex items-center gap-1.5">
                                <span className="text-vw-accent-soft">✓</span>
                                Instant-win tickets + live main draw
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="text-vw-accent-soft">✓</span>
                                100% authentic sealed &amp; graded
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="text-vw-accent-soft">✓</span>
                                Free postal entry available
                            </span>
                        </div>
                    </div>

                    {/* Prize card stack */}
                    <div className="relative hidden md:block">
                        <div className="absolute right-0 top-0 w-72 rotate-3 rounded-3xl border border-white/10 bg-gradient-to-br from-vw-surface to-vw-surface-2 p-4 shadow-2xl shadow-black/40 vw-float">
                            <span className="absolute -top-3 left-4 rounded-full bg-vw-accent px-3 py-1 text-xs font-black uppercase tracking-wider text-black">
                                Featured
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/charizard_card_1776318081991.png"
                                alt=""
                                className="aspect-[3/4] w-full rounded-xl object-cover"
                            />
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="font-bold">PSA 10 Charizard</span>
                                <span className="text-vw-accent-soft">£850</span>
                            </div>
                        </div>
                        <div className="absolute -left-6 top-48 w-60 -rotate-6 rounded-3xl border border-white/10 bg-gradient-to-br from-vw-surface to-vw-surface-2 p-4 shadow-2xl shadow-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/booster_display_1776319258080.png"
                                alt=""
                                className="aspect-[4/3] w-full rounded-xl object-cover"
                            />
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="font-bold">Evolving Skies BB</span>
                                <span className="text-vw-accent-soft">£450</span>
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-6 w-56 rotate-2 rounded-2xl border border-white/10 bg-gradient-to-br from-vw-accent/20 to-vw-surface-2 p-4 shadow-2xl shadow-black/40">
                            <div className="text-3xl">🎟</div>
                            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-vw-muted">
                                43 / 50 TICKETS SOLD
                            </div>
                            <div className="mt-0.5 font-bold text-vw-accent-soft">
                                Live draw in 2h 14m
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== STATS ==================== */}
            <section className="mx-auto max-w-6xl px-6">
                <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-vw-surface/60 p-6 md:grid-cols-4">
                    {[
                        { n: "£18,400+", l: "Prizes lined up" },
                        { n: "100%", l: "Live on-camera draws" },
                        { n: "48h", l: "UK dispatch promise" },
                        { n: "PSA/BGS/CGC", l: "Every slab verified" },
                    ].map((s) => (
                        <div key={s.l} className="text-center">
                            <div className="text-2xl font-black text-vw-accent-soft md:text-3xl">
                                {s.n}
                            </div>
                            <div className="mt-1 text-xs text-vw-muted">
                                {s.l}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ==================== PRIZE CAROUSEL ==================== */}
            <PrizeCarousel prizes={carouselPrizes} />

            {/* ==================== WINNERS MARQUEE ==================== */}
            <div className="mt-12">
                <WinnersMarquee />
            </div>

            {/* ==================== OPEN COMPETITIONS ==================== */}
            <section className="mx-auto max-w-6xl px-6 py-16">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                        Filling fast
                    </div>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">
                        Open competitions right now.
                    </h2>
                    <p className="mt-4 text-vw-muted">
                        Grab a random ticket, reveal any instant wins
                        instantly, and tune in to Whatnot for the live main
                        draw. No spin, no edit, no hidden mechanics.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {featured.map((c) => {
                        const pct =
                            c.total_tickets > 0
                                ? Math.round(
                                      (c.tickets_sold / c.total_tickets) *
                                          100,
                                  )
                                : 0;
                        return (
                            <Link
                                key={c.slug}
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
                                    <span className="absolute left-3 top-3 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                        ● Live
                                    </span>
                                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-vw-accent-soft">
                                        {fmt(c.main_prize_value_pennies)}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <h3 className="line-clamp-2 text-base font-bold leading-tight">
                                        {c.title}
                                    </h3>
                                    <div className="mt-3 flex items-baseline justify-between">
                                        <span className="text-2xl font-black text-vw-accent-soft">
                                            {fmt(c.ticket_price_pennies)}
                                        </span>
                                        <span className="text-xs text-vw-muted">
                                            per ticket
                                        </span>
                                    </div>
                                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/50">
                                        <div
                                            className="vw-progress-fill h-full"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between text-[11px] text-vw-muted">
                                        <span>
                                            <b className="text-vw-text">
                                                {c.tickets_sold}
                                            </b>{" "}
                                            / {c.total_tickets} tickets
                                        </span>
                                        <Countdown drawAt={c.draw_at} />
                                    </div>
                                    <div className="mt-4 rounded-full bg-vw-accent/10 py-2 text-center text-xs font-bold text-vw-accent-soft transition group-hover:bg-vw-accent group-hover:text-black">
                                        Enter draw →
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-10 text-center">
                    <Link
                        href="/competitions"
                        className="inline-block rounded-full border border-white/20 px-7 py-3 font-bold transition hover:border-vw-accent-soft hover:text-vw-accent-soft"
                    >
                        View all competitions →
                    </Link>
                </div>
            </section>

            {/* ==================== WHY VIVID WINS ==================== */}
            <section className="mx-auto max-w-6xl px-6 py-16">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                        Why Vivid Wins
                    </div>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">
                        Transparent, fast, built by collectors.
                    </h2>
                </div>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            ico: "🎥",
                            t: "Live on-camera draws",
                            p: "Every winner picked live using a verified RNG. No edits, no re-takes.",
                        },
                        {
                            ico: "🏆",
                            t: "Authenticated prizes",
                            p: "All graded slabs come with a PSA, BGS or CGC cert. Sealed from UK distributors only.",
                        },
                        {
                            ico: "🚚",
                            t: "48-hour UK dispatch",
                            p: "Wins ship within 48h — bubble-wrapped, top-loaded, tracked and insured.",
                        },
                        {
                            ico: "🤝",
                            t: "Skill-based & compliant",
                            p: "Skill question gates every draw. Free postal entry always available.",
                        },
                    ].map((w) => (
                        <div
                            key={w.t}
                            className="rounded-2xl border border-white/10 bg-vw-surface/50 p-6 transition hover:border-vw-accent-soft/40"
                        >
                            <div className="text-3xl">{w.ico}</div>
                            <h3 className="mt-4 font-bold">{w.t}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-vw-muted">
                                {w.p}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ==================== HOW IT WORKS ==================== */}
            <section
                id="how-it-works"
                className="border-y border-white/10 bg-black/30 py-16"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                            How it works
                        </div>
                        <h2 className="mt-3 text-4xl font-black tracking-tight">
                            Four steps. Random tickets. Instant wins.
                        </h2>
                    </div>
                    <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                t: "Follow the channel",
                                p: "Jump on Whatnot and follow @JMIRead so you're notified the moment a new competition opens.",
                            },
                            {
                                t: "Enter & grab a ticket",
                                p: "Pick your competition, answer the skill question and pay — a random ticket is assigned on the spot.",
                            },
                            {
                                t: "Reveal instant wins",
                                p: "17.5% win site credit, 5% win a booster pack, 5% win a golden bonus ticket (a free extra entry). Winners revealed instantly on-screen — no waiting.",
                            },
                            {
                                t: "Watch the live main draw",
                                p: "When the competition fills, we go live on Whatnot and pull the grand-prize ticket on camera.",
                            },
                        ].map((s, i) => (
                            <li
                                key={s.t}
                                className="rounded-2xl border border-white/10 bg-vw-surface/40 p-6"
                            >
                                <div className="text-xs font-black text-vw-accent-soft">
                                    STEP {i + 1}
                                </div>
                                <h3 className="mt-2 font-bold">{s.t}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-vw-muted">
                                    {s.p}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ==================== PARTNERS ==================== */}
            <section className="mx-auto max-w-6xl px-6 py-16">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-vw-accent-soft">
                        Our partners
                    </div>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">
                        Where the draws go live.
                    </h2>
                </div>
                <div className="mt-10 grid gap-5 md:grid-cols-2">
                    <Link
                        href="https://www.whatnot.com/en-GB/user/jmiread"
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-5 rounded-2xl border border-white/10 bg-vw-surface/60 p-6 transition hover:border-vw-accent-soft/40"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/whatnot-logo.png"
                            alt="Whatnot"
                            className="h-16 w-16 rounded-2xl"
                        />
                        <div>
                            <div className="text-xs uppercase tracking-wider text-vw-muted">
                                Proudly partnered with
                            </div>
                            <div className="mt-0.5 text-lg font-bold">
                                @JMIRead on Whatnot
                            </div>
                            <div className="mt-1 text-xs text-vw-accent-soft">
                                Watch every draw live →
                            </div>
                        </div>
                    </Link>
                    <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-vw-surface/60 p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/dufflebagboyz-logo.png"
                            alt="Dufflebagboyz"
                            className="h-16 w-16 rounded-2xl object-cover"
                        />
                        <div>
                            <div className="text-xs uppercase tracking-wider text-vw-muted">
                                In partnership with
                            </div>
                            <div className="mt-0.5 text-lg font-bold">
                                Dufflebagboyz
                            </div>
                            <div className="mt-1 text-xs text-vw-accent-soft">
                                Join the community →
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== FINAL CTA ==================== */}
            <section className="mx-auto max-w-6xl px-6 pb-20">
                <div className="rounded-3xl border border-vw-accent-soft/30 bg-gradient-to-br from-vw-accent/20 via-vw-surface to-vw-surface-2 p-10 text-center md:p-14">
                    <h2 className="text-4xl font-black tracking-tight md:text-5xl">
                        Ready to pull something mental?
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-vw-muted">
                        Enter a live competition, get your random ticket,
                        reveal any instant wins, and watch the main draw
                        happen live on Whatnot.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            href="/competitions"
                            className="rounded-full bg-vw-accent px-8 py-3.5 font-bold text-black shadow-lg transition hover:bg-vw-accent-soft"
                        >
                            Browse Competitions →
                        </Link>
                        <Link
                            href="/signup"
                            className="rounded-full border border-white/20 px-8 py-3.5 font-bold transition hover:border-vw-accent-soft hover:text-vw-accent-soft"
                        >
                            Create free account
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
