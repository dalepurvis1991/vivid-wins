// Create a Stripe Checkout session for:
//   - `purpose=topup`: top up the wallet by £amount
//   - `purpose=entry`: buy N tickets (1–25) for a competition
//
// Body shape:
//   { purpose: "topup", amountPennies: number }
//   { purpose: "entry", competitionId: string, quantity: number }
//
// The webhook at /api/stripe/webhook is what actually credits the wallet /
// assigns the tickets once Stripe confirms payment.

import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TICKETS_PER_PURCHASE = 25;

const bodySchema = z.discriminatedUnion("purpose", [
    z.object({
        purpose: z.literal("topup"),
        amountPennies: z.number().int().min(100).max(500_00),
    }),
    z.object({
        purpose: z.literal("entry"),
        competitionId: z.string().uuid(),
        quantity: z
            .number()
            .int()
            .min(1)
            .max(MAX_TICKETS_PER_PURCHASE)
            .default(1),
    }),
]);

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (body.purpose === "topup") {
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "gbp",
                        unit_amount: body.amountPennies,
                        product_data: { name: "Vivid Wins — Wallet top-up" },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                metadata: {
                    purpose: "topup",
                    user_id: user.id,
                },
            },
            success_url: `${appUrl}/account/wallet?topup=success`,
            cancel_url: `${appUrl}/account/wallet?topup=cancelled`,
            customer_email: user.email ?? undefined,
        });
        return NextResponse.json({ url: session.url });
    }

    // purpose === "entry"
    const { data: comp, error } = await supabase
        .from("competitions")
        .select(
            "id, slug, title, ticket_price_pennies, status, total_tickets, tickets_sold",
        )
        .eq("id", body.competitionId)
        .single();

    if (error || !comp) {
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

    const remaining = comp.total_tickets - comp.tickets_sold;
    if (body.quantity > remaining) {
        return NextResponse.json(
            {
                error: `Only ${remaining} ticket${remaining === 1 ? "" : "s"} left — please lower the quantity.`,
            },
            { status: 409 },
        );
    }

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "gbp",
                    unit_amount: comp.ticket_price_pennies,
                    product_data: {
                        name: `Ticket — ${comp.title}`,
                        description:
                            body.quantity > 1
                                ? `${body.quantity} random tickets`
                                : undefined,
                    },
                },
                quantity: body.quantity,
                adjustable_quantity: {
                    enabled: false,
                },
            },
        ],
        payment_intent_data: {
            metadata: {
                purpose: "entry",
                user_id: user.id,
                competition_id: comp.id,
                price_pennies: String(comp.ticket_price_pennies),
                quantity: String(body.quantity),
            },
        },
        success_url: `${appUrl}/competitions/${comp.slug}?entry=success&qty=${body.quantity}`,
        cancel_url: `${appUrl}/competitions/${comp.slug}?entry=cancelled`,
        customer_email: user.email ?? undefined,
    });
    return NextResponse.json({ url: session.url });
}
