// The player on this device: a name and a record of ranked matches. Kept
// locally for now; accounts and online play come with the backend.
import { useSyncExternalStore } from 'react';

import { kv } from './kv';

export interface Profile {
  id: string;
  name: string;
  hue: number;
  createdAt: number;
}

export interface Record {
  played: number;
  wins: number;
  losses: number;
  sequences: number;
  streak: number;
  bestStreak: number;
}

const PROFILE_KEY = 'cf.profile';
const RECORD_KEY = 'cf.record';
const blankRecord = (): Record => ({ played: 0, wins: 0, losses: 0, sequences: 0, streak: 0, bestStreak: 0 });

interface State {
  profile: Profile | null;
  record: Record;
}

let state: State = { profile: null, record: blankRecord() };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  emit();
};

export const profile = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  /** Reads the saved profile (after storage has loaded). */
  load() {
    set({ profile: kv.json<Profile | null>(PROFILE_KEY, null), record: { ...blankRecord(), ...kv.json<Partial<Record>>(RECORD_KEY, {}) } });
  },
  create(name: string) {
    const p: Profile = { id: Math.random().toString(36).slice(2, 10), name: name.trim(), hue: 230, createdAt: Date.now() };
    kv.set(PROFILE_KEY, JSON.stringify(p));
    set({ profile: p });
  },
  rename(name: string) {
    if (!state.profile) return;
    const p = { ...state.profile, name: name.trim() };
    kv.set(PROFILE_KEY, JSON.stringify(p));
    set({ profile: p });
  },
  /** A finished ranked match. Casual matches are never recorded. */
  record(won: boolean, sequences: number) {
    const r = { ...state.record };
    r.played++;
    if (won) {
      r.wins++;
      r.streak++;
      r.bestStreak = Math.max(r.bestStreak, r.streak);
    } else {
      r.losses++;
      r.streak = 0;
    }
    r.sequences += sequences;
    kv.set(RECORD_KEY, JSON.stringify(r));
    set({ record: r });
  },
};

export function useProfile(): State {
  return useSyncExternalStore(profile.subscribe, profile.get, profile.get);
}
