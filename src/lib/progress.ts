// XP, levels, daily and weekly challenges, achievements and the daily play
// streak. Same rules and numbers as the web prototype. Only ranked matches
// count; casual matches are just for fun. Kept on this device for now.
import { useSyncExternalStore } from 'react';

import type { GameModeId } from '@/core/types';
import { kv } from './kv';

export interface MatchSummary {
  matchId: string;
  mode: GameModeId;
  won: boolean;
  forfeit: boolean;
  sequences: number;
  diagonals: number;
  wildJacks: number;
  removals: number;
  shutout: boolean;
  comeback: boolean;
  durationMs: number;
  sides: number;
}

export type ModeRecord = [played: number, wins: number];

export interface Stats {
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  forfeits: number;
  sequences: number;
  diagonals: number;
  wildJacks: number;
  removals: number;
  shutouts: number;
  comebacks: number;
  friendMatches: number;
  winStreak: number;
  bestWinStreak: number;
  totalMatchMs: number;
  byDay: Record<string, ModeRecord>;
  byMode: Partial<Record<GameModeId, ModeRecord>>;
}

export const blankStats = (): Stats => ({
  matchesPlayed: 0, matchWins: 0, matchLosses: 0, forfeits: 0, sequences: 0, diagonals: 0, wildJacks: 0, removals: 0,
  shutouts: 0, comebacks: 0, friendMatches: 0, winStreak: 0, bestWinStreak: 0, totalMatchMs: 0, byDay: {}, byMode: {},
});

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};
export const weekStart = (now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
export const nextDay = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
export const nextWeek = (now = new Date()) => {
  const d = weekStart(now);
  d.setDate(d.getDate() + 7);
  return d.getTime();
};
export const winPct = (s: Stats) => (s.matchesPlayed ? Math.round((s.matchWins / s.matchesPlayed) * 100) : 0);

// ---------------------------------------------------------------- levels

const levelCost = (lvl: number) => 500 + (lvl - 1) * 100;
export const LEVEL_TITLES: [number, string][] = [
  [100, 'Chip Flip legend'], [75, 'Grandmaster'], [50, 'Master tactician'], [40, 'Champion'], [30, 'Strategist'],
  [20, 'Tactician'], [15, 'Blocker'], [10, 'Contender'], [5, 'Challenger'], [1, 'Rookie'],
];
export const levelTitle = (lvl: number) => LEVEL_TITLES.find(([n]) => lvl >= n)![1];
export function levelOf(xp: number) {
  let level = 1;
  let rest = xp;
  while (level < 100 && rest >= levelCost(level)) {
    rest -= levelCost(level);
    level++;
  }
  const need = level >= 100 ? 0 : levelCost(level);
  return { level, title: levelTitle(level), into: level >= 100 ? 0 : rest, need, toNext: Math.max(0, need - rest), total: xp };
}

// ---------------------------------------------------------------- achievements

export interface AchievementDef {
  id: string;
  series: string;
  emoji: string;
  name: string;
  desc: string;
  goal: number;
  xp: number;
  value: (p: Progress) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-sequence', series: 'sequences', emoji: '🎯', name: 'First sequence', desc: 'Complete your first sequence', goal: 1, xp: 100, value: (p) => p.stats.sequences },
  { id: 'first-victory', series: 'matches', emoji: '🏆', name: 'First victory', desc: 'Win your first match', goal: 1, xp: 150, value: (p) => p.stats.matchWins },
  { id: 'getting-started', series: 'matches', emoji: '🎮', name: 'Getting started', desc: 'Play 5 matches', goal: 5, xp: 150, value: (p) => p.stats.matchesPlayed },
  { id: 'on-a-roll', series: 'streaks', emoji: '🔥', name: 'On a roll', desc: 'Win 3 matches in a row', goal: 3, xp: 200, value: (p) => p.stats.bestWinStreak },
  { id: 'unstoppable', series: 'streaks', emoji: '⚡', name: 'Unstoppable', desc: 'Win 5 matches in a row', goal: 5, xp: 300, value: (p) => p.stats.bestWinStreak },
  { id: 'shutout', series: 'matches', emoji: '💎', name: 'Shutout', desc: 'Win before anyone else completes a sequence', goal: 1, xp: 250, value: (p) => p.stats.shutouts },
  { id: 'strategic-thinker', series: 'matches', emoji: '🧠', name: 'Strategic thinker', desc: 'Win 25 matches', goal: 25, xp: 300, value: (p) => p.stats.matchWins },
  { id: 'lineup-legend', series: 'matches', emoji: '👑', name: 'Chip Flip legend', desc: 'Win 100 matches', goal: 100, xp: 500, value: (p) => p.stats.matchWins },
  { id: 'social-player', series: 'social', emoji: '🤝', name: 'Social player', desc: 'Play a match against a friend', goal: 1, xp: 150, value: (p) => p.stats.friendMatches },
  { id: 'daily-player', series: 'streaks', emoji: '📅', name: 'Daily player', desc: 'Play matches on 3 different days', goal: 3, xp: 150, value: (p) => Object.keys(p.stats.byDay).length },
  { id: 'diagonal-master', series: 'sequences', emoji: '↗️', name: 'Diagonal master', desc: 'Complete 10 diagonal sequences', goal: 10, xp: 250, value: (p) => p.stats.diagonals },
  { id: 'comeback', series: 'matches', emoji: '🔄', name: 'Comeback', desc: 'Win after an opponent completed the first sequence', goal: 1, xp: 300, value: (p) => p.stats.comebacks },
  { id: 'wild-card', series: 'sequences', emoji: '🃏', name: 'Wild card', desc: 'Play 25 two-eyed jacks', goal: 25, xp: 200, value: (p) => p.stats.wildJacks },
  { id: 'cutthroat', series: 'sequences', emoji: '✂️', name: 'Cutthroat', desc: 'Remove 25 chips with one-eyed jacks', goal: 25, xp: 200, value: (p) => p.stats.removals },
  { id: 'streak-7', series: 'streaks', emoji: '🗓️', name: 'Week of play', desc: 'Play at least one match a day for 7 days in a row', goal: 7, xp: 300, value: (p) => p.streak.best },
  { id: 'streak-30', series: 'streaks', emoji: '🌟', name: 'Month of play', desc: 'Play at least one match a day for 30 days in a row', goal: 30, xp: 500, value: (p) => p.streak.best },
];

export const ACHIEVEMENT_SERIES = [
  { key: 'matches', label: 'Matches' },
  { key: 'sequences', label: 'Sequences' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'social', label: 'Social' },
];

// ---------------------------------------------------------------- challenges

export interface ChallengeDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  xp: number;
  goal: number;
  metric: string;
  level?: number;
}

