import { MODES } from "../core/board";
import type { GameModeId } from "../core/types";
import { game } from "../game";
import { shell } from "../shell";
import { ChipIcon } from "./Chip";
import { useGame } from "./hooks";
import { MODE_COPY } from "./Setup";
import { applySideColors, sideColor } from "./theme";
import { Marquee, PixelIcon, RetroWindow } from "./retro";

function Dots({ n, sides }: { n: number; sides: number }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const side = i % sides;
        const c = sideColor(side);
        return (
          <ChipIcon key={i} color={c} size={20} mark={0.45} />
        );
      })}
    </span>
  );
}

const open = (mode: GameModeId) => shell().nav.push({ name: "setup", mode });

/** Play tab: rule ribbons, resume card and game modes. */
export function HomeModes() {
  useGame(); // re-render when a match is saved or cleared
  applySideColors();
  const resume = game.resumable();
  const others: GameModeId[] = ["ffa3", "teams", "teams3v3", "teams3"];
  return (
    <div className="space-y-4">
      <div className="lu-ribbons relative -mx-3 h-[134px] overflow-hidden">
        <div className="absolute inset-x-[-12px] top-[72px]">
          <Marquee items={["One-eyed jacks remove", "Two-eyed jacks are wild", "Corners are free spaces"]} color="#FF2E93" tilt={3.5} reverse />
        </div>
        <div className="absolute inset-x-[-12px] top-[16px]">
          <Marquee items={["Play a card", "Claim its space", "Five in a row", "Flip your chips"]} tilt={-3} />
        </div>
      </div>

      {resume && (
        <RetroWindow title="Saved game">
          <button onClick={() => game.resume()} className="flex w-full items-center gap-3 p-3.5 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-[#111111] bg-[#39FF6A] text-[#111111]">
              <PixelIcon name="floppy" size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[20px] text-white">Resume match</span>
              <span className="mt-0.5 block truncate text-[12px] text-white/70">
                {MODES[resume.mode].name} {"\u00b7"} Sequences{" "}
                {resume.score.length === 2
                  ? `${resume.score[resume.youSide]}\u2013${resume.score[1 - resume.youSide]}`
                  : resume.score.join("\u2013")}
              </span>
            </span>
            <span className="lu-btn lu-btn-primary grid h-10 shrink-0 place-items-center px-3 text-[13px]">Resume</span>
          </button>
        </RetroWindow>
      )}

      <div className="card divide-y-2 divide-[#111111]">
        <ModeRow id="h2h" badge="Most popular" />
        {others.map((id, i) => (
          <ModeRow key={id} id={id} delay={(i + 1) * 50} />
        ))}
      </div>
    </div>
  );
}

/** One game mode: name, rules line, chip colors and an arrow. */
function ModeRow({ id, delay = 0, badge }: { id: GameModeId; delay?: number; badge?: string }) {
  return (
    <button onClick={() => open(id)} className="flex w-full items-center gap-3 p-3.5 text-left animate-fadeUp" style={{ animationDelay: `${delay}ms` }} aria-label={`${MODES[id].name}. ${MODE_COPY[id]}`}>
      <span className="min-w-0 flex-1">
        {badge && <span className="lu-pill lu-badge mb-1.5 !text-[9px]">{badge}</span>}
        <span className="block font-display text-[19px] text-[#111111]">{MODES[id].name}</span>
        <span className="mt-1 block text-[13.5px] leading-snug text-white/75">{MODE_COPY[id]}</span>
        <span className="mt-2 flex items-center gap-2">
          <Dots n={MODES[id].players} sides={MODES[id].sides} />
        </span>
      </span>
      <span className="lu-arrow" aria-hidden>
        <PixelIcon name="arrow" size={16} />
      </span>
    </button>
  );
}
