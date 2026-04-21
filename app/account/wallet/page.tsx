// Wallet page — balance, top-up button (Stripe), recent transactions.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import TopupButton from "./TopupButton";

export const dynamic = "force-dynamic";

function formatPence(pence: number) {
    // Signed format so debits show as -£x.xx
    const abs = Math.abs(pence) / 100;
    const sign = pence < 0 ? "-" : "";
    return `${sign}£${abs.toFixed(2)}`;
}

export default async function WalletPage({
    searchParams,
}: {
    searchParams: { topup?: string };
}) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: wallet }, { data: txns }] = await Promise.all([
        supabase
            .from("wallets")
            .select("balance_pennies")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("wallet_transactions")
            .select("id, kind, amount_pennies, description, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
    ]);

    const balance = wallet?.balance_pennies ?? 0;

    return (
        <>
            <Header />
            <main className="mx-auto max-w-3xl px-6 py-10">
                <Link
                    href="/account"
                    className="text-sm text-vw-muted hover:text-vw-text"
                >
                    ← Account
                </Link>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
                    Wallet
                </h1>

                {searchParams.topup === "success" ? (
                    <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm">
                        Top-up successful — balance updated.
                    </div>
                ) : searchParams.topup === "cancelled" ? (
                    <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
                        Top-up cancelled.
                    </div>
                ) : null}

                <div className="mt-6 rounded-2xl border border-white/10 bg-vw-surface/60 p-6">
                    <div className="text-xs uppercase tracking-wide text-vw-muted">
                        Balance
                    </div>
                    <div className="mt-1 text-4xl font-extrabold text-vw-accent-soft">
                        {formatPence(balance)}
                    </div>
                    <div className="mt-5">
                        <TopupButton />
                    </div>
                </div>

                <h2 className="mt-10 text-xl font-bold">Recent transactions</h2>
                {(txns ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-vw-muted">
                        No transactions yet.
                    </p>
                ) : (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-vw-surface/80 text-xs uppercase tracking-wide text-vw-muted">
                                <tr>
                                    <th className="px-4 py-3">When</th>
                                    <th className="px-4 py-3">Kind</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(txns ?? []).map((t: any) => (
                                    <tr
                                        key={t.id}
                                        className="border-t border-white/5"
                                    >
                                        <td className="px-4 py-3 text-vw-muted">
                                            {new Date(
                                                t.created_at,
                                            ).toLocaleString("en-GB")}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {t.kind}
                                        </td>
                                        <td className="px-4 py-3">
                                            {t.description ?? "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold ${
                                                t.amount_pennies < 0
                                                    ? "text-red-300"
                                                    : "text-green-300"
                                            }`}
                                        >
                                            {formatPence(t.amount_pennies)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    );
}
