import { useMemo, useState } from "react";
import { blankStats } from "../progress";
import { MIN_MATCHES_FOR_PCT, leaderboard, type RankCategory, type RankEntry, type RankPeriod } from "../samples";
import { shell } from "../shell";
import { Segmented } from "./Setup";
import { useNow } from "./hooks";

const CATS: { id: RankCategory; label: string; blurb: string; unit: (n: number) => string }[] = [
  { id: "wins", label: "Wins", blurb: "Most match wins", unit: (n) => (n === 1 ? "win" : "wins") },
  { id: "streak", label: "Streak", blurb: "Current win streak", unit: (n) => (n === 1 ? "win in a row" : "wins in a row") },
];
const PERIODS: { id: RankPeriod; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All time" },
];

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function periodText(p: RankPeriod, now = new Date()) {
  if (p === "all") return "All time";
  if (p === "month") return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return `${short(s)} – ${short(e)}`;
}
function resetText(p: RankPeriod, now: number) {
  const d = new Date(now);
  let end: Date;
  if (p === "week") {
    end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    end.setDate(end.getDate() - ((end.getDay() + 6) % 7) + 7);
  } else if (p === "month") end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  else return null;
  const ms = end.getTime() - now;
  const days = Math.floor(ms / 864e5);
  const hrs = Math.floor((ms % 864e5) / 36e5);
  const mins = Math.floor((ms % 36e5) / 6e4);
  const left = days > 0 ? `${days}d ${hrs}h` : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  return `${p === "week" ? "Resets Monday" : "Resets on the 1st"} · ${left} left`;
}

const MEDAL: Record<number, string> = {
  1: "border border-[rgba(255,194,74,0.65)] bg-[rgba(255,194,74,0.24)]",
  2: "border border-[rgba(201,211,224,0.6)] bg-[rgba(201,211,224,0.2)]",
  3: "border border-[rgba(217,138,78,0.65)] bg-[rgba(217,138,78,0.24)]",
};

function fmt(cat: RankCategory, e: RankEntry) {
  if (cat === "winpct") return e.qualified || e.isYou ? `${e.value}%` : "—";
  return String(e.value);
}

function RankRow({ e, cat, onPress }: { e: RankEntry; cat: RankCategory; onPress?: () => void }) {
  const { Avatar } = shell();
  const medal = e.rank === 1 ? "\u{1F947}" : e.rank === 2 ? "\u{1F948}" : e.rank === 3 ? "\u{1F949}" : null;
  const c = CATS.find((x) => x.id === cat)!;
  return (
    <div
      onClick={onPress}
      role={onPress ? "button" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${onPress ? "cursor-pointer hover:bg-iris/[.1]" : ""} ${MEDAL[e.rank] ?? (e.isYou ? "bg-iris/[.13]" : "bg-white/[.025]")} ${e.isYou ? "border border-iris/60" : ""}`}
    >
      <div className="w-8 text-center font-display text-sm font-bold tabular text-white/70">{medal ? <span className="text-xl">{medal}</span> : e.rank}</div>
      <Avatar player={{ glyph: e.glyph, hue: e.hue, photo: e.photo, isYou: e.isYou }} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{e.name}</div>
        {cat === "winpct" && <div className="text-[11px] text-white/55">{e.sub}</div>}
      </div>
      <div className="text-right">
        <div className={`font-display text-lg font-bold leading-none tabular ${cat === "level" ? "text-amber" : "text-white"}`}>{fmt(cat, e)}</div>
        <div className="text-[10px] text-white/60">{cat === "winpct" ? "win rate" : cat === "level" ? "level" : c.unit(e.value).replace(" in a row", "")}</div>
      </div>
    </div>
  );
}

export function Ranks() {
  const d = shell();
  const { account } = d.useAccount();
  const prog = d.useProgress();
  const [cat, setCat] = useState<RankCategory>("wins");
  const [period, setPeriod] = useState<RankPeriod>("week");
  const now = useNow(true, 30000);
  const timed = cat === "wins" || cat === "winpct";
  const per = timed ? period : "all";
  const blocked = d.blockedIds();
  const stats = { ...blankStats(), ...prog.stats };
  const { entries, you } = useMemo(
    () => leaderboard(cat, per, { id: account!.id, name: account!.name, photo: account!.photo, stats, xp: prog.xp }, blocked),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat, per, account?.id, account?.name, account?.photo, prog, new Date(now).toDateString(), blocked.size],
  );
  if (!account) return null;
  const c = CATS.find((x) => x.id === cat)!;
  const inList = entries.some((e) => e.isYou);
  const reset = timed ? resetText(per, now) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Ranks</h1>
        <button onClick={() => d.nav.push({ name: "search" })} aria-label="Find players" className="grid h-10 w-10 place-items-center rounded-full text-[21px] hover:bg-white/5">
          {"\u{1F50D}"}
        </button>
      </div>
      <p className="mt-1 text-sm text-white/70">
        {c.blurb} {"·"} {periodText(per)}
      </p>
      <div className="mt-4 space-y-2">
        <Segmented value={cat} options={CATS} onChange={setCat} />
        {timed ? (
          <Segmented value={period} options={PERIODS} onChange={setPeriod} />
        ) : (
          <div className="px-1 text-[12px] text-white/55">{cat === "streak" ? "Live: current streaks right now." : "Based on total XP."}</div>
        )}
      </div>
      <div className="surface mt-4 flex items-center gap-3 rounded-2xl p-4">
        <d.Avatar player={{ glyph: account.name[0]?.toUpperCase() ?? "Y", hue: 255, isYou: true, photo: account.photo }} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/70">Your rank</div>
          <div className="font-display text-2xl font-bold text-white">{ordinal(you.rank)}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[34px] font-bold leading-none text-mint tabular">{fmt(cat, you)}</div>
          {cat === "winpct" && !you.qualified && <div className="mt-1 text-[10px] text-white/60">Play {MIN_MATCHES_FOR_PCT} to qualify</div>}
        </div>
      </div>
      {reset && <div className="mt-2 text-right text-[11px] text-white/60">{reset}</div>}
      <div key={`${cat}-${per}`} className={`${reset ? "mt-2" : "mt-4"} space-y-1.5 animate-fadeIn`}>
        {entries.map((e) => (
          <RankRow key={e.id} e={e} cat={cat} onPress={e.isYou ? undefined : () => d.openPlayer({ id: e.id, name: e.name, glyph: e.glyph, hue: e.hue })} />
        ))}
        {!inList && (
          <>
            <div className="py-1 text-center text-white/50">{"⋯"}</div>
            <RankRow e={you} cat={cat} />
          </>
        )}
      </div>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-white/55">
        Other players shown are sample players in this preview. Your {cat === "level" ? "level comes" : "numbers come"} from your matches on this device.
        {cat === "winpct" && ` Win % ranks players with at least ${MIN_MATCHES_FOR_PCT} matches first.`}
      </p>
    </div>
  );
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
