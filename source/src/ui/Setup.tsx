import { useState } from "react";
import { MODES } from "../core/board";
import type { Difficulty, GameModeId } from "../core/types";
import { game, type SeatSetup, type SetupConfig } from "../game";
import { shell } from "../shell";
import { ChipIcon } from "./Chip";
import { SIDE_COLORS, pickColor, validColors } from "./theme";

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export function defaultSetup(mode: GameModeId, friend?: { id: string; name: string }): SetupConfig {
  const n = MODES[mode].players;
  const seats: SeatSetup[] = Array.from({ length: n }, (_, i) =>
    i === 0 ? { kind: "you", difficulty: "medium", name: "" } : { kind: "bot", difficulty: "medium", name: "" },
  );
  if (friend) seats[1] = { kind: "local", difficulty: "medium", name: friend.name, friendId: friend.id };
  return { mode, seats };
}

export const MODE_COPY: Record<GameModeId, string> = {
  h2h: "You against one opponent. First to complete two sequences wins.",
  ffa3: "Every player for themselves. The first sequence wins.",
  teams: "Two teams of two. Teammates share a color and sit opposite of each other. Two sequences win.",
  teams3v3: "Two teams of three. Teammates share a color, alternating around the table. Two sequences win.",
  teams3: "Three teams of two. Teammates share a color, alternating around the table. First to complete a sequence wins.",
};

