-- Ranks tab: most ranked wins this week, this month or all time, and the
-- longest current win streaks. Each list includes the caller's own rank.

create or replace function public.leaderboard(p_metric text default 'wins', p_period text default 'week', p_limit integer default 50)
returns table (rank bigint, user_id uuid, name text, score bigint, is_me boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  since := case p_period
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else '-infinity'::timestamptz end;
  if p_metric = 'streak' then
    return query
      with ranked as (
        select rank() over (order by s.streak desc) as r, s.user_id as uid, p.name as n, s.streak::bigint as sc
        from public.player_stats s join public.profiles p on p.id = s.user_id
        where s.streak > 0
      )
      select r, uid, n, sc, uid = auth.uid() from ranked
      where r <= greatest(1, least(p_limit, 100)) or uid = auth.uid()
      order by r, n;
  else
    return query
      with totals as (
        select m.user_id as uid, count(*)::bigint as sc
        from public.ranked_matches m
        where m.won and m.played_at >= since
        group by m.user_id
      ), ranked as (
        select rank() over (order by t.sc desc) as r, t.uid, p.name as n, t.sc
        from totals t join public.profiles p on p.id = t.uid
      )
      select r, uid, n, sc, uid = auth.uid() from ranked
      where r <= greatest(1, least(p_limit, 100)) or uid = auth.uid()
      order by r, n;
  end if;
end;
$$;

revoke all on function public.leaderboard(text, text, integer) from public, anon;
grant execute on function public.leaderboard(text, text, integer) to authenticated;
