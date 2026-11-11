import { winPct, type LineupStats } from "../progress";

const label = "text-[11px] font-semibold uppercase tracking-[.14em] text-white/65";

type Stats = Pick<LineupStats, "matchesPlayed" | "matchWins" | "bestWinStreak" | "winStreak" | "sequences" | "removals" | "totalMatchMs">;

/** Profile statistics, used for your own profile and other players'. */
export function ProfileStats({ stats }: { stats: Stats }) {
  const pct = winPct(stats);
  const big = (title: string, value: string, accent = "text-white") => (
    <div className="card rounded-2xl px-4 py-3">
      <div className={label}>{title}</div>
      <div className={`font-display text-2xl font-bold tabular ${accent}`}>{value}</div>
    </div>
  );
  return (
    <div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {big("Match wins", stats.matchWins.toLocaleString("en-US"), "text-mint")}
        {big("Win rate", stats.matchesPlayed ? `${pct}%` : "—", "text-amber")}
        {big("Matches played", stats.matchesPlayed.toLocaleString("en-US"))}
        {big("Best win streak", String(stats.bestWinStreak))}
      </div>
    </div>
  );
}

/** Achievement summary on your profile; opens the Rewards tab. */
export function AchievementSummary({ earned, total, recent, onOpen }: { earned: number; total: number; recent: string[]; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-iris/[.14] active:scale-[.98]">
      <div className="min-w-0 flex-1">
        <div className={label}>Achievements</div>
        <div className="mt-0.5 font-display text-xl font-bold text-white tabular">
          {earned} <span className="text-white/50">/ {total}</span>
        </div>
      </div>
      <div className="flex -space-x-1.5">
        {recent.slice(0, 4).map((e, i) => (
          <span key={i} className="grid h-9 w-9 place-items-center rounded-xl border border-mint/40 bg-mint/[.12] text-lg" aria-hidden>
            {e}
          </span>
        ))}
        {recent.length === 0 && <span className="text-sm text-white/60">None yet</span>}
      </div>
      <span className="text-white/55">{"›"}</span>
    </button>
  );
}
