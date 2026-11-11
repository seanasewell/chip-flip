// Sample players for the leaderboards, friends list and player profiles.
//
// This prototype has no server, so other players are generated locally and
// labelled as samples wherever they appear. Every number shown for a sample
// player comes from samplePlayer(id), so a player's leaderboard row and
// profile always agree. The signed-in player's numbers always come from
// their real stats (progress.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { periodRecord, winPct, type LineupStats } from "./progress";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let e = seed | 0;
  return () => {
    e = (e + 1831565813) | 0;
    let i = Math.imul(e ^ (e >>> 15), 1 | e);
    i = (i + Math.imul(i ^ (i >>> 7), 61 | i)) ^ i;
    return ((i ^ (i >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ava", "Leo", "Maya", "Noah", "Zara", "Eli", "Ivy", "Kai", "Luna", "Omar", "Nia", "Theo", "Ruby", "Jude", "Aria",
  "Finn", "Sana", "Milo", "Isla", "Arjun", "Chloe", "Mateo", "Hana", "Ezra", "Priya", "Owen", "Lila", "Rafa", "Tess",
  "Kofi", "June", "Sami", "Wren", "Dev", "Nora", "Cole", "Mina", "Jack", "Esme", "Ravi",
];
const HANDLE = ["corner", "diag", "blocker", "chip", "fourth", "row", "stack", "grid", "angle", "lineup", "column", "spade"];

export function sampleName(seed: number) {
  const r = rng(seed);
  const a = r();
  const n = FIRST[Math.floor(r() * FIRST.length)];
  if (a < 0.45) return `${n} ${String.fromCharCode(65 + Math.floor(r() * 26))}.`;
  if (a < 0.75) return `${HANDLE[Math.floor(r() * HANDLE.length)]}_${n.toLowerCase()}`;
  return `${n}${Math.floor(r() * 90 + 10)}`;
}

/** XP needed to reach a level (same curve as the shell). */
export const xpForLevel = (lvl: number) => {
  let t = 0;
  for (let l = 1; l < lvl; l++) t += 500 + (l - 1) * 100;
  return t;
};

export interface SampleProfile {
  id: string;
  name: string;
  glyph: string;
  hue: number;
  sample: true;
  xp: number;
  friends: number;
  streak: { current: number; best: number; days: string[] };
  stats: Pick<LineupStats, "matchesPlayed" | "matchWins" | "bestWinStreak" | "winStreak" | "sequences" | "removals" | "totalMatchMs">;
  /** Wins and matches in the current week / month, for the leaderboards. */
  period: { week: { played: number; wins: number }; month: { played: number; wins: number } };
}

const cache = new Map<string, SampleProfile>();

export function samplePlayer(id: string, name?: string, hue?: number): SampleProfile {
  const key = `${id}|${name ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(hash(id));
  const nm = name ?? sampleName(hash(id) ^ 0x9e37);
  const activity = Math.pow(r(), 1.8); // most players are casual
  const played = Math.round(4 + activity * 900);
  const skill = 0.28 + r() * 0.42;
  const wins = Math.round(played * skill);
  const best = Math.max(1, Math.round(1 + skill * 4 + r() * 6 * activity));
  const cur = Math.floor(r() * (best + 1));
  const level = Math.max(1, Math.min(99, Math.round(1 + Math.sqrt(played * 9 + wins * 20) / 3.2)));
  const xp = xpForLevel(level) + Math.round(r() * (400 + level * 90));
  const now = new Date();
  const weekFrac = (((now.getDay() + 6) % 7) + 0.6) / 7;
  const monthFrac = Math.min(1, (now.getDate() - 0.4) / 30);
  const weekRng = rng(hash(`${id}|${weekKey(now)}`));
  const monthRng = rng(hash(`${id}|${now.getFullYear()}-${now.getMonth()}`));
  const wkPlayed = Math.round(activity * 40 * weekFrac * (0.5 + weekRng()));
  const moPlayed = Math.max(wkPlayed, Math.round(activity * 160 * monthFrac * (0.6 + monthRng() * 0.8)));
  const days: string[] = [];
  const streakDays = Math.floor(r() * Math.min(9, 2 + activity * 20));
  for (let k = 0; k < streakDays; k++) {
    const d = new Date(now);
    d.setDate(d.getDate() - k);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  const p: SampleProfile = {
    id,
    name: nm,
    glyph: nm[0].toUpperCase(),
    hue: hue ?? Math.floor(r() * 360),
    sample: true,
    xp,
    friends: 3 + Math.floor(r() * 40),
    streak: { current: streakDays, best: streakDays + Math.floor(r() * 20), days },
    stats: {
      matchesPlayed: played,
      matchWins: wins,
      bestWinStreak: best,
      winStreak: cur,
      sequences: Math.round(wins * 2 + (played - wins) * 0.7),
      removals: Math.round(played * (0.6 + r() * 1.4)),
      totalMatchMs: played * (150 + Math.floor(r() * 120)) * 1000,
    },
    period: {
      week: { played: wkPlayed, wins: Math.round(wkPlayed * skill) },
      month: { played: moPlayed, wins: Math.round(moPlayed * skill) },
    },
  };
  cache.set(key, p);
  return p;
}

function weekKey(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

export type RankCategory = "wins" | "winpct" | "streak" | "level";
export type RankPeriod = "week" | "month" | "all";
export const MIN_MATCHES_FOR_PCT = 5;

export interface RankEntry {
  id: string;
  name: string;
  glyph: string;
  hue: number;
  photo?: string | null;
  isYou?: boolean;
  value: number;
  /** Secondary text under the value, e.g. "12 matches". */
  sub: string;
  qualified: boolean;
  rank: number;
}

const SAMPLE_COUNT = 140;

export function levelOf(xp: number) {
  let lvl = 1;
  let left = xp;
  while (lvl < 100 && left >= 500 + (lvl - 1) * 100) {
    left -= 500 + (lvl - 1) * 100;
    lvl++;
  }
  return lvl;
}

function valueFor(cat: RankCategory, period: RankPeriod, rec: { played: number; wins: number }, streak: number, xp: number) {
  switch (cat) {
    case "wins":
      return { value: rec.wins, sub: rec.wins === 1 ? "win" : "wins", qualified: true };
    case "winpct": {
      const ok = rec.played >= MIN_MATCHES_FOR_PCT;
      return { value: winPct({ matchesPlayed: rec.played, matchWins: rec.wins }), sub: `${rec.played} played`, qualified: ok };
    }
    case "streak":
      return { value: streak, sub: streak === 1 ? "win" : "wins", qualified: true };
    case "level":
      return { value: levelOf(xp), sub: "level", qualified: true };
  }
  void period;
}

export function leaderboard(
  cat: RankCategory,
  period: RankPeriod,
  me: { id: string; name: string; photo: string | null; stats: LineupStats; xp: number },
  blocked: Set<string> = new Set(),
) {
  const per = cat === "wins" || cat === "winpct" ? period : "all";
  const rows: Omit<RankEntry, "rank">[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const id = `s${i}`;
    if (blocked.has(id)) continue;
    const p = samplePlayer(id);
    const rec = per === "all" ? { played: p.stats.matchesPlayed, wins: p.stats.matchWins } : p.period[per];
    rows.push({ id, name: p.name, glyph: p.glyph, hue: p.hue, ...valueFor(cat, per, rec, p.stats.winStreak, p.xp) });
  }
  const mine = periodRecord(me.stats, per);
  const you = {
    id: me.id,
    name: me.name,
    glyph: me.name[0]?.toUpperCase() ?? "Y",
    hue: 255,
    photo: me.photo,
    isYou: true,
    ...valueFor(cat, per, mine, me.stats.winStreak, me.xp),
  };
  rows.push(you);
  // Win % only ranks players with enough matches (you always appear).
  const pool = cat === "winpct" ? rows.filter((r) => r.qualified || (r as { isYou?: boolean }).isYou) : rows;
  const sorted = pool
    .sort(
      (a, b) =>
        Number(b.qualified) - Number(a.qualified) ||
        b.value - a.value ||
        (a.isYou ? 1 : b.isYou ? -1 : a.name.localeCompare(b.name)),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return { entries: sorted.slice(0, 50), you: sorted.find((r) => r.isYou)! };
}
