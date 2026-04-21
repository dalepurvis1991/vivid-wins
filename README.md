# Vivid Wins — Next.js app

UK Pokémon competition site. Wallet-based site credit, Stripe for top-ups and
card payment, Supabase for auth + Postgres. Default structure: 17.5% instant
credit wins + 5% instant booster-pack wins + 1 main winner (see
`../Pokemon Vivid-wins/COMPETITION-STRUCTURE.md`).

## First time

Follow [`SETUP.md`](./SETUP.md) step-by-step — it walks through creating the
Supabase project and Stripe test account and pasting keys into `.env.local`.

## Day-to-day

```bash
npm install
npm run dev                                  # Terminal 1
stripe listen --forward-to localhost:3000/api/stripe/webhook   # Terminal 2
```

App at <http://localhost:3000>.

## Layout

```
app/
  layout.tsx                  root layout, fonts, metadata
  page.tsx                    homepage (placeholder — env health check)
  globals.css                 Tailwind + brand tokens
  api/
    stripe/
      checkout/route.ts       create Checkout session (topup or entry)
      webhook/route.ts        stripe events → wallet credit / buy_ticket RPC
    entries/
      create/route.ts         wallet-paid ticket purchase → buy_ticket RPC
lib/
  supabase/
    client.ts                 browser client (anon, respects RLS)
    server.ts                 server client (anon + cookies)
    admin.ts                  service-role client — SERVER ONLY
  stripe/
    client.ts                 Stripe SDK singleton
middleware.ts                 refresh Supabase session cookies
supabase/
  migrations/
    20260418000000_initial_schema.sql   tables, enums, triggers, buy_ticket()
```

## Money & safety

- **All money is stored as integer pence.** Never use floats.
- **Wallet source of truth is `wallet_transactions`** (append-only ledger). The
  `wallets.balance_pennies` column is a trigger-maintained cache.
- **Tickets are assigned atomically** inside the `buy_ticket()` Postgres
  function using `SELECT … FOR UPDATE` on the competition row.
- **Never import `lib/supabase/admin.ts` in a client component.** It uses the
  service-role key, which bypasses RLS.

## Schema changes

Edit `supabase/migrations/` (new timestamped file per change), then
`supabase db push`. Never edit an old migration.

## Deploy

Vercel, linked to the repo. Env vars live in
Vercel → Project Settings → Environment Variables. For the live webhook,
create an endpoint in Stripe → Developers → Webhooks pointing at
`https://<your-domain>/api/stripe/webhook` and put its signing secret into
Vercel as `STRIPE_WEBHOOK_SECRET`.