export const DAILY: ChallengeDef[] = [
  { id: 'warm-up', emoji: '🎮', name: 'Warm up', desc: 'Play 2 matches', xp: 50, goal: 2, metric: 'matches', level: 0 },
  { id: 'sequence', emoji: '🏅', name: 'Five in a row', desc: 'Complete a sequence', xp: 50, goal: 1, metric: 'sequences', level: 0 },
  { id: 'wild', emoji: '🃏', name: 'Wild card', desc: 'Play a two-eyed jack', xp: 50, goal: 1, metric: 'wildJacks', level: 0 },
  { id: 'on-the-angle', emoji: '↗️', name: 'On the angle', desc: 'Complete a diagonal sequence', xp: 75, goal: 1, metric: 'diagonal', level: 1 },
  { id: 'victory', emoji: '🏆', name: 'Victory', desc: 'Win a match', xp: 75, goal: 1, metric: 'wins', level: 1 },
  { id: 'crowd', emoji: '👥', name: 'Crowded board', desc: 'Finish a match with three sides', xp: 75, goal: 1, metric: 'multi', level: 1 },
  { id: 'teamwork', emoji: '🤝', name: 'Teamwork', desc: 'Finish a team match', xp: 75, goal: 1, metric: 'teams', level: 1 },
  { id: 'snip', emoji: '✂️', name: 'Snip', desc: 'Remove 2 chips with one-eyed jacks', xp: 75, goal: 2, metric: 'removals', level: 1 },
  { id: 'shutout', emoji: '💎', name: 'Shutout', desc: 'Win before anyone else completes a sequence', xp: 125, goal: 1, metric: 'shutout', level: 2 },
  { id: 'hard-mode', emoji: '🔄', name: 'Rally', desc: 'Win after an opponent completes the first sequence', xp: 125, goal: 1, metric: 'comeback', level: 2 },
  { id: 'double', emoji: '✨', name: 'Double up', desc: 'Win 2 matches', xp: 100, goal: 2, metric: 'wins2', level: 2 },
];

