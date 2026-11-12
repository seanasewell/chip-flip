// The player: name, ranked record and connection to the Chip Flip server.
// Everyone starts as a guest (an anonymous Supabase account), so ranked
// results, streaks and the weekly leaderboard are kept on the server. If the
// server can't be reached the app keeps working offline and sends any
// unsent ranked results the next time it connects.
import { useSyncExternalStore } from 'react';

import { kv } from './kv';
import { progress } from './progress';
import { linkProvider, signInWithProvider, type Provider, type SocialResult } from './social';
import { supabase, supabaseConfigured } from './supabase';

export interface Profile {
  id: string;
  name: string;
  hue: number;
  createdAt: number;
}

export interface PlayerRecord {
  played: number;
  wins: number;
  losses: number;
  sequences: number;
  streak: number;
  bestStreak: number;
}

export interface RankedResult {
  matchId: string;
  mode: string;
  won: boolean;
  forfeit: boolean;
  sequences: number;
  /** Opponent rating used for the match (from rankedOpponent()). */
  opp: number;
}

export interface LeaderRow {
  rank: number;
  userId: string;
  name: string;
  score: number;
  me: boolean;
}

export type Online = 'off' | 'connecting' | 'on';

const PROFILE_KEY = 'cf.profile';
const RECORD_KEY = 'cf.record';
const PENDING_KEY = 'cf.pending';
const blankRecord = (): PlayerRecord => ({ played: 0, wins: 0, losses: 0, sequences: 0, streak: 0, bestStreak: 0 });

interface State {
  profile: Profile | null;
  record: PlayerRecord;
  online: Online;
  userId: string | null;
  /** Apple or Google when the player has saved their progress; null for guests. */
  provider: Provider | null;
  email: string | null;
  /** Signed in with Apple or Google but no name chosen yet. */
  needsName: string | null;
}

const UID_KEY = 'cf.uid';
let state: State = { profile: null, record: blankRecord(), online: 'off', userId: null, provider: null, email: null, needsName: null };
let opponent: { opp: number; skill: number } | null = null;
let connecting: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  emit();
};

function saveRecord(r: PlayerRecord) {
  kv.set(RECORD_KEY, JSON.stringify(r));
  set({ record: r });
}

type StatsRow = { played: number; wins: number; losses: number; sequences: number; streak: number; best_streak: number };
const fromRow = (r: StatsRow): PlayerRecord => ({ played: r.played, wins: r.wins, losses: r.losses, sequences: r.sequences, streak: r.streak, bestStreak: r.best_streak });

/** Applies a result to a record (offline, or before the server answers). */
function applyLocal(r: PlayerRecord, won: boolean, sequences: number): PlayerRecord {
  const out = { ...r, played: r.played + 1, sequences: r.sequences + sequences };
  if (won) {
    out.wins++;
    out.streak++;
    out.bestStreak = Math.max(out.bestStreak, out.streak);
  } else {
    out.losses++;
    out.streak = 0;
  }
  return out;
}

async function sendPending() {
  const pending = kv.json<RankedResult[]>(PENDING_KEY, []);
  if (!pending.length) return;
  const left: RankedResult[] = [];
  let last: StatsRow | null = null;
  for (const p of pending) {
    const { data, error } = await supabase.rpc('record_ranked_match', {
      p_match_id: p.matchId, p_mode: p.mode, p_won: p.won, p_forfeit: p.forfeit, p_sequences: p.sequences, p_opp: p.opp,
    });
    if (error) left.push(p);
    else if (data) last = data as StatsRow;
  }
  if (left.length) kv.set(PENDING_KEY, JSON.stringify(left));
  else kv.remove(PENDING_KEY);
  if (last) saveRecord(fromRow(last));
}

/** Forgets the signed-in player on this phone (their XP and achievements
 *  stay saved under their own key, for when they sign back in). */
function clearLocal() {
  [PROFILE_KEY, RECORD_KEY, PENDING_KEY, UID_KEY, 'cf.match', 'cf.rating'].forEach((k) => kv.remove(k));
  opponent = null;
  set({ profile: null, record: blankRecord(), needsName: null });
}

/** After linking: pick up the provider and email. */
async function refreshUser() {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return;
  const providers: string[] = (u.app_metadata?.providers as string[] | undefined) ?? [];
  const provider: Provider | null = providers.includes('apple') ? 'apple' : providers.includes('google') ? 'google' : null;
  set({ provider, email: provider ? u.email ?? null : null });
}

async function fetchOpponent() {
  const { data, error } = await supabase.rpc('ranked_opponent');
  if (!error && data) opponent = data as { opp: number; skill: number };
}

