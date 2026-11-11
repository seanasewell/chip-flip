// The contract between the existing app shell (navigation, accounts,
// progression, sheets, sound engine) and the Lineup modules. The shell
// fills this in once at startup with its own components and stores, so
// Lineup screens reuse them instead of re-implementing them.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentType, ReactNode } from "react";

export interface AvatarPlayer {
  id?: string;
  glyph: string;
  hue: number;
  photo?: string | null;
  isYou?: boolean;
}

export interface Account {
  id: string;
  name: string;
  photo: string | null;
  provider?: string;
}

export interface Friend {
  id: string;
  name: string;
  glyph: string;
  hue: number;
}

export interface ShellDeps {
  Button: ComponentType<{ variant?: "primary" | "gold" | "ghost"; className?: string; children?: ReactNode } & Record<string, any>>;
  Sheet: ComponentType<{ open: boolean; onClose: () => void; title?: string; tall?: boolean; children?: ReactNode }>;
  Avatar: ComponentType<{ player: AvatarPlayer; size?: number; dim?: boolean; ring?: boolean }>;
  LevelBadge: ComponentType<{ level: number; className?: string }>;
  Confetti: ComponentType<{ big?: boolean }>;
  XpChip: ComponentType<Record<string, never>>;
  Toggle: ComponentType<{ on: boolean; onChange: (v: boolean) => void; label: string }>;
  useAccount: () => { account: Account | null; onboarding: boolean };
  currentAccount: () => Account | null;
  useProgress: () => any;
  useSocial: () => any;
  friends: () => Friend[];
  nav: { push: (r: any) => void; pop: () => void; reset: (r?: any[]) => void };
  toast: { show: (t: string) => void; success: (t: string) => void };
  /** Shows any pending level-up / achievement celebration, then `then`. */
  celebrate: (then: () => void) => void;
  /** Celebration, then an interstitial ad if one is due, then `then`. */
  afterGame: (then: () => void) => void;
  /** Records a finished match into progress, account and ads counters. */
  recordMatch: (summary: import("./progress").MatchSummary) => void;
  tone: (freq: number, delay: number, dur: number, opts?: { type?: OscillatorType; gain?: number; glide?: number }) => void;
  noise: (delay: number, gain?: number) => void;
  fanfare: () => void;
  vibrate: (ms?: number) => void;
  sound: { on: () => boolean; set: (v: boolean) => void; subscribe: (f: () => void) => () => void };
  music: { on: () => boolean; set: (v: boolean) => void; play: (key: string) => void; stop: () => void; sting: (kind: "win" | "loss") => void };
  botNames: string[];
  /** Opens a (sample) player's profile page. */
  openPlayer: (p: { id: string; name: string; glyph: string; hue: number }) => void;
  blockedIds: () => Set<string>;
  share: (text: string) => void;
}

let deps: ShellDeps | null = null;
export function setDeps(d: ShellDeps) {
  deps = d;
}
export function shell(): ShellDeps {
  if (!deps) throw new Error("Lineup shell not initialised");
  return deps;
}

export const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage full or blocked: progress for this action is not saved */
    }
  },
  remove(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
  json<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
};
