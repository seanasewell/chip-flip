// Lineup statistics, achievements and challenges.
//
// The app shell's progress store (XP, streak days, unlocked achievements,
// daily and weekly challenges, celebration queue, de-duplication of
// processed matches) is reused as-is. This module supplies the
// Lineup-specific parts: what a finished match adds, the achievement list
// and the challenge pools. Profile and Ranks both read from these stats,
// so there is one source of truth for a player's record.
//
// Counting rules (also shown in Settings > How stats work):
//  - A match is one game and counts once, when it ends (deduplicated by
//    match id).
//  - Win = your side (you, or your team) completed the sequences needed
//    first. Every other finish is a loss, whatever your placement with
//    three players or teams. Placements show on the results screen only.
//  - Forfeiting is a loss and earns no XP. Abandoning a saved match by
//    starting a new one forfeits it if you had played a card.
//  - Leaving a match without forfeiting keeps it saved; it counts only
//    when it is finished or forfeited.
//  - Rematches are new matches and count separately.
//  - Pass-and-play matches count for the signed-in or guest player in
//    seat one only; other people on the device play as local guests.
//  - Guest progress is kept on this device and merged into your account
//    when you sign in with "Switch and merge".
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { GameModeId } from "./core/types";

export interface MatchSummary {
  matchId: string;
  /** Casual: not recorded anywhere. */
  casual?: boolean;
  mode: GameModeId;
  won: boolean;
  forfeit: boolean;
  /** Sequences completed by your side. */
  sequences: number;
  diagonals: number;
  /** Two-eyed jacks you played and chips you removed with one-eyed jacks. */
  wildJacks: number;
  removals: number;
  /** Won before any other side completed a sequence. */
  shutout: boolean;
  /** Won after another side completed the first sequence. */
  comeback: boolean;
  vsFriend: boolean;
  beatHard: boolean;
  durationMs: number;
  /** Placement among sides (1 = winner). */
  placement: number;
  sides: number;
}

export type ModeRecord = [played: number, wins: number];

export interface LineupStats {
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
  hardWins: number;
  winStreak: number;
  bestWinStreak: number;
  totalMatchMs: number;
  byDay: Record<string, ModeRecord>;
  byMode: Partial<Record<GameModeId, ModeRecord>>;
}

export const blankStats = (): LineupStats => ({
  matchesPlayed: 0,
  matchWins: 0,
  matchLosses: 0,
  forfeits: 0,
  sequences: 0,
  diagonals: 0,
  wildJacks: 0,
  removals: 0,
  shutouts: 0,
  comebacks: 0,
  friendMatches: 0,
  hardWins: 0,
  winStreak: 0,
  bestWinStreak: 0,
  totalMatchMs: 0,
  byDay: {},
  byMode: {},
});

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};

export const winPct = (s: Pick<LineupStats, "matchesPlayed" | "matchWins">) =>
  s.matchesPlayed ? Math.round((s.matchWins / s.matchesPlayed) * 100) : 0;

// ---------------------------------------------------------------- achievements

interface AchievementDef {
  id: string;
  series: string;
  emoji: string;
  name: string;
  desc: string;
  goal: number;
  xp: number;
  value: (p: any) => number;
}

