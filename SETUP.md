# Vivid Wins — Setup Guide

This is the **one-time setup** for getting the app running locally and on test-mode
Stripe + a fresh Supabase project. Follow the sections in order. Each section ends
with a checkpoint you can paste into Claude to confirm you're good to move on.

> **Who this is for:** Dale. I've assumed zero prior Supabase or Stripe accounts.
> Everything below is test-mode / free-tier — no money moves anywhere real.

---

## 0. Prerequisites

On your Mac, in Terminal, confirm these exist:

```bash
node -v      # want v20+ (v18 works but v20 is the LTS)
npm -v       # want 10+
```

If Node is missing or old, install it from <https://nodejs.org> (grab the **LTS**
button). Close and reopen Terminal afterwards so the new version is picked up.

Also install the Supabase CLI once (we'll use this to push the schema):

```bash
brew install supabase/tap/supabase
supabase --version
```

**Checkpoint 0:** `node -v`, `npm -v`, `supabase --version` all print numbers, no errors.

---

## 1. Create the Supabase project

1. Open <https://supabase.com> and click **Start your project**.
2. Sign in with GitHub (easiest) or email.
3. Once inside the dashboard, click **New project**.
4. Fill in:
   - **Name:** `vivid-wins`
   - **Database password:** click *Generate a password*, then **save it** into
     your password manager. You won't routinely need it, but if you lose it you
     have to reset the whole DB.
   - **Region:** `West EU (London)` — closest to the UK, fastest for your users.
   - **Pricing plan:** *Free* is fine to start.
5. Click **Create new project** and wait ~2 minutes for provisioning.

### Grab the three Supabase keys

Once the project page loads, in the left sidebar go to **Project Settings → API**.
You'll see three values you need. Copy them into a scratch note for now:

| Label in Supabase dashboard | Env variable we'll paste it into |
| --------------------------- | ---------------------------------- |
| **Project URL**             | `NEXT_PUBLIC_SUPABASE_URL`         |
| **anon / public** key       | `NEXT_PUBLIC_SUPABASE_ANON_KEY`    |
| **service_role** key *(click "Reveal")* | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **The service_role key is a root password.** Never paste it into the browser,
never commit it to git, never share it in Slack. It bypasses every security
rule in the database.

**Checkpoint 1:** You have all three values saved. The Supabase dashboard shows
a green "Healthy" project status.

---

## 2. Push the database schema

From your Mac Terminal, `cd` into this app folder:

```bash
cd "/Users/$(whoami)/path/to/Vivid-wins/vivid-wins-nextjs"
```

*(If you're unsure of the path, drag the `vivid-wins-nextjs` folder from Finder
into the Terminal window — it pastes the full path.)*

Link the local project to your new Supabase project:

```bash
supabase link --project-ref <YOUR-PROJECT-REF>
```

You'll find `<YOUR-PROJECT-REF>` in the Supabase dashboard URL — it's the
string in `https://supabase.com/dashboard/project/<project-ref>`. You'll be
asked for the database password from step 1.

Now push the schema:

```bash
supabase db push
```

That runs `supabase/migrations/20260418000000_initial_schema.sql` on your
cloud database. It creates every table, enum, trigger and the `buy_ticket()`
RPC.

**Checkpoint 2:** In the Supabase dashboard, go to **Table Editor** in the
left sidebar. You should see the tables:
- `users_metadata`
- `wallets`
- `wallet_transactions`
- `competitions`
- `competition_instant_wins`
- `competition_entries`

---

## 3. Create the Stripe test account

1. Open <https://stripe.com> and click **Start now**.
2. Sign up with your email. You don't need to activate/verify the account for
   test mode — you can skip every "complete your business details" prompt.
3. Once logged in, **make sure the toggle in the top-right says "Test mode"**.
   It should be orange and say **Test mode**. If it says "Live mode", click it
   and switch.

### Grab the two Stripe keys

Go to <https://dashboard.stripe.com/test/apikeys>. You'll see:

| Label in Stripe dashboard       | Env variable we'll paste it into            |
| ------------------------------- | ------------------------------------------- |
| **Publishable key** (pk_test_…) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`        |
| **Secret key** *(click "Reveal test key")* (sk_test_…) | `STRIPE_SECRET_KEY` |

The webhook secret we'll create in step 5 below.

**Checkpoint 3:** Test-mode toggle is on. You've copied both test keys — they
start with `pk_test_` and `sk_test_`.

---

## 4. Paste the keys into `.env.local`

In the `vivid-wins-nextjs` folder, copy the example file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` in a text editor (VS Code, Sublime, whatever) and fill in the
five values you've just collected:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=  # leave blank for now — step 5 fills this in

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save the file. `.env.local` is already in `.gitignore` so it won't be committed.

**Checkpoint 4:** Run `cat .env.local | grep -v '^#' | grep .` — every line
except `STRIPE_WEBHOOK_SECRET=` should have a value after the `=`.

---

## 5. Install deps and start the app

Back in Terminal, inside `vivid-wins-nextjs`:

```bash
npm install
npm run dev
```

Open <http://localhost:3000> in your browser. You should see the homepage.
If the page says "Missing Supabase env vars" or similar — double-check
`.env.local` and restart the dev server (`Ctrl-C`, then `npm run dev` again).

### Forward Stripe webhooks to your local machine

Stripe sends webhooks (notifications about payments) to a URL on the internet.
Locally, we use the Stripe CLI to tunnel them to your dev server.

Install the Stripe CLI once:

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

`stripe login` opens a browser window — approve it, then come back to Terminal.

In a **second Terminal window**, keep this running while you develop:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The very first line it prints contains the webhook secret, e.g.
`Ready! Your webhook signing secret is whsec_abc123...`. **Copy it.**

Paste that `whsec_…` value into `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_…`,
save, and restart `npm run dev`.

**Checkpoint 5:**
- `npm run dev` is running in window 1 without errors
- `stripe listen` is running in window 2 and shows `Ready!`
- `.env.local` has all six values filled in

---

## 6. Smoke test — buy a test ticket

In the dev app, sign up with any fake email (Supabase has magic-link auth, so
you'll need a real inbox you can read — your normal email is fine, it'll never
send anything outside test mode).

On the test Stripe checkout, use this card:

- **Card number:** `4242 4242 4242 4242`
- **Expiry:** any future date, e.g. `12/30`
- **CVC:** any 3 digits, e.g. `123`
- **Name / ZIP:** anything

The payment should succeed, the ticket should appear in the account section,
and in the Supabase **Table Editor → competition_entries** you should see a
new row.

**Checkpoint 6:** Test ticket purchase flows end-to-end from UI → Stripe →
webhook → Supabase.

---

## Troubleshooting

| Symptom                                      | Fix                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Missing STRIPE_SECRET_KEY in .env.local`    | You forgot to restart `npm run dev` after editing `.env.local`. Stop and restart it.                 |
| `supabase db push` says "password incorrect" | Use the DB password from step 1. If lost, reset it in **Project Settings → Database → Reset DB password**. |
| Webhook signature verification fails         | `STRIPE_WEBHOOK_SECRET` in `.env.local` doesn't match the one from `stripe listen`. Re-copy it.      |
| "Competition not live or not found" error    | The competition row in Supabase has `status = 'draft'`. Change it to `'live'` in Table Editor.       |

---

## Going to production later

When you're ready to actually take real money, the changes are:

1. In Stripe: flip to **Live mode**, grab the `sk_live_…` / `pk_live_…` keys.
2. Create a real webhook endpoint in **Stripe → Developers → Webhooks** pointing
   at `https://vividwins.co.uk/api/stripe/webhook`, and copy its signing secret.
3. In Vercel (or wherever you deploy): set the same env vars, but with the
   live-mode values.
4. In Supabase: you can stay on the same project, or create a `vivid-wins-prod`
   one and push the schema to it.

We'll do this properly when you're ready — not yet.
