// Wallet-paid ticket purchase — no Stripe.
// Called when a signed-in user has enough site credit and clicks "Use wallet".
// Runs the `buy_ticket` RPC under the service-role key so the transaction
// (ticket assignment + wallet debit + any instant-win credit) is atomic.
//
// The RPC itself checks that the competition is live and assigns a random
// unused ticket with row-level locking, so two parallel buyers can't race.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
    competitionId: z.string().uuid(),
});

export async function POST(req: Request) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
        body = bodySchema.parse(await req.json());
    } catch (err) {
        return NextResponse.json(
            { error: "Invalid body", detail: String(err) },
            { status: 400 },
        );
    }

    // Look up the competition price + verify it's live.
    const { data: comp, error: compErr } = await supabase
        .from("competitions")
        .select("id, ticket_price_pennies, status")
        .eq("id", body.competitionId)
        .single();

    if (compErr || !comp) {
        return NextResponse.json(
            { error: "Competition not found" },
            { status: 404 },
        );
    }
    if (comp.status !== "live") {
        return NextResponse.json(
            { error: "Competition not on sale" },
            { status: 409 },
        );
    }

    // Pre-check wallet balance — defence in depth (the wallet CHECK constraint
    // will also fail the debit if balance is insufficient, but this produces a
    // friendlier error message).
    const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_pennies")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!wallet || wallet.balance_pennies < comp.ticket_price_pennies) {
        return NextResponse.json(
            { error: "Insufficient wallet balance" },
            { status: 402 },
        );
    }

    // Run the RPC with the service role so RLS doesn't get in the way.
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("buy_ticket", {
        p_competition_id: comp.id,
        p_user_id: user.id,
        p_paid_via: "wallet",
        p_price_pennies: comp.ticket_price_pennies,
        p_stripe_pi: null,
    });

    if (error) {
        return NextResponse.json(
            { error: "Ticket assignment failed", detail: error.message },
            { status: 500 },
        );
    }

    // The RPC returns a single-row result set with the ticket details.
    return NextResponse.json({ result: data });
}
