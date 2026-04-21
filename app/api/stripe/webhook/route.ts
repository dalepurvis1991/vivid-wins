// Stripe webhook receiver.
// Stripe posts to this endpoint when a payment succeeds (or fails, refunds, etc.).
// For a `payment_intent.succeeded` event we:
//   - if the metadata says `purpose=topup`, credit the user's wallet
//   - if the metadata says `purpose=entry`, call `buy_ticket()` to assign a ticket
//
// Dev: stripe listen --forward-to localhost:3000/api/stripe/webhook
// Prod: configure the endpoint URL in Stripe dashboard → Developers → Webhooks.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // webhook signature verify needs node crypto
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json(
            { error: "STRIPE_WEBHOOK_SECRET not set" },
            { status: 500 },
        );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            webhookSecret,
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { error: `Signature verify failed: ${msg}` },
            { status: 400 },
        );
    }

    // Handle the events we care about.
    switch (event.type) {
        case "payment_intent.succeeded": {
            const pi = event.data.object as Stripe.PaymentIntent;
            await handlePaymentSucceeded(pi);
            break;
        }
        case "payment_intent.payment_failed": {
            // Log for visibility — user retries via UI.
            console.warn(
                "[stripe] payment_intent.payment_failed",
                event.data.object.id,
            );
            break;
        }
        default:
            // Ignore — don't 400, Stripe will keep retrying.
            break;
    }

    return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
    const supabase = createAdminClient();

    const purpose = pi.metadata?.purpose;
    const userId = pi.metadata?.user_id;

    if (!userId) {
        console.warn("[stripe] payment without user_id metadata:", pi.id);
        return;
    }

    if (purpose === "topup") {
        // Credit wallet with the paid amount. amount is in cents/pence already.
        const { error } = await supabase.from("wallet_transactions").insert({
            user_id: userId,
            kind: "topup_stripe",
            amount_pennies: pi.amount,
            stripe_payment_intent_id: pi.id,
            description: `Wallet top-up £${(pi.amount / 100).toFixed(2)}`,
        });
        if (error) {
            console.error("[stripe] topup credit failed:", error);
            throw error; // cause 500 so Stripe retries
        }
        return;
    }

    if (purpose === "entry") {
        const competitionId = pi.metadata?.competition_id;
        const pricePennies = Number(pi.metadata?.price_pennies ?? pi.amount);
        const quantity = Math.max(1, Number(pi.metadata?.quantity ?? 1));
        if (!competitionId) {
            console.warn("[stripe] entry without competition_id:", pi.id);
            return;
        }

        // buy_ticket() assigns one ticket at a time. Loop for N-ticket
        // purchases. We tag each ticket with a per-index stripe_pi suffix so
        // the SQL "stripe_pi already consumed" guard still triggers on replay.
        for (let i = 0; i < quantity; i++) {
            const piTag = quantity === 1 ? pi.id : `${pi.id}#${i}`;
            const { error } = await supabase.rpc("buy_ticket", {
                p_competition_id: competitionId,
                p_user_id: userId,
                p_paid_via: "stripe",
                p_price_pennies: pricePennies,
                p_stripe_pi: piTag,
            });
            if (error) {
                console.error(
                    `[stripe] buy_ticket failed (${i + 1}/${quantity}):`,
                    error,
                );
                throw error;
            }
        }
        return;
    }

    console.warn(
        "[stripe] payment_intent.succeeded with unknown purpose:",
        purpose,
        pi.id,
    );
}
