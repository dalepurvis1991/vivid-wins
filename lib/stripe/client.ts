// Server-side Stripe client. Never import in client components.

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
    throw new Error(
        "Missing STRIPE_SECRET_KEY in .env.local. See SETUP.md.",
    );
}

export const stripe = new Stripe(secretKey, {
    // Pinning to the SDK's default API version — update when we upgrade `stripe`.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
});
