-- =======================================================================
-- Vivid Wins — initial schema
-- Mirrors the competition structure in COMPETITION-STRUCTURE.md:
-- 17.5% site-credit instant wins, 5% booster-pack instant wins, 1 main winner.
-- All money columns stored in PENCE (integer) to avoid floating-point errors.
-- =======================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------
-- USERS METADATA
-- Supabase auth.users already holds email + auth. We hang profile data
-- off the user_id here so we can extend without touching the auth schema.
-- -----------------------------------------------------------------------
create table public.users_metadata (
    user_id uuid primary key references auth.users(id) on delete cascade,
    first_name text,
    last_name text,
    phone text,
    dob date,
    -- UK address
    addr_line1 text,
    addr_line2 text,
    town text,
    county text,
    postcode text,
    country text default 'GB',
    -- marketing prefs
    opt_email boolean default true,
    opt_sms boolean default false,
    opt_whatsapp boolean default false,
    -- attribution
    source text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.users_metadata enable row level security;

create policy "users can read own profile"
    on public.users_metadata for select
    using (auth.uid() = user_id);

create policy "users can update own profile"
    on public.users_metadata for update
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- WALLETS
-- Single wallet per user. Balance in pence. Always derivable from the
-- wallet_transactions ledger (source of truth) — the balance column is
-- a cached convenience.
-- -----------------------------------------------------------------------
create table public.wallets (
    user_id uuid primary key references auth.users(id) on delete cascade,
    balance_pennies integer not null default 0 check (balance_pennies >= 0),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.wallets enable row level security;

create policy "users can read own wallet"
    on public.wallets for select
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- WALLET TRANSACTIONS — full ledger
-- Never update/delete. Balance is sum of this table filtered by user_id.
-- -----------------------------------------------------------------------
create type wallet_txn_kind as enum (
    'topup_stripe',        -- money in via Stripe
    'entry_debit',         -- spend on a competition entry
    'instant_win_credit',  -- credit awarded from an instant-win ticket
    'refund',              -- refund (eg competition cancelled)
    'manual_adjustment'    -- admin grant or deduction
);

create table public.wallet_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind wallet_txn_kind not null,
    amount_pennies integer not null,  -- signed: positive = credit, negative = debit
    related_entry_id uuid,             -- set when kind in (entry_debit, instant_win_credit)
    related_competition_id uuid,       -- convenience lookup
    stripe_payment_intent_id text,     -- set when kind = topup_stripe
    description text,
    created_at timestamptz default now()
);

create index on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

create policy "users can read own transactions"
    on public.wallet_transactions for select
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- COMPETITIONS
-- -----------------------------------------------------------------------
create type competition_status as enum (
    'draft',        -- admin working on it
    'scheduled',    -- visible, not yet on sale
    'live',         -- on sale
    'sold_out',     -- all tickets sold, awaiting live draw
    'drawn',        -- main winner decided, closed
    'cancelled'     -- pulled before completion
);

create table public.competitions (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    description text,
    image_url text,

    ticket_price_pennies integer not null check (ticket_price_pennies >= 0),
    total_tickets integer not null check (total_tickets > 0),
    tickets_sold integer not null default 0,

    main_prize_label text not null,
    main_prize_value_pennies integer not null,

    draw_at timestamptz,
    live_on_url text,       -- Whatnot stream URL
    status competition_status not null default 'draft',

    -- audit
    created_at timestamptz default now(),
    created_by uuid references auth.users(id),
    updated_at timestamptz default now()
);

create index on public.competitions (status, draw_at);
create index on public.competitions (slug);

alter table public.competitions enable row level security;

create policy "anyone can read live/scheduled/drawn competitions"
    on public.competitions for select
    using (status in ('scheduled', 'live', 'sold_out', 'drawn'));

-- -----------------------------------------------------------------------
-- COMPETITION INSTANT WINS
-- Pre-seeded on competition creation. One row per winning ticket.
-- The 17.5%/5% ratio is applied by the seed-competitions.mjs script when
-- creating new comps (see CREDIT_RATE / PACK_RATE constants there).
-- -----------------------------------------------------------------------
create type instant_win_type as enum ('site_credit', 'booster_pack');

create table public.competition_instant_wins (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete cascade,
    ticket_number integer not null check (ticket_number >= 1),

    prize_type instant_win_type not null,
    prize_value_pennies integer not null,    -- credit amount, or retail value of pack
    pack_sku text,                            -- eg 'prismatic', 'temporal' — null for credit
    pack_label text,                          -- display name — null for credit

    claimed_by_user_id uuid references auth.users(id),
    claimed_at timestamptz,
    revealed_at timestamptz,

    unique (competition_id, ticket_number)
);

create index on public.competition_instant_wins (competition_id);
create index on public.competition_instant_wins (claimed_by_user_id);

alter table public.competition_instant_wins enable row level security;

create policy "users can see their own claimed instant wins"
    on public.competition_instant_wins for select
    using (claimed_by_user_id = auth.uid());

-- -----------------------------------------------------------------------
-- COMPETITION ENTRIES
-- One row per ticket ever sold. ticket_number is unique per competition.
-- -----------------------------------------------------------------------
create type entry_source as enum ('stripe', 'wallet', 'postal_free');

create table public.competition_entries (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.competitions(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete restrict,
    ticket_number integer not null check (ticket_number >= 1),

    price_paid_pennies integer not null,
    paid_via entry_source not null,
    stripe_payment_intent_id text,

    -- instant win flags — denormalised for fast reads
    is_instant_winner boolean not null default false,
    instant_win_id uuid references public.competition_instant_wins(id),

    created_at timestamptz default now(),

    unique (competition_id, ticket_number)
);

create index on public.competition_entries (user_id, created_at desc);
create index on public.competition_entries (competition_id);

alter table public.competition_entries enable row level security;

create policy "users can read own entries"
    on public.competition_entries for select
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- TRIGGER: keep competitions.tickets_sold in sync
-- -----------------------------------------------------------------------
create or replace function public.bump_tickets_sold()
returns trigger
language plpgsql
as $fn$
begin
    update public.competitions
    set tickets_sold = tickets_sold + 1,
        updated_at = now()
    where id = new.competition_id;
    return new;
end;
$fn$;

create trigger trg_bump_tickets_sold
    after insert on public.competition_entries
    for each row
    execute function public.bump_tickets_sold();

-- -----------------------------------------------------------------------
-- TRIGGER: wallet_transactions auto-maintains wallets.balance_pennies
-- -----------------------------------------------------------------------
create or replace function public.apply_wallet_txn()
returns trigger
language plpgsql
as $fn$
begin
    insert into public.wallets (user_id, balance_pennies)
    values (new.user_id, new.amount_pennies)
    on conflict (user_id) do update
        set balance_pennies = public.wallets.balance_pennies + new.amount_pennies,
            updated_at = now();
    return new;
end;
$fn$;

create trigger trg_apply_wallet_txn
    after insert on public.wallet_transactions
    for each row
    execute function public.apply_wallet_txn();

-- -----------------------------------------------------------------------
-- RPC: buy_ticket
-- Atomic: picks next unused ticket, creates entry, claims any instant win,
-- credits wallet if the ticket was an instant-credit winner.
-- Call from a server route after payment confirms.
-- -----------------------------------------------------------------------
create or replace function public.buy_ticket(
    p_competition_id uuid,
    p_user_id uuid,
    p_paid_via entry_source,
    p_price_pennies integer,
    p_stripe_pi text default null
)
returns table (
    entry_id uuid,
    ticket_number integer,
    is_instant_winner boolean,
    instant_prize_type instant_win_type,
    instant_prize_value_pennies integer,
    instant_pack_sku text,
    instant_pack_label text
)
language plpgsql
security definer
as $fn$
declare
    v_total_tickets integer;
    v_next_ticket integer;
    v_entry_id uuid;
    v_instant_win_id uuid;
    v_instant_type instant_win_type;
    v_instant_value integer;
    v_pack_sku text;
    v_pack_label text;
begin
    -- Lock the competition row so two concurrent buyers can't grab the same ticket
    perform 1 from public.competitions
     where id = p_competition_id and status = 'live'
     for update;

    v_total_tickets := (
        select c.total_tickets from public.competitions c
         where c.id = p_competition_id and c.status = 'live'
    );

    if v_total_tickets is null then
        raise exception 'Competition not live or not found';
    end if;

    -- Find a random unused ticket number
    v_next_ticket := (
        select n.num
          from generate_series(1, v_total_tickets) n(num)
         where not exists (
                 select 1 from public.competition_entries e
                  where e.competition_id = p_competition_id
                    and e.ticket_number = n.num
               )
         order by random()
         limit 1
    );

    if v_next_ticket is null then
        raise exception 'No tickets available';
    end if;

    -- Is this ticket an instant winner? First get the row id, then fan out.
    v_instant_win_id := (
        select iw.id from public.competition_instant_wins iw
         where iw.competition_id = p_competition_id
           and iw.ticket_number = v_next_ticket
           and iw.claimed_by_user_id is null
         limit 1
    );

    if v_instant_win_id is not null then
        v_instant_type  := (select iw.prize_type          from public.competition_instant_wins iw where iw.id = v_instant_win_id);
        v_instant_value := (select iw.prize_value_pennies from public.competition_instant_wins iw where iw.id = v_instant_win_id);
        v_pack_sku      := (select iw.pack_sku            from public.competition_instant_wins iw where iw.id = v_instant_win_id);
        v_pack_label    := (select iw.pack_label          from public.competition_instant_wins iw where iw.id = v_instant_win_id);
    end if;

    -- Create the entry
    v_entry_id := gen_random_uuid();

    insert into public.competition_entries
        (id, competition_id, user_id, ticket_number, price_paid_pennies, paid_via,
         stripe_payment_intent_id, is_instant_winner, instant_win_id)
    values
        (v_entry_id, p_competition_id, p_user_id, v_next_ticket, p_price_pennies, p_paid_via,
         p_stripe_pi, v_instant_win_id is not null, v_instant_win_id);

    -- If instant winner, claim the prize row
    if v_instant_win_id is not null then
        update public.competition_instant_wins
           set claimed_by_user_id = p_user_id,
               claimed_at = now(),
               revealed_at = now()
         where id = v_instant_win_id;

        -- Credit wallet if it's a site-credit win
        if v_instant_type = 'site_credit' then
            insert into public.wallet_transactions
                (user_id, kind, amount_pennies, related_entry_id,
                 related_competition_id, description)
            values
                (p_user_id, 'instant_win_credit', v_instant_value, v_entry_id,
                 p_competition_id,
                 'Instant-win credit from ticket #' || v_next_ticket);
        end if;
        -- Booster pack wins are fulfilled via shipping — no wallet entry.
    end if;

    -- Debit wallet if paid_via = wallet
    if p_paid_via = 'wallet' then
        insert into public.wallet_transactions
            (user_id, kind, amount_pennies, related_entry_id,
             related_competition_id, description)
        values
            (p_user_id, 'entry_debit', -p_price_pennies, v_entry_id,
             p_competition_id,
             'Ticket #' || v_next_ticket || ' for competition ' || p_competition_id);
    end if;

    return query select
        v_entry_id,
        v_next_ticket,
        v_instant_win_id is not null,
        v_instant_type,
        v_instant_value,
        v_pack_sku,
        v_pack_label;
end;
$fn$;

-- Only authenticated users can call this RPC
revoke all on function public.buy_ticket from public;
grant execute on function public.buy_ticket to authenticated, service_role;
