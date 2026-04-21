// Account overview — shows the user's entries. Protected.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

function formatPence(pence: number) {
    return `£${(pence / 100).toFixed(2)}`;
}

export default async function AccountPage() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: wallet }, { data: entries }] = await Promise.all([
        supabase
            .from("wallets")
            .select("balance_pennies")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("competition_entries")
            .select(
                "id, ticket_number, is_instant_winner, created_at, competition:competitions(title, slug)",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
    ]);

    const balance = wallet?.balance_pennies ?? 0;

    return (
        <>
            <Header />
            <main className="mx-auto max-w-5xl px-6 py-10">
                <h1 className="text-3xl font-extrabold tracking-tight">
                    Your account
                </h1>
                <p className="mt-1 text-sm text-vw-muted">{user.email}</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/account/wallet"
                        className="rounded-2xl border border-white/10 bg-vw-surface/60 p-5 transition hover:border-vw-accent-soft/40"
                    >
                        <div className="text-xs uppercase tracking-wide text-vw-muted">
                            Wallet
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-vw-accent-soft">
                            {formatPence(balance)}
                        </div>
                        <div className="mt-3 text-sm text-vw-muted">
                            Top up or spend on tickets →
                        </div>
                    </Link>
                    <Link
                        href="/competitions"
                        className="rounded-2xl border border-white/10 bg-vw-surface/60 p-5 transition hover:border-vw-accent-soft/40"
                    >
                        <div className="text-xs uppercase tracking-wide text-vw-muted">
                            Browse
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                            Live competitions
                        </div>
                        <div className="mt-3 text-sm text-vw-muted">
                            Find your next draw →
                        </div>
                    </Link>
                </div>

                <h2 className="mt-10 text-xl font-bold">Your entries</h2>
                {(entries ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-vw-muted">
                        No entries yet.{" "}
                        <Link
                            href="/competitions"
                            className="text-vw-accent-soft"
                        >
                            Browse competitions
                        </Link>
                        .
                    </p>
                ) : (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-vw-surface/80 text-xs uppercase tracking-wide text-vw-muted">
                                <tr>
                                    <th className="px-4 py-3">Competition</th>
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Instant</th>
                                    <th className="px-4 py-3">Bought</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(entries ?? []).map((e: any) => {
                                    const comp = Array.isArray(e.competition)
                                        ? e.competition[0]
                                        : e.competition;
                                    return (
                                        <tr
                                            key={e.id}
                                            className="border-t border-white/5"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/competitions/${comp?.slug ?? ""}`}
                                                    className="hover:text-vw-accent-soft"
                                                >
                                                    {comp?.title ?? "—"}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                #{e.ticket_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                {e.is_instant_winner ? (
                                                    <span className="text-vw-accent-soft">
                                                        🎉 winner
                                                    </span>
                                                ) : (
                                                    <span className="text-vw-muted">
                                                        in main draw
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-vw-muted">
                                                {new Date(
                                                    e.created_at,
                                                ).toLocaleString("en-GB")}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    );
}
