import { MODES } from "../core/board";
import { sequenceCount, toWin } from "../core/engine";
import type { MatchState, Seat } from "../core/types";
import { shell } from "../shell";
import { ChipIcon } from "./Chip";
import { sideColor } from "./theme";

export function SeatAvatar({ seat, size, dim = false, badge = true }: { seat: Seat; size: number; active?: boolean; dim?: boolean; badge?: boolean }) {
  const { Avatar } = shell();
  const c = sideColor(seat.side);
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full" style={{ width: badge ? size + 6 : size + 2, height: badge ? size + 6 : size + 2 }}>
      <Avatar player={{ glyph: seat.glyph, hue: seat.hue, photo: seat.photo, isYou: seat.kind === "you", id: seat.id }} size={size} dim={dim} />
      {badge && <ChipIcon color={c} size={Math.round(size * 0.46)} mark={0.55} className="absolute -bottom-0.5 -right-0.5" />}
    </span>
  );
}

/** Sequence progress: one pip per sequence needed to win. */
export function Pips({ count, total, side, size = 7 }: { count: number; total: number; side: number; size?: number }) {
  const c = sideColor(side);
  return (
    <span className="flex gap-1" aria-label={`${count} of ${total} sequences`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={i < count ? "animate-luPip" : ""}
          style={{ width: size * 1.8, height: size + 2, background: i < count ? c.base : "#FFFFFF", border: "1.5px solid #111111" }}
        />
      ))}
    </span>
  );
}

const nameOf = (s: Seat) => (s.kind === "you" ? "You" : s.name);

/** Compact header: every side, whose turn it is and sequence progress.
 *  Adapts from two players to three teams of two. */
export function PlayerStrip({ m, activeId }: { m: MatchState; activeId: string | null }) {
  const mode = MODES[m.mode];
  const need = toWin(m);
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${m.sides.length}, minmax(0, 1fr))` }}>
      {m.sides.map((side) => {
        const c = sideColor(side.index);
        const seats = side.seats.map((id) => m.seats.find((s) => s.id === id)!);
        const on = seats.some((s) => s.id === activeId);
        const label = mode.teams ? (m.sides.length > 2 ? c.name : side.name) : nameOf(seats[0]);
        return (
          <div
            key={side.index}
            className="flex min-w-0 items-center gap-1.5 px-1.5 py-1.5 transition-transform"
            style={{ background: on ? c.light : "#FFFDF6", border: "2px solid #111111", boxShadow: on ? "4px 4px 0 #111111" : "none", transform: on ? "translate(-2px,-2px)" : undefined }}
          >
            <div className={`flex shrink-0 ${seats.length > 1 ? "-space-x-2.5" : ""}`}>
              {seats.map((s) => (
                <SeatAvatar key={s.id} seat={s} size={m.sides.length > 2 ? (seats.length > 1 ? 20 : 24) : seats.length > 2 ? 22 : seats.length > 1 ? 26 : 32} badge={false} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`flex min-w-0 items-center gap-1.5 py-[2px] font-display text-[14px] leading-none ${on ? "text-white" : "text-white/70"}`}>
                <ChipDot side={side.index} size={14} />
                <span className="truncate">{label}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Pips count={sequenceCount(m, side.index)} total={need} side={side.index} size={6} />
                {!mode.teams && seats[0].kind === "bot" && <span className="lu-pill lu-badge shrink-0 !px-1 !py-0 !text-[8px]">CPU</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Small chip showing a side's color and symbol, used beside names. */
export function ChipDot({ side, size }: { side: number; size: number }) {
  const c = sideColor(side);
  return (
    <ChipIcon color={c} size={size} mark={0.5} />
  );
}