export const WEEKLY: ChallengeDef[] = [
  { id: 'regular', emoji: '🎮', name: 'Regular', desc: 'Play 15 matches', xp: 200, goal: 15, metric: 'matches' },
  { id: 'champion', emoji: '🏆', name: 'Champion', desc: 'Win 5 matches', xp: 300, goal: 5, metric: 'wins' },
  { id: 'sequence-builder', emoji: '🏅', name: 'Sequence builder', desc: 'Complete 15 sequences', xp: 250, goal: 15, metric: 'sequences' },
  { id: 'cutthroat', emoji: '✂️', name: 'Cutthroat', desc: 'Remove 10 chips with one-eyed jacks', xp: 200, goal: 10, metric: 'removals' },
  { id: 'diagonals', emoji: '↗️', name: 'Diagonals', desc: 'Complete 3 diagonal sequences', xp: 250, goal: 3, metric: 'diagonal' },
  { id: 'tough-crowd', emoji: '💎', name: 'Clean sweep', desc: 'Win 3 matches before anyone else completes a sequence', xp: 300, goal: 3, metric: 'shutout' },
];

export const DAILY_BONUS = 150;
export const WEEKLY_BONUS = 500;
export const XP = { complete: 25, perSequence: 15, win: 100 };

export const XP_WAYS: [string, string][] = [
  ['Finish a match', `+${XP.complete} XP`],
  ['Each sequence you complete', `+${XP.perSequence} XP`],
  ['Win a match', `+${XP.win} XP bonus`],
  ['Daily challenges', '+50 to +125 XP each'],
  ['All 3 daily challenges', `+${DAILY_BONUS} XP bonus`],
  ['Weekly challenges', '+200 to +300 XP each'],
  ['All weekly challenges', `+${WEEKLY_BONUS} XP bonus`],
  ['Achievements', '+100 to +500 XP each'],
];

export const matchXp = (m: MatchSummary) => (m.forfeit ? 0 : XP.complete + m.sequences * XP.perSequence + (m.won ? XP.win : 0));

// ---------------------------------------------------------------- state

export interface ChallengeSet {
  key: string;
  ids: string[];
  progress: Record<string, number>;
  done: Record<string, boolean>;
  bonus: boolean;
}

export interface Earned {
  matchXp: number;
  xpFrom: number;
  xpTo: number;
  achievements: { emoji: string; name: string; desc: string; xp: number }[];
  challenges: { emoji: string; name: string; desc: string; xp: number }[];
}

export interface Progress {
  v: 1;
  xp: number;
  stats: Stats;
  days: string[];
  streak: { current: number; best: number; last: string };
  unlocked: Record<string, string>;
  daily: ChallengeSet;
  weekly: ChallengeSet;
  processed: string[];
  /** What the last match earned, until the results screen shows it. */
  last: Earned | null;
}