async function doConnect() {
  if (!supabaseConfigured) return;
  set({ online: 'connecting' });
  try {
    let { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) throw error ?? new Error('No session');
      s = { session: data.session };
    }
    const user = s.session!.user;
    const uid = user.id;
    const providers: string[] = (user.app_metadata?.providers as string[] | undefined) ?? [];
    const provider: Provider | null = providers.includes('apple') ? 'apple' : providers.includes('google') ? 'google' : null;
    kv.set(UID_KEY, uid);
    progress.load(uid);
    set({ userId: uid, provider, email: provider ? user.email ?? null : null });
    // Profile: the server copy wins; a name chosen offline is sent up.
    const { data: row } = await supabase.from('profiles').select('name').eq('id', uid).maybeSingle();
    const local = state.profile;
    if (row?.name && (!local || local.name !== row.name)) {
      const p: Profile = { id: uid, name: row.name, hue: 230, createdAt: local?.createdAt ?? Date.now() };
      kv.set(PROFILE_KEY, JSON.stringify(p));
      set({ profile: p });
    } else if (!row && local) {
      await supabase.from('profiles').upsert({ id: uid, name: local.name });
    } else if (!row && !local && provider) {
      // New Apple/Google player: ask for a name, suggesting the one on the account.
      const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
      set({ needsName: (meta?.full_name || meta?.name || '').split(' ')[0].slice(0, 14) });
    }
    await sendPending();
    const { data: stats } = await supabase.from('player_stats').select('played, wins, losses, sequences, streak, best_streak').eq('user_id', uid).maybeSingle();
    if (stats) saveRecord(fromRow(stats as StatsRow));
    await fetchOpponent();
    set({ online: 'on' });
  } catch {
    set({ online: 'off' });
  }
}

export const profile = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  /** Reads the saved profile (after storage has loaded), then connects. */
  load() {
    progress.load(kv.get(UID_KEY) ?? 'local');
    set({ profile: kv.json<Profile | null>(PROFILE_KEY, null), record: { ...blankRecord(), ...kv.json<Partial<PlayerRecord>>(RECORD_KEY, {}) } });
    void profile.connect();
  },
  /** Signs in (as a guest the first time) and syncs. Safe to call often. */
  connect() {
    if (state.online === 'on') return Promise.resolve();
    connecting ??= doConnect().finally(() => (connecting = null));
    return connecting;
  },
  create(name: string) {
    const p: Profile = { id: state.userId ?? Math.random().toString(36).slice(2, 10), name: name.trim(), hue: 230, createdAt: Date.now() };
    kv.set(PROFILE_KEY, JSON.stringify(p));
    set({ profile: p, needsName: null });
    if (state.userId) void supabase.from('profiles').upsert({ id: state.userId, name: p.name });
    else void profile.connect();
  },
  rename(name: string) {
    if (!state.profile) return;
    const p = { ...state.profile, name: name.trim() };
    kv.set(PROFILE_KEY, JSON.stringify(p));
    set({ profile: p });
    if (state.userId) void supabase.from('profiles').upsert({ id: state.userId, name: p.name });
  },
  /** Opponent strength for the next ranked match, from the server when
   *  connected. Null means use the offline rating. */
  takeOpponent(): { opp: number; skill: number } | null {
    const o = opponent;
    opponent = null;
    if (state.online === 'on') void fetchOpponent();
    return o;
  },
  /** A finished ranked match. Casual matches are never recorded. */
  recordRanked(r: RankedResult) {
    saveRecord(applyLocal(state.record, r.won && !r.forfeit, r.sequences));
    const pending = kv.json<RankedResult[]>(PENDING_KEY, []);
    if (!pending.some((p) => p.matchId === r.matchId)) kv.set(PENDING_KEY, JSON.stringify([...pending, r]));
    if (state.online === 'on') void sendPending();
    else void profile.connect();
  },
  /** Save a guest's progress to Apple or Google: same player, same progress. */
  async link(p: Provider): Promise<SocialResult> {
    await profile.connect();
    if (state.online !== 'on') return { kind: 'error', message: "Can't reach the server. Check your connection." };
    const r = await linkProvider(p);
    if (r.kind === 'ok') await refreshUser();
    return r;
  },
  /** Sign in to a saved player with Apple or Google, replacing the guest on
   *  this phone. Used from the welcome screen and after a link conflict. */
  async signIn(p: Provider): Promise<SocialResult> {
    const r = await signInWithProvider(p);
    if (r.kind !== 'ok') return r;
    clearLocal();
    set({ online: 'off' });
    await profile.connect();
    return r;
  },
  /** Sign out of a saved player. The player stays on the server; this
   *  phone goes back to the welcome screen. Guests can't sign out (they'd
   *  lose everything), so they're offered Apple or Google instead. */
  async signOut() {
    if (!state.provider) return;
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearLocal();
    set({ online: 'off', userId: null, provider: null, email: null });
  },
  /** Deletes the server account and everything on this device. */
  async deleteAccount(): Promise<boolean> {
    if (state.userId) {
      const { error } = await supabase.rpc('delete_account');
      if (error) return false;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    progress.reset();
    clearLocal();
    set({ online: 'off', userId: null, provider: null, email: null });
    return true;
  },
  /** Ranks tab: most ranked wins over a period, or longest current win streak. */
  async leaderboard(metric: 'wins' | 'streak', period: 'week' | 'month' | 'all'): Promise<LeaderRow[] | null> {
    await profile.connect();
    if (state.online !== 'on') return null;
    const { data, error } = await supabase.rpc('leaderboard', { p_metric: metric, p_period: period, p_limit: 50 });
    if (error || !data) return null;
    return (data as { rank: number; user_id: string; name: string; score: number; is_me: boolean }[]).map((x) => ({ rank: Number(x.rank), userId: x.user_id, name: x.name, score: Number(x.score), me: x.is_me }));
  },
};

export function useProfile(): State {
  return useSyncExternalStore(profile.subscribe, profile.get, profile.get);
}
