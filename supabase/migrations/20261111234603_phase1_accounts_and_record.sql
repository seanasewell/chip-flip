-- Chip Flip, phase 1: player profiles, ranked match records, the hidden
-- ranked rating, a weekly leaderboard and account deletion.
-- Matches still run on the phone; results are reported here and checked.

-- ── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Signed-in players can read profiles" on public.profiles
  for select to authenticated using (true);
create policy "Players can create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Players can update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Player record (ranked only) ─────────────────────────────────────────────
-- Written only by record_ranked_match(); players can read their own.
create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  sequences integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.player_stats enable row level security;
create policy "Players can read their own record" on public.player_stats
  for select to authenticated using ((select auth.uid()) = user_id);

-- ── Ranked matches ──────────────────────────────────────────────────────────
create table public.ranked_matches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id text not null check (char_length(match_id) between 4 and 40),
  mode text not null check (mode in ('h2h', 'ffa3', 'teams', 'teams3v3', 'teams3')),
  won boolean not null,
  forfeit boolean not null default false,
  sequences smallint not null check (sequences between 0 and 4),
  played_at timestamptz not null default now(),
  unique (user_id, match_id)
);
create index ranked_matches_played_won_idx on public.ranked_matches (played_at) where won;
alter table public.ranked_matches enable row level security;
create policy "Players can read their own matches" on public.ranked_matches
  for select to authenticated using ((select auth.uid()) = user_id);

-- ── Hidden rating ───────────────────────────────────────────────────────────
-- Kept out of the public schema: the app only ever asks for the strength of
-- its next opponent, never the number itself.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.ratings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rating real not null default 1000,
  updated_at timestamptz not null default now()
);

/** Strength (0 to 1) for the computer players in a new ranked match. */
create or replace function public.ranked_opponent()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me real;
  opp real;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select rating into me from private.ratings where user_id = auth.uid();
  me := coalesce(me, 1000);
  opp := me + (random() - 0.5) * 140;
  return jsonb_build_object('opp', round(opp), 'skill', greatest(0, least(1, (opp - 750) / 900)));
end;
$$;

/** Records a finished ranked match once (by match id) and updates the
 *  player's record and hidden rating. Returns the new record. */
create or replace function public.record_ranked_match(p_match_id text, p_mode text, p_won boolean, p_forfeit boolean, p_sequences integer, p_opp real)
returns public.player_stats language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  me real;
  opp real;
  expected real;
  out_row public.player_stats;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  insert into public.ranked_matches (user_id, match_id, mode, won, forfeit, sequences)
  values (uid, p_match_id, p_mode, p_won and not p_forfeit, p_forfeit, greatest(0, least(4, p_sequences)))
  on conflict (user_id, match_id) do nothing;
  if not found then
    select * into out_row from public.player_stats where user_id = uid;
    return out_row;
  end if;

  insert into public.player_stats (user_id) values (uid) on conflict (user_id) do nothing;
  update public.player_stats s set
    played = s.played + 1,
    wins = s.wins + (case when p_won and not p_forfeit then 1 else 0 end),
    losses = s.losses + (case when p_won and not p_forfeit then 0 else 1 end),
    sequences = s.sequences + greatest(0, least(4, p_sequences)),
    streak = case when p_won and not p_forfeit then s.streak + 1 else 0 end,
    best_streak = greatest(s.best_streak, case when p_won and not p_forfeit then s.streak + 1 else 0 end),
    updated_at = now()
  where s.user_id = uid
  returning * into out_row;

  -- Elo-style update. The opponent rating comes from ranked_opponent() and
  -- is clamped near the player's own so a doctored value can't jump it.
  insert into private.ratings (user_id) values (uid) on conflict (user_id) do nothing;
  select rating into me from private.ratings where user_id = uid;
  opp := greatest(me - 100, least(me + 100, coalesce(p_opp, me)));
  expected := 1 / (1 + power(10, (opp - me) / 400));
  update private.ratings set
    rating = greatest(600, me + 32 * ((case when p_won and not p_forfeit then 1 else 0 end) - expected)),
    updated_at = now()
  where user_id = uid;
  return out_row;
end;
$$;

/** This week's most ranked wins (Monday to Sunday, UTC). */
create or replace function public.weekly_leaderboard(p_limit integer default 50)
returns table (rank bigint, user_id uuid, name text, wins bigint)
language sql stable security definer set search_path = '' as $$
  select rank() over (order by count(*) desc) as rank, m.user_id, p.name, count(*) as wins
  from public.ranked_matches m
  join public.profiles p on p.id = m.user_id
  where m.won and m.played_at >= date_trunc('week', now())
  group by m.user_id, p.name
  order by wins desc, p.name
  limit greatest(1, least(p_limit, 100));
$$;

-- ── Account deletion ────────────────────────────────────────────────────────
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.ranked_opponent() from public, anon;
revoke all on function public.record_ranked_match(text, text, boolean, boolean, integer, real) from public, anon;
revoke all on function public.weekly_leaderboard(integer) from public, anon;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.ranked_opponent() to authenticated;
grant execute on function public.record_ranked_match(text, text, boolean, boolean, integer, real) to authenticated;
grant execute on function public.weekly_leaderboard(integer) to authenticated;
grant execute on function public.delete_account() to authenticated;
