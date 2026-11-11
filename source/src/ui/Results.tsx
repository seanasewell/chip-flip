import { useEffect, useState } from "react";
import { MODES } from "../core/board";
import { seatById, sequenceCount, toWin } from "../core/engine";
import type { Seat } from "../core/types";
import { game } from "../game";
import { shell } from "../shell";
import { useGame } from "./hooks";
import { Pips, SeatAvatar } from "./Players";
import { sideColor } from "./theme";

export function Results() {
  const g = useGame();
  const m = g.match!;
  const d = shell();
  const prog = d.useProgress();
  // Snapshot of what this match earned, taken before the celebration
  // overlay consumes it.
  const [earned] = useState(() => prog.pending as null | { xpFrom: number; xpTo: number; achievements: { emoji: string; name: string; xp: number }[]; challenges: { emoji: string; name: string; xp: number }[] });
  const casual = !!g.config?.casual;
  useEffect(() => {
    if (casual) return;
    const t = setTimeout(() => d.celebrate(() => {}), 1300);
    return () => clearTimeout(t);
  }, [m.id]);

  const you = m.seats.find((s) => s.kind === "you")!;
  const winSide = m.sides[m.winnerSide!];
  const won = winSide.index === you.side;
  const teams = MODES[m.mode].teams;
  const winners = winSide.seats.map((id) => seatById(m, id));
  const forfeited = m.forfeitedBy ? seatById(m, m.forfeitedBy) : null;
  const title = forfeited?.kind === "you"
    ? `${teams ? winSide.name : winners[0].name} wins by forfeit`
    : won
      ? teams
        ? `${winSide.name} won the match!`
        : "You won the match!"
      : teams
        ? `${winSide.name} won the match`
        : `${winners[0].name} won the match`;
  const seq = (i: number) => sequenceCount(m, i);
  const standings = m.sides.slice().sort((a, b) => (a.index === winSide.index ? -1 : b.index === winSide.index ? 1 : seq(b.index) - seq(a.index)));
  const xp = earned ? earned.xpTo - earned.xpFrom : 0;
  const { Confetti, Button } = d;
  const score = m.sides.length === 2 ? `${seq(you.side)}–${seq(1 - you.side)}` : null;

  return (
    <div className="app-h relative flex flex-col overflow-hidden bg-final">
      {won && <Confetti big />}
      {/* Only the results scroll; the actions are a fixed panel underneath. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-soft">
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-3 pb-6 pt-6">
        <div className="relative pt-4 text-center animate-fadeUp">
          <div className="relative mx-auto mt-6 w-fit">
            <div className="absolute -inset-5 rounded-full blur-2xl animate-glow" style={{ background: `${sideColor(winSide.index).base}40` }} />
            <div className="relative flex -space-x-3 animate-pop">
              {winners.map((s) => (
                <SeatAvatar key={s.id} seat={s} size={teams ? 76 : 96} badge={false} />
              ))}
            </div>
            <div className="absolute -top-[26px] left-1/2 -translate-x-1/2 text-[42px] leading-none" aria-hidden>
              {"\u{1F451}"}
            </div>
          </div>
          <h1 className="mt-6 font-display text-3xl font-extrabold text-white">{title}</h1>
          {forfeited && <p className="mt-1 text-sm text-white/70">{casual ? "You forfeited this casual match." : "You forfeited this match. It counts as a loss."}</p>}
          {m.ending === "stalemate" && <p className="mt-1 text-sm text-white/70">No one could play, so the most sequences (then the longest line) took it.</p>}
          {score && (
            <div className="mt-3 flex items-center justify-center gap-2 font-display text-5xl font-extrabold leading-none tabular text-white">
              <span style={{ color: sideColor(you.side).base }}>{score.split("–")[0]}</span>
              <span aria-hidden className="inline-block h-[5px] w-5 bg-[#111111]" />
              <span style={{ color: sideColor(1 - you.side).base }}>{score.split("–")[1]}</span>
            </div>
          )}
        </div>

        <div className="relative mt-6 flex justify-center">
          {casual ? (
            <div className="card w-fit px-4 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[.06em] text-white/65">Casual match</div>
              <div className="mt-0.5 text-[13px] text-white/80">Not counted toward ranks or stats</div>
            </div>
          ) : (
            <Tile label="XP earned" value={`+${xp}`} accent="text-sky" />
          )}
        </div>

        <div className="mt-5">
          <div className="space-y-1.5">
            {standings.map((s, i) => {
              const seats = s.seats.map((id) => seatById(m, id));
              const isWinner = s.index === winSide.index;
              return (
                <div
                  key={s.index}
                  className="flex items-center gap-3 border-2 border-[#111111] bg-[#FFFFFF] px-3 py-2 animate-fadeUp"
                  style={{ animationDelay: `${200 + i * 70}ms` }}
                >
                  <div className="flex -space-x-2">
                    {seats.map((x) => (
                      <SeatAvatar key={x.id} seat={x} size={26} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                    {teams ? `${s.name} · ${seats.map(nameOf).join(" & ")}` : nameOf(seats[0])}
                  </div>
                  {isWinner && <span className="text-[12px] font-bold text-[#0E9F55]">Winner</span>}
                  <Pips count={seq(s.index)} total={toWin(m)} side={s.index} size={7} />
                </div>
              );
            })}
          </div>
        </div>


        {!casual && earned && (earned.achievements.length > 0 || earned.challenges.length > 0) && (
          <div className="mt-5">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white/65">Unlocked</div>
            <div className="space-y-1.5">
              {[...earned.achievements, ...earned.challenges].map((a, i) => (
                <div key={i} className="card flex items-center gap-3 rounded-2xl px-3 py-2.5 animate-fadeUp" style={{ animationDelay: `${400 + i * 90}ms` }}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint/15 text-lg" aria-hidden>
                    {a.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{a.name}</span>
                  <span className="text-xs font-bold text-amber">+{a.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      </div>
      <div className="relative z-20 shrink-0 border-t-2 border-[#111111] bg-ink-850">
          <div className="mx-auto max-w-[480px] space-y-2.5 px-3 pt-3.5" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)" }}>
            {won && !m.forfeitedBy && (
              <Button
                variant="gold"
                className="w-full"
                onClick={() => d.share(`I just won a ${MODES[m.mode].name.toLowerCase()} match of Chip Flip${score ? ` ${score}` : ""} \u{1F3C6} Think you can flip more chips than me?`)}
              >
                Share your win
              </Button>
            )}
            <Button className="w-full" onClick={() => game.playAgain()}>
              Play again
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => game.exit()}>
              Back to Play
            </Button>
          </div>
      </div>
    </div>
  );
}

const nameOf = (s: Seat) => (s.kind === "you" ? "You" : s.name);

function Tile({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card w-fit px-4 py-3 text-center">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[.06em] text-white/65">{label}</div>
      <div className={`mt-0.5 font-display text-xl font-bold leading-tight ${accent}`}>{value}</div>
    </div>
  );
}