/** Seeded picks so the day's challenges are the same all day. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1e5) / 1e5;
  };
}
function pickDaily(id: string, key: string) {
  const r = rng(`${id}:${key}`);
  const out: string[] = [];
  const used = new Set<string>();
  for (const lvl of [0, 1, 2]) {
    const pool = DAILY.filter((d) => d.level === lvl && !used.has(d.metric));
    const d = pool[Math.floor(r() * pool.length)];
    out.push(d.id);
    used.add(d.metric);
  }
  return out;
}
function pickWeekly(id: string, key: string) {
  const r = rng(`${id}:w:${key}`);
  const skip = WEEKLY[Math.floor(r() * WEEKLY.length)].id;
  return WEEKLY.filter((w) => w.id !== skip).map((w) => w.id);
}
const set = (key: string, ids: string[]): ChallengeSet => ({ key, ids, progress: {}, done: {}, bonus: false });

const KEY = 'cf.progress';
let owner = 'local';

function blank(): Progress {
  const d = dayKey();
  const w = dayKey(weekStart());
  return { v: 1, xp: 0, stats: blankStats(), days: [], streak: { current: 0, best: 0, last: '' }, unlocked: {}, daily: set(d, pickDaily(owner, d)), weekly: set(w, pickWeekly(owner, w)), processed: [], last: null };
}

let state: Progress = blank();
const listeners = new Set<() => void>();
function commit(p: Progress) {
  state = p;
  kv.set(KEY, JSON.stringify(p));
  listeners.forEach((l) => l());
}

function rollover(p: Progress): Progress {
  const d = dayKey();
  const w = dayKey(weekStart());
  let out = p;
  if (p.daily.key !== d) out = { ...out, daily: set(d, pickDaily(owner, d)) };
  if (p.weekly.key !== w) out = { ...out, weekly: set(w, pickWeekly(owner, w)) };
  return out;
}

function bump(p: Progress, metric: string, amount: number) {
  if (!amount) return;
  for (const [s, defs] of [[p.daily, DAILY], [p.weekly, WEEKLY]] as const) {
    for (const id of s.ids) {
      const def = defs.find((d) => d.id === id);
      if (!def || def.metric !== metric || s.done[id]) continue;
      s.progress[id] = (s.progress[id] ?? 0) + amount;
    }
  }
}

function markDay(p: Progress) {
  const today = dayKey();
  if (!p.days.includes(today)) p.days = [...p.days, today].slice(-400);
  const s = p.streak;
  if (s.last !== today) {
    s.current = s.last === addDays(today, -1) ? s.current + 1 : 1;
    s.last = today;
    s.best = Math.max(s.best, s.current);
  }
}

export const progress = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  load(id = 'local') {
    owner = id;
    const saved = kv.json<Progress | null>(KEY, null);
    state = saved?.v === 1 ? { ...blank(), ...saved, stats: { ...blankStats(), ...saved.stats } } : blank();
    state = rollover(state);
    listeners.forEach((l) => l());
  },
  /** New day or week: fresh challenges. */
  refresh() {
    const next = rollover(state);
    if (next !== state) commit(next);
  },
  /** Daily play streak, if still alive (played today or yesterday). */
  currentStreak() {
    const { current, last } = state.streak;
    if (!last) return 0;
    const today = dayKey();
    return last === today || last === addDays(today, -1) ? current : 0;
  },
  /** A finished ranked match: XP, stats, challenges and achievements. */
  match(m: MatchSummary) {
    const id = `match:${m.matchId}`;
    let p = rollover(state);
    if (p.processed.includes(id)) return;
    p = JSON.parse(JSON.stringify(p)) as Progress;
    p.processed = [...p.processed.slice(-400), id];
    const earned: Earned = { matchXp: 0, xpFrom: p.xp, xpTo: p.xp, achievements: [], challenges: [] };

    const s = p.stats;
    const xp = matchXp(m);
    p.xp += xp;
    earned.matchXp = xp;
    s.matchesPlayed++;
    if (m.won) s.matchWins++;
    else s.matchLosses++;
    if (m.forfeit) s.forfeits++;
    s.sequences += m.sequences;
    s.diagonals += m.diagonals;
    s.wildJacks += m.wildJacks;
    s.removals += m.removals;
    if (m.shutout) s.shutouts++;
    if (m.comeback) s.comebacks++;
    s.winStreak = m.won ? s.winStreak + 1 : 0;
    s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
    s.totalMatchMs += Math.max(0, Math.min(m.durationMs, 3 * 3600e3));
    const day = dayKey();
    const d = s.byDay[day] ?? [0, 0];
    s.byDay[day] = [d[0] + 1, d[1] + (m.won ? 1 : 0)];
    const md = s.byMode[m.mode] ?? [0, 0];
    s.byMode[m.mode] = [md[0] + 1, md[1] + (m.won ? 1 : 0)];

    if (!m.forfeit) {
      bump(p, 'matches', 1);
      if (m.sides === 3) bump(p, 'multi', 1);
      if (m.mode === 'teams' || m.mode === 'teams3v3' || m.mode === 'teams3') bump(p, 'teams', 1);
    }
    bump(p, 'sequences', m.sequences);
    bump(p, 'diagonal', m.diagonals);
    bump(p, 'wildJacks', m.wildJacks);
    bump(p, 'removals', m.removals);
    if (m.won) {
      bump(p, 'wins', 1);
      bump(p, 'wins2', 1);
      if (m.shutout) bump(p, 'shutout', 1);
      if (m.comeback) bump(p, 'comeback', 1);
    }
    markDay(p);

    // Challenges completed by this match, then the bonus for finishing a set.
    for (const [cs, defs, bonus] of [[p.daily, DAILY, DAILY_BONUS], [p.weekly, WEEKLY, WEEKLY_BONUS]] as const) {
      for (const cid of cs.ids) {
        const def = defs.find((x) => x.id === cid)!;
        if (!cs.done[cid] && (cs.progress[cid] ?? 0) >= def.goal) {
          cs.done[cid] = true;
          p.xp += def.xp;
          earned.challenges.push({ emoji: def.emoji, name: def.name, desc: def.desc, xp: def.xp });
        }
      }
      if (!cs.bonus && cs.ids.every((cid) => cs.done[cid])) {
        cs.bonus = true;
        p.xp += bonus;
      }
    }
    // Achievements.
    for (const a of ACHIEVEMENTS) {
      if (!p.unlocked[a.id] && a.value(p) >= a.goal) {
        p.unlocked[a.id] = day;
        p.xp += a.xp;
        earned.achievements.push({ emoji: a.emoji, name: a.name, desc: a.desc, xp: a.xp });
      }
    }
    earned.xpTo = p.xp;
    p.last = earned;
    commit(p);
  },
  /** The results screen has shown what the last match earned. */
  clearLast() {
    if (state.last) commit({ ...state, last: null });
  },
  reset() {
    kv.remove(KEY);
    state = blank();
    listeners.forEach((l) => l());
  },
};

export function useProgress(): Progress {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}

export function achievementState(p: Progress, a: AchievementDef) {
  const value = a.value(p);
  const unlocked = !!p.unlocked[a.id];
  return { value, unlocked, pct: unlocked ? 1 : Math.max(0, Math.min(1, value / a.goal)) };
}

/** Wins and matches over a period, from the per-day record. */
export function periodRecord(s: Stats, period: 'week' | 'month' | 'all', now = new Date()) {
  if (period === 'all') return { played: s.matchesPlayed, wins: s.matchWins };
  const from = period === 'month' ? dayKey(new Date(now.getFullYear(), now.getMonth(), 1)) : dayKey(weekStart(now));
  let played = 0;
  let wins = 0;
  for (const [k, [pl, w]] of Object.entries(s.byDay)) if (k >= from) {
    played += pl;
    wins += w;
  }
  return { played, wins };
}
