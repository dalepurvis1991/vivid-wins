-- =======================================================================
-- Vivid Wins — bonus_ticket instant-win tier
-- =======================================================================
-- Reveals as "+1 FREE TICKET": the triggering ticket awards a second random
-- unused ticket in the SAME competition at 0p. The bonus ticket is also
-- checked against the instant-win pool, so it can chain (credit, pack, or
-- even another bonus — capped at 4 chained bonuses per purchase to prevent
-- runaway).
--
-- Zero margin impact: bonus tickets never leave the site. They're just
-- additional spots in the same draw pool. Weight in the pool: 5% of
-- tickets, same tier size as booster packs.
-- =======================================================================

-- 1. Extend the enums. IF NOT EXISTS makes the migration idempotent.
alter type public.instant_win_type add value if not exists 'bonus_ticket';
alter type public.entry_source     add value if not exists 'bonus_ticket';

-- 2. Rewrite buy_ticket() to recurse when a bonus_ticket hits.
--    The function now returns one row per ticket generated — so a purchase
--    that triggers a bonus chain returns multiple rows. Callers see every
--    ticket awarded for this purchase in purchase-order.
create or replace function public.buy_ticket(
    p_competition_id uuid,
    p_user_id uuid,
    p_paid_via entry_source,
    p_price_pennies integer,
    p_stripe_pi text default null,
    p_chain_depth integer default 0
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
    v_max_chain constant integer := 4;
begin
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

    v_entry_id := gen_random_uuid();

    insert into public.competition_entries
        (id, competition_id, user_id, ticket_number, price_paid_pennies, paid_via,
         stripe_payment_intent_id, is_instant_winner, instant_win_id)
    values
        (v_entry_id, p_competition_id, p_user_id, v_next_ticket, p_price_pennies, p_paid_via,
         p_stripe_pi, v_instant_win_id is not null, v_instant_win_id);

    if v_instant_win_id is not null then
        update public.competition_instant_wins
           set claimed_by_user_id = p_user_id,
               claimed_at = now(),
               revealed_at = now()
         where id = v_instant_win_id;

        -- Credit wallet on site_credit only. bonus_ticket fulfilment is the
        -- recursive buy_ticket() call below; booster_pack is shipped.
        if v_instant_type = 'site_credit' then
            insert into public.wallet_transactions
                (user_id, kind, amount_pennies, related_entry_id,
                 related_competition_id, description)
            values
                (p_user_id, 'instant_win_credit', v_instant_value, v_entry_id,
                 p_competition_id,
                 'Instant-win credit from ticket #' || v_next_ticket);
        end if;
    end if;

    -- Debit wallet only for paid-with-wallet purchases.
    -- paid_via = 'bonus_ticket' is free (p_price_pennies should be 0).
    if p_paid_via = 'wallet' then
        insert into public.wallet_transactions
            (user_id, kind, amount_pennies, related_entry_id,
             related_competition_id, description)
        values
            (p_user_id, 'entry_debit', -p_price_pennies, v_entry_id,
             p_competition_id,
             'Ticket #' || v_next_ticket || ' for competition ' || p_competition_id);
    end if;

    -- Emit this ticket's row first so reveal ordering matches purchase order.
    return query select
        v_entry_id,
        v_next_ticket,
        v_instant_win_id is not null,
        v_instant_type,
        v_instant_value,
        v_pack_sku,
        v_pack_label;

    -- If this was a bonus_ticket hit, award a free extra ticket. It recurses
    -- through the full pool check so the bonus can itself win credit/pack/
    -- another bonus. Capped at v_max_chain depth.
    if v_instant_type = 'bonus_ticket' and p_chain_depth < v_max_chain then
        return query
        select * from public.buy_ticket(
            p_competition_id,
            p_user_id,
            'bonus_ticket'::entry_source,
            0,
            null,
            p_chain_depth + 1
        );
    end if;
end;
$fn$;

revoke all on function public.buy_ticket from public;
grant execute on function public.buy_ticket(uuid, uuid, entry_source, integer, text, integer)
    to authenticated, service_role;