const st = (p: any): LineupStats => p.stats;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-sequence", series: "sequences", emoji: "\u{1F3AF}", name: "First sequence", desc: "Complete your first sequence", goal: 1, xp: 100, value: (p) => st(p).sequences },
  { id: "first-victory", series: "matches", emoji: "\u{1F3C6}", name: "First victory", desc: "Win your first match", goal: 1, xp: 150, value: (p) => st(p).matchWins },
  { id: "getting-started", series: "matches", emoji: "\u{1F3AE}", name: "Getting started", desc: "Play 5 matches", goal: 5, xp: 150, value: (p) => st(p).matchesPlayed },
  { id: "on-a-roll", series: "streaks", emoji: "\u{1F525}", name: "On a roll", desc: "Win 3 matches in a row", goal: 3, xp: 200, value: (p) => st(p).bestWinStreak },
  { id: "unstoppable", series: "streaks", emoji: "\u26A1", name: "Unstoppable", desc: "Win 5 matches in a row", goal: 5, xp: 300, value: (p) => st(p).bestWinStreak },
  { id: "shutout", series: "matches", emoji: "\u{1F48E}", name: "Shutout", desc: "Win before anyone else completes a sequence", goal: 1, xp: 250, value: (p) => st(p).shutouts },
  { id: "strategic-thinker", series: "matches", emoji: "\u{1F9E0}", name: "Strategic thinker", desc: "Win 25 matches", goal: 25, xp: 300, value: (p) => st(p).matchWins },
  { id: "lineup-legend", series: "matches", emoji: "\u{1F451}", name: "Chip Flip legend", desc: "Win 100 matches", goal: 100, xp: 500, value: (p) => st(p).matchWins },
  { id: "social-player", series: "social", emoji: "\u{1F91D}", name: "Social player", desc: "Play a match against a friend", goal: 1, xp: 150, value: (p) => st(p).friendMatches },
  { id: "daily-player", series: "streaks", emoji: "\u{1F4C5}", name: "Daily player", desc: "Play matches on 3 different days", goal: 3, xp: 150, value: (p) => Object.keys(st(p).byDay).length },
  { id: "diagonal-master", series: "sequences", emoji: "\u2197\uFE0F", name: "Diagonal master", desc: "Complete 10 diagonal sequences", goal: 10, xp: 250, value: (p) => st(p).diagonals },
  { id: "comeback", series: "matches", emoji: "\u{1F504}", name: "Comeback", desc: "Win after an opponent completed the first sequence", goal: 1, xp: 300, value: (p) => st(p).comebacks },
  { id: "wild-card", series: "sequences", emoji: "\u{1F0CF}", name: "Wild card", desc: "Play 25 two-eyed jacks", goal: 25, xp: 200, value: (p) => st(p).wildJacks },
  { id: "cutthroat", series: "sequences", emoji: "\u2702\uFE0F", name: "Cutthroat", desc: "Remove 25 chips with one-eyed jacks", goal: 25, xp: 200, value: (p) => st(p).removals },
  // The daily play streak from the shell (same streak shown on Profile).
  { id: "streak-7", series: "streaks", emoji: "\u{1F5D3}\uFE0F", name: "Week of play", desc: "Play at least one match a day for 7 days in a row", goal: 7, xp: 300, value: (p) => p.streak.best },
  { id: "streak-30", series: "streaks", emoji: "\u{1F31F}", name: "Month of play", desc: "Play at least one match a day for 30 days in a row", goal: 30, xp: 500, value: (p) => p.streak.best },
];

export const ACHIEVEMENT_SERIES = [
  { key: "matches", label: "Matches" },
  { key: "sequences", label: "Sequences" },
  { key: "streaks", label: "Streaks" },
  { key: "social", label: "Social" },
];

// ---------------------------------------------------------------- challenges

