// Friends, kept on the Chip Flip server. A request goes from one player to
// another; once accepted they're friends. Either player can cancel, decline
// or remove. Players find each other by name or by their six-character
// friend code.
import { useSyncExternalStore } from 'react';

import { profile } from './profile';
import { supabase } from './supabase';

export interface Player {
  id: string;
  name: string;
  code: string;
}

export interface Friendship {
  id: number;
  other: Player;
  /** Accepted, or a pending request you received / sent. */
  kind: 'friend' | 'incoming' | 'sent';
  since: number;
}

interface State {
  ready: boolean;
  loading: boolean;
  failed: boolean;
  myCode: string | null;
  list: Friendship[];
}

let state: State = { ready: false, loading: false, failed: false, myCode: null, list: [] };
let forUser: string | null = null;
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};

const uid = () => profile.get().userId;

type Row = { id: number; requester: string; addressee: string; status: 'pending' | 'accepted'; created_at: string; accepted_at: string | null };
type ProfileRow = { id: string; name: string; friend_code: string };
const toPlayer = (p: ProfileRow): Player => ({ id: p.id, name: p.name, code: p.friend_code });

/** Friend codes are typed loosely: spaces, dashes and lower case are fine. */
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const friends = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,

  async refresh() {
    const me = uid();
    if (!me) return;
    if (forUser !== me) {
      forUser = me;
      set({ ready: false, list: [], myCode: null });
    }
    set({ loading: true });
    try {
      const [{ data: mine, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
        supabase.from('profiles').select('friend_code').eq('id', me).maybeSingle(),
        supabase.from('friendships').select('id, requester, addressee, status, created_at, accepted_at').order('created_at', { ascending: false }),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      const list = (rows ?? []) as Row[];
      const others = [...new Set(list.map((r) => (r.requester === me ? r.addressee : r.requester)))];
      const people = new Map<string, Player>();
      if (others.length) {
        const { data: ps, error } = await supabase.from('profiles').select('id, name, friend_code').in('id', others);
        if (error) throw error;
        (ps as ProfileRow[]).forEach((p) => people.set(p.id, toPlayer(p)));
      }
      const out: Friendship[] = list
        .map((r) => {
          const otherId = r.requester === me ? r.addressee : r.requester;
          const other = people.get(otherId);
          if (!other) return null; // they deleted their account
          const kind: Friendship['kind'] = r.status === 'accepted' ? 'friend' : r.requester === me ? 'sent' : 'incoming';
          return { id: r.id, other, kind, since: Date.parse(r.accepted_at ?? r.created_at) };
        })
        .filter((x): x is Friendship => !!x)
        .sort((a, b) => (a.kind === 'friend' && b.kind === 'friend' ? a.other.name.localeCompare(b.other.name) : b.since - a.since));
      set({ ready: true, loading: false, failed: false, list: out, myCode: (mine as { friend_code: string } | null)?.friend_code ?? null });
    } catch {
      set({ loading: false, failed: true });
    }
  },

  /** Players matching a friend code exactly, or whose name starts with the text. */
  async search(text: string): Promise<Player[] | null> {
    const me = uid();
    const q = text.trim();
    if (!me || q.length < 2) return [];
    try {
      const code = cleanCode(q);
      const byCode = code.length === 6 ? supabase.from('profiles').select('id, name, friend_code').eq('friend_code', code).limit(1) : null;
      const like = q.replace(/[%_\\]/g, (c) => `\\${c}`);
      const byName = supabase.from('profiles').select('id, name, friend_code').ilike('name', `${like}%`).neq('id', me).order('name').limit(20);
      const [a, b] = await Promise.all([byCode ?? Promise.resolve({ data: [], error: null }), byName]);
      if (a.error || b.error) return null;
      const seen = new Set<string>();
      return [...((a.data ?? []) as ProfileRow[]), ...((b.data ?? []) as ProfileRow[])]
        .filter((p) => p.id !== me && !seen.has(p.id) && seen.add(p.id))
        .map(toPlayer);
    } catch {
      return null;
    }
  },

  /** Where you stand with a player, if anywhere. */
  relation(playerId: string): Friendship | null {
    return state.list.find((f) => f.other.id === playerId) ?? null;
  },

  /** Sends a request, or accepts theirs if they already asked you. */
  async add(p: Player): Promise<boolean> {
    const me = uid();
    if (!me || p.id === me) return false;
    const existing = friends.relation(p.id);
    if (existing?.kind === 'incoming') return friends.accept(existing);
    if (existing) return true;
    const { error } = await supabase.from('friendships').insert({ requester: me, addressee: p.id });
    await friends.refresh();
    return !error;
  },

  async accept(f: Friendship): Promise<boolean> {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', f.id);
    await friends.refresh();
    return !error;
  },

  /** Decline, cancel or unfriend: the row goes either way. */
  async remove(f: Friendship): Promise<boolean> {
    set({ list: state.list.filter((x) => x.id !== f.id) });
    const { error } = await supabase.from('friendships').delete().eq('id', f.id);
    await friends.refresh();
    return !error;
  },
};

export function useFriends(): State {
  return useSyncExternalStore(friends.subscribe, friends.get, friends.get);
}