/** Match setup: choose who's playing, then start. Shown as a pushed page. */
export function Setup({ mode, friendId }: { mode: GameModeId; friendId?: string }) {
  const d = shell();
  const { Button, Sheet } = d;
  const { account } = d.useAccount();
  const friends = d.friends();
  const preset = friendId ? friends.find((f) => f.id === friendId) : undefined;
  const [cfg, setCfg] = useState<SetupConfig>(() => {
    const c = preset ? defaultSetup(mode, preset) : game.lastSetup(mode) ?? defaultSetup(mode);
    // People playing on this device together is always casual.
    return c.seats.some((s) => s.kind === "local") ? { ...c, casual: true } : c;
  });
  const [casualNote, setCasualNote] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const m = MODES[mode];

  const colors = validColors(cfg.colors, m.sides);
  const colorOf = (side: number) => SIDE_COLORS[colors[side]];
  const pick = (side: number, color: number) => setCfg((c) => ({ ...c, colors: pickColor(validColors(c.colors, m.sides), side, color) }));
  const swaps = m.sides >= SIDE_COLORS.length;

  const update = (i: number, p: Partial<SeatSetup>) =>
    setCfg((c) => ({ ...c, seats: c.seats.map((s, k) => (k === i ? { ...s, ...p } : s)) }));

  const valid = cfg.seats.every((s) => s.kind !== "local" || s.name.trim().length >= 1);
  const forfeitWarn = game.startWouldForfeit();
  const groups = m.teams
    ? Array.from({ length: m.sides }, (_, side) => ({ side, idx: cfg.seats.map((_, i) => i).filter((i) => i % m.sides === side) }))
    : [{ side: -1, idx: cfg.seats.map((_, i) => i) }];

  const seatRow = (i: number) => {
    const s = cfg.seats[i];
    const side = i % m.sides;
    const c = colorOf(side);
    return (
      <div key={i} className="card rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <ChipIcon color={c} size={36} mark={0.39} stroke={2} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-white">
              {s.kind === "you" ? account?.name || "You" : s.kind === "bot" ? "Computer" : s.name || "Player on this device"}
            </div>
            <div className="text-xs text-white/60">
              {s.kind === "you" ? "You" : s.kind === "bot" ? (cfg.casual ? DIFFS.find((x) => x.id === s.difficulty)!.label : "Computer player") : "Plays on this device"}
            </div>
          </div>
        </div>
        {!m.teams && <ColorPicker colors={colors} side={side} swaps={swaps} onPick={(c) => pick(side, c)} />}
        {s.kind !== "you" && (
          <div className="mt-3 space-y-2">
            <Segmented
              value={s.kind}
              options={[
                { id: "bot", label: "Computer" },
                { id: "local", label: "On this device" },
              ]}
              onChange={(k) => {
                if (k === "local" && !cfg.casual) {
                  setCfg((c) => ({ ...c, casual: true }));
                  setCasualNote(true);
                }
                update(i, { kind: k as SeatSetup["kind"] });
              }}
            />
            {s.kind === "bot" ? (
              cfg.casual ? <Segmented small value={s.difficulty} options={DIFFS} onChange={(v) => update(i, { difficulty: v as Difficulty })} /> : null
            ) : (
              <div className="flex gap-2">
                <input
                  value={s.name}
                  onChange={(e) => update(i, { name: e.target.value.slice(0, 14), friendId: undefined })}
                  placeholder="Their name"
                  aria-label={`Player ${i + 1} name`}
                  className="field h-10 min-w-0 flex-1 rounded-xl px-3 text-[15px] font-semibold"
                />
                {friends.length > 0 && (
                  <button onClick={() => setPicking(i)} className="h-10 shrink-0 rounded-xl bg-white/[.07] px-3 text-[13px] font-bold text-white">
                    {s.friendId ? "Friend ✓" : "Pick friend"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const casual = !!cfg.casual;
  return (
    <div>
      <div className="mb-5">
        <Segmented
          value={casual ? "casual" : "ranked"}
          options={[
            { id: "ranked", label: "Ranked" },
            { id: "casual", label: "Casual" },
          ]}
          onChange={(v) => {
            setCasualNote(false);
            setCfg((c) =>
              v === "casual"
                ? { ...c, casual: true }
                : { ...c, casual: false, seats: c.seats.map((s) => (s.kind === "local" ? { ...s, kind: "bot", name: "", friendId: undefined } : s)) },
            );
          }}
        />
        <p className="mt-2 px-1 text-[13px] leading-snug text-white/70">
          {casualNote
            ? "Playing with someone on this device is always casual. Doesn't count toward your ranks, stats, streaks, XP or achievements."
            : casual
            ? "Just for fun. Doesn't count toward your ranks, stats, streaks, XP or achievements."
            : "Counts toward your ranks, stats, streaks, XP and achievements."}
        </p>
      </div>
      {swaps && <p className="-mt-2 mb-3 px-1 text-[12px] leading-snug text-white/60">All three colors are in play, so picking one another {m.teams ? "team" : "player"} has swaps your colors.</p>}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.side} className="space-y-2">
            {g.side >= 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="font-display text-[18px] text-white">Team {colorOf(g.side).name.toLowerCase()}</span>
                <ColorPicker colors={colors} side={g.side} swaps={swaps} onPick={(c) => pick(g.side, c)} compact />
              </div>
            )}
            {g.idx.map(seatRow)}
          </div>
        ))}
      </div>

      <div className="lu-label mb-2 mt-6">Online</div>
      <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5 opacity-80">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.08] text-xl" aria-hidden>
          {"\u{1F310}"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-white">
            Invite friends online
            <span className="lu-pill lu-badge !text-[9px]">Coming soon</span>
          </div>
          <div className="text-[13px] leading-snug text-white/65">Online play needs a server, so it isn't on in this preview. Play friends on this device instead.</div>
        </div>
      </div>

      {forfeitWarn && (
        <p className="mt-5 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] leading-snug text-white/85">
          You have a match in progress. Starting a new one forfeits it, which counts as a loss.
        </p>
      )}
      <Button
        className="mt-5 w-full"
        disabled={!valid}
        onClick={() => {
          d.nav.reset();
          game.start(cfg);
        }}
      >
        Start match
      </Button>

      <Sheet open={picking !== null} onClose={() => setPicking(null)} title="Who's playing?">
        <p className="-mt-1 mb-3 text-sm text-white/70">Pick the friend who's with you. They'll play on this device.</p>
        <div className="scroll-soft -mx-3 max-h-[50vh] space-y-1.5 overflow-y-auto px-3">
          {friends.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                if (picking !== null) update(picking, { kind: "local", name: f.name.slice(0, 14), friendId: f.id });
                setPicking(null);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/[.04] px-3 py-2.5 text-left hover:bg-iris/[.12]"
            >
              <d.Avatar player={{ glyph: f.glyph, hue: f.hue, id: f.id }} size={36} />
              <span className="truncate font-bold text-white">{f.name}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, small = false }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="surface grid gap-1 rounded-2xl p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`truncate rounded-xl font-semibold transition ${small ? "h-8 text-[12px]" : "h-9 text-[13px]"} ${value === o.id ? "bg-iris text-white" : "text-white/75 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Chip color: tap a swatch. Colors other players already have are greyed
 *  out, unless every color is taken, in which case picking one swaps. */
function ColorPicker({ colors, side, swaps, onPick, compact = false }: { colors: number[]; side: number; swaps: boolean; onPick: (c: number) => void; compact?: boolean }) {
  const mine = colors[side];
  return (
    <div className={compact ? "" : "mt-3"}>
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Chip color">
        {!compact && <span className="lu-label mr-1 !text-[10px] opacity-70">Color</span>}
        {SIDE_COLORS.map((c, i) => {
          const owner = colors.indexOf(i);
          const taken = owner !== -1 && owner !== side;
          const disabled = taken && !swaps;
          const on = i === mine;
          return (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.name}${taken ? (swaps ? ", swap" : ", taken") : ""}`}
              disabled={disabled}
              onClick={() => onPick(i)}
              className="grid place-items-center rounded-full p-[3px] transition-transform active:scale-90"
              style={{ boxShadow: on ? "0 0 0 2.5px #111111" : "none", opacity: disabled ? 0.25 : on ? 1 : 0.55 }}
            >
              <ChipIcon color={c} size={compact ? 24 : 26} mark={0.42} stroke={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