export const DAILY = [
  { id: "warm-up", emoji: "\u{1F3AE}", name: "Warm up", desc: "Play 2 matches", xp: 50, goal: 2, metric: "matches", level: 0 },
  { id: "sequence", emoji: "\u{1F3C5}", name: "Five in a row", desc: "Complete a sequence", xp: 50, goal: 1, metric: "sequences", level: 0 },
  { id: "wild", emoji: "\u{1F0CF}", name: "Wild card", desc: "Play a two-eyed jack", xp: 50, goal: 1, metric: "wildJacks", level: 0 },
  { id: "on-the-angle", emoji: "\u2197\uFE0F", name: "On the angle", desc: "Complete a diagonal sequence", xp: 75, goal: 1, metric: "diagonal", level: 1 },
  { id: "victory", emoji: "\u{1F3C6}", name: "Victory", desc: "Win a match", xp: 75, goal: 1, metric: "wins", level: 1 },
  { id: "crowd", emoji: "\u{1F465}", name: "Crowded board", desc: "Finish a match with three sides", xp: 75, goal: 1, metric: "multi", level: 1 },
  { id: "teamwork", emoji: "\u{1F91D}", name: "Teamwork", desc: "Finish a team match", xp: 75, goal: 1, metric: "teams", level: 1 },
  { id: "snip", emoji: "\u2702\uFE0F", name: "Snip", desc: "Remove 2 chips with one-eyed jacks", xp: 75, goal: 2, metric: "removals", level: 1 },
  { id: "shutout", emoji: "\u{1F48E}", name: "Shutout", desc: "Win before anyone else completes a sequence", xp: 125, goal: 1, metric: "shutout", level: 2 },
  { id: "hard-mode", emoji: "\u{1F504}", name: "Rally", desc: "Win after an opponent completes the first sequence", xp: 125, goal: 1, metric: "comeback", level: 2 },
  { id: "double", emoji: "\u2728", name: "Double up", desc: "Win 2 matches", xp: 100, goal: 2, metric: "wins2", level: 2 },
];

export const WEEKLY = [
  { id: "regular", emoji: "\u{1F3AE}", name: "Regular", desc: "Play 15 matches", xp: 200, goal: 15, metric: "matches" },
  { id: "champion", emoji: "\u{1F3C6}", name: "Champion", desc: "Win 5 matches", xp: 300, goal: 5, metric: "wins" },
  { id: "sequence-builder", emoji: "\u{1F3C5}", name: "Sequence builder", desc: "Complete 15 sequences", xp: 250, goal: 15, metric: "sequences" },
  { id: "cutthroat", emoji: "\u2702\uFE0F", name: "Cutthroat", desc: "Remove 10 chips with one-eyed jacks", xp: 200, goal: 10, metric: "removals" },
  { id: "diagonals", emoji: "\u2197\uFE0F", name: "Diagonals", desc: "Complete 3 diagonal sequences", xp: 250, goal: 3, metric: "diagonal" },
  { id: "tough-crowd", emoji: "\u{1F48E}", name: "Clean sweep", desc: "Win 3 matches before anyone else completes a sequence", xp: 300, goal: 3, metric: "shutout" },
];

export const DAILY_BONUS = 150;
export const WEEKLY_BONUS = 500;

/** Adds progress to every open daily/weekly challenge tracking `metric`. */
function bump(p: any, metric: string, amount: number, best = false) {
  if (!amount) return;
  for (const [set, defs] of [
    [p.daily, DAILY],
    [p.weekly, WEEKLY],
  ] as const) {
    for (const id of set.ids) {
      const def = (defs as any[]).find((d) => d.id === id);
      if (!def || def.metric !== metric || set.done[id]) continue;
      const cur = set.progress[id] ?? 0;
      set.progress[id] = best ? Math.max(cur, amount) : cur + amount;
    }
  }
}

function markDay(p: any) {
  const today = dayKey();
  if (!p.days.includes(today)) p.days = [...p.days, today];
  const s = p.streak;
  if (s.last !== today) {
    s.current = s.last === addDays(today, -1) ? s.current + 1 : 1;
    s.last = today;
    s.best = Math.max(s.best, s.current);
  }
}

export const XP = { complete: 25, perSequence: 15, win: 100 };

export function matchXp(m: MatchSummary) {
  if (m.forfeit) return 0;
  return XP.complete + m.sequences * XP.perSequence + (m.won ? XP.win : 0);
}

/** Applies a finished match to the progress state (mutates `p`, the
 *  shell's structured clone, and `session`, the celebration record). */
