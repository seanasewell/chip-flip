-- Chip Flip: friends. Players find each other by name or friend code,
-- send a request, and the other player accepts it. Either side can cancel,
-- decline or remove at any time.

-- ── Friend codes ────────────────────────────────────────────────────────────
-- Six characters, no look-alikes (0/O, 1/I/L), so it's easy to read aloud.
create or replace function public.new_friend_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

alter table public.profiles add column friend_code text;
update public.profiles set friend_code = public.new_friend_code() where friend_code is null;
alter table public.profiles
  alter column friend_code set not null,
  add constraint profiles_friend_code_key unique (friend_code);

-- The code is assigned by the server; players can't pick their own.
create or replace function public.keep_friend_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.friend_code := public.new_friend_code();
  else
    new.friend_code := old.friend_code;
  end if;
  return new;
end;
$$;
create trigger profiles_keep_friend_code before insert or update on public.profiles
  for each row execute function public.keep_friend_code();

-- ── Friendships ─────────────────────────────────────────────────────────────
create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester <> addressee)
);
-- One row per pair, whichever direction it was sent in.
create unique index friendships_pair_key on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_requester_idx on public.friendships (requester);
create index friendships_addressee_idx on public.friendships (addressee);
alter table public.friendships enable row level security;

create policy "Players see their own friendships" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
create policy "Players send requests as themselves" on public.friendships
  for insert to authenticated
  with check ((select auth.uid()) = requester and status = 'pending' and accepted_at is null);
create policy "Players accept requests sent to them" on public.friendships
  for update to authenticated
  using ((select auth.uid()) = addressee and status = 'pending')
  with check ((select auth.uid()) = addressee and status = 'accepted');
create policy "Either player can end a friendship" on public.friendships
  for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- Accepting stamps the time; nothing else about the row can change.
create or replace function public.friendship_accept_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.requester <> old.requester or new.addressee <> old.addressee or new.created_at <> old.created_at then
    raise exception 'Only the status of a friend request can change';
  end if;
  new.accepted_at := now();
  return new;
end;
$$;
create trigger friendships_accept_guard before update on public.friendships
  for each row execute function public.friendship_accept_guard();

-- Keep request spam in check: at most 50 outgoing pending requests.
create or replace function public.friendship_request_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.friendships where requester = new.requester and status = 'pending') >= 50 then
    raise exception 'Too many pending friend requests';
  end if;
  return new;
end;
$$;
create trigger friendships_request_limit before insert on public.friendships
  for each row execute function public.friendship_request_limit();

revoke execute on function public.new_friend_code() from public, anon;
revoke execute on function public.keep_friend_code() from public, anon, authenticated;
revoke execute on function public.friendship_accept_guard() from public, anon, authenticated;
revoke execute on function public.friendship_request_limit() from public, anon, authenticated;