export function applyMatch(p: any, session: any, m: MatchSummary) {
  const s: LineupStats = (p.stats = { ...blankStats(), ...p.stats });
  const xp = matchXp(m);
  p.xp += xp;
  session.matchXp += xp;

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
  if (m.vsFriend) s.friendMatches++;
  if (m.won && m.beatHard) s.hardWins++;
  s.winStreak = m.won ? s.winStreak + 1 : 0;
  s.bestWinStreak = Math.max(s.bestWinStreak, s.winStreak);
  s.totalMatchMs += Math.max(0, Math.min(m.durationMs, 3 * 3600e3));
  const day = dayKey();
  const d = s.byDay[day] ?? [0, 0];
  s.byDay = { ...s.byDay, [day]: [d[0] + 1, d[1] + (m.won ? 1 : 0)] };
  const md = s.byMode[m.mode] ?? [0, 0];
  s.byMode = { ...s.byMode, [m.mode]: [md[0] + 1, md[1] + (m.won ? 1 : 0)] };

  if (!m.forfeit) {
    bump(p, "matches", 1);
    if (m.sides === 3) bump(p, "multi", 1);
    if (m.mode === "teams" || m.mode === "teams3v3" || m.mode === "teams3") bump(p, "teams", 1);
  }
  bump(p, "sequences", m.sequences);
  bump(p, "diagonal", m.diagonals);
  bump(p, "wildJacks", m.wildJacks);
  bump(p, "removals", m.removals);
  if (m.won) {
    bump(p, "wins", 1);
    bump(p, "wins2", 1);
    if (m.shutout) bump(p, "shutout", 1);
    if (m.comeback) bump(p, "comeback", 1);
  }
  markDay(p);
}

/** Combines two players' stats when a guest signs in to an existing
 *  account ("Switch and merge"). */
export function mergeStats(target: Partial<LineupStats>, source: Partial<LineupStats>): LineupStats {
  const a = { ...blankStats(), ...target };
  const b = { ...blankStats(), ...source };
  const out = { ...a } as any;
  for (const k of Object.keys(a) as (keyof LineupStats)[]) {
    if (typeof a[k] === "number") out[k] = (a[k] as number) + (b[k] as number);
  }
  out.bestWinStreak = Math.max(a.bestWinStreak, b.bestWinStreak);
  out.winStreak = a.winStreak;
  const mergeRec = (x: Record<string, ModeRecord>, y: Record<string, ModeRecord>) => {
    const r: Record<string, ModeRecord> = { ...x };
    for (const [k, v] of Object.entries(y)) r[k] = [(r[k]?.[0] ?? 0) + v[0], (r[k]?.[1] ?? 0) + v[1]];
    return r;
  };
  out.byDay = mergeRec(a.byDay, b.byDay);
  out.byMode = mergeRec(a.byMode as any, b.byMode as any);
  return out;
}

/** Wins / played over a period, from the same per-day record Profile uses. */
export function periodRecord(s: LineupStats, period: "week" | "month" | "all", now = new Date()) {
  if (period === "all") return { played: s.matchesPlayed, wins: s.matchWins };
  let from: string;
  if (period === "month") from = dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
  else {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    from = dayKey(d);
  }
  let played = 0;
  let wins = 0;
  for (const [k, [p, w]] of Object.entries(s.byDay ?? {}))
    if (k >= from) {
      played += p;
      wins += w;
    }
  return { played, wins };
}

export const XP_WAYS: [string, string][] = [
  ["Finish a match", `+${XP.complete} XP`],
  ["Each sequence you complete", `+${XP.perSequence} XP`],
  ["Win a match", `+${XP.win} XP bonus`],
  ["Daily challenges", "+50 to +125 XP each"],
  ["All 3 daily challenges", `+${DAILY_BONUS} XP bonus`],
  ["Weekly challenges", "+200 to +300 XP each"],
  ["All weekly challenges", `+${WEEKLY_BONUS} XP bonus`],
  ["Achievements", "+100 to +500 XP each"],
];

export const LEVEL_TITLES: [number, string][] = [
  [100, "Chip Flip legend"],
  [75, "Grandmaster"],
  [50, "Master tactician"],
  [40, "Champion"],
  [30, "Strategist"],
  [20, "Tactician"],
  [15, "Blocker"],
  [10, "Contender"],
  [5, "Challenger"],
  [1, "Rookie"],
];
