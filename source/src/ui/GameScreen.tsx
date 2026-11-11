import { useEffect, useRef, useState } from "react";
import { MODES, isRemoveJack, isWildJack } from "../core/board";
import { canSwap, currentSeatId, isDead, seatById, targetsFor, toWin } from "../core/engine";
import type { CardId, MatchState, Seat } from "../core/types";
import { game } from "../game";
import { shell } from "../shell";
import { Board, useSquare } from "./Board";
import { CardBack, HandCard, type CardState } from "./Cards";
import { useGame, useSoundSettings } from "./hooks";
import { PlayerStrip, SeatAvatar } from "./Players";
import { Results } from "./Results";
import { RulesSheet } from "./Rules";
import { applySideColors } from "./theme";
import { BlockBar, PixelIcon, RetroWindow, Smiley, Sticker } from "./retro";

export function GameScreen() {
  const g = useGame();
  if (g.view === "none" || !g.match) return null;
  applySideColors(g.match.colors);
  if (g.view === "results") return <Results />;
  return <Table />;
}

const seatLabel = (s: Seat) => (s.kind === "you" ? "You" : s.name);

function Table() {
  const g = useGame();
  const m = g.match!;
  const { ref, size } = useSquare(560, 4, 30);
  const [reveal, setReveal] = useState(false);
  const [menu, setMenu] = useState<null | "menu" | "rules" | "forfeit">(null);
  const cur = seatById(m, currentSeatId(m));
  const viewer = g.viewer ? seatById(m, g.viewer) : null;
  const humans = m.seats.filter((s) => s.kind !== "bot");
  // With one person at the device, keep their hand on screen (dimmed)
  // during computer turns so they can plan ahead.
  const handSeat = viewer ?? (humans.length === 1 ? humans[0] : null);
  const myTurn = !!viewer && viewer.id === cur.id && m.phase === "playing" && !g.busy && !g.handoff;
  const targets = myTurn && g.selected != null ? targetsFor(m, cur.id, g.selected) : [];
  const lastMove = m.moves[m.moves.length - 1] ?? null;
  const left = m.deck.length;

  return (
    <div className="app-h relative flex flex-col bg-stage">
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col px-2.5">
        <header className="flex items-center gap-2 pb-1.5 pt-2">
          <button onClick={() => setMenu("menu")} aria-label="Match menu" className="rt-icon-btn shrink-0">
            <PixelIcon name="menu" size={16} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate font-display text-[20px] text-white">{MODES[m.mode].name}</div>
            <div className="lu-label mt-0.5 !text-[9.5px] opacity-70">
              {g.config?.casual ? "Casual \u00b7 " : ""}First to {toWin(m)} {toWin(m) === 1 ? "sequence" : "sequences"}
            </div>
          </div>
          <SoundButton />
        </header>

        <div className="mt-3">
          <PlayerStrip m={m} activeId={m.phase === "playing" ? cur.id : null} />
        </div>

        <div className="h-2" />

        <div ref={ref} className="relative grid min-h-0 flex-1 place-items-center py-1">
          {size > 0 && (
          <div className="flex w-fit flex-col items-end">
          <RetroWindow
            title={<StatusLine m={m} cur={cur} myTurn={myTurn} selected={g.selected} thinking={g.thinking} handoff={!!g.handoff} />}
            meta={`${left} ${left === 1 ? "card" : "cards"} left`}
            className="w-fit"
          >
          <Board
            board={m.board}
            size={size}
            sequences={m.sequences}
            fresh={g.fresh}
            lastMove={lastMove}
            targets={targets}
            targetKind={g.selected != null && isRemoveJack(g.selected) ? "remove" : "place"}
            activeSide={cur.side}
            onTap={(c) => game.tapCell(c)}
            sideNames={m.sides.map((s) => s.name)}
            reveal={reveal}
          />
          </RetroWindow>
          </div>
          )}
        </div>

        <HandArea m={m} seat={handSeat} myTurn={myTurn} selected={g.selected} reveal={reveal} onReveal={() => setReveal((v) => !v)} />
      </div>

      {g.view === "intro" && <Intro m={m} />}
      {g.handoff && <Handoff seat={seatById(m, g.handoff)} />}
      <Hint />
      <MatchMenu which={menu} set={setMenu} />
    </div>
  );
}

function SoundButton() {
  const s = useSoundSettings();
  const on = s.sound || s.music;
  const toggle = () => {
    // One switch for everything: music and sound effects together.
    s.setMusic(!on);
    s.setSound(!on);
  };
  return (
    <button onClick={toggle} aria-label={on ? "Mute music and sound effects" : "Turn on music and sound effects"} className="rt-icon-btn shrink-0">
      <PixelIcon name={on ? "sound" : "mute"} size={18} />
    </button>
  );
}

/** Turn status, shown in the board's title bar. */
function StatusLine({ m, cur, myTurn, selected, thinking, handoff }: { m: MatchState; cur: Seat; myTurn: boolean; selected: CardId | null; thinking: string | null; handoff: boolean }) {
  let text: React.ReactNode;
  let action: React.ReactNode = null;
  const turn = cur.kind === "you" ? "Your turn" : `${seatLabel(cur)}'s turn`;
  if (m.phase !== "playing") text = "Game over";
  else if (handoff) text = turn;
  else if (myTurn) {
    if (selected == null) text = `${turn} \u00b7 pick a card`;
    else if (isWildJack(selected)) text = "Wild jack: play any open space";
    else if (isRemoveJack(selected)) text = "One-eyed jack: remove a chip";
    else if (isDead(m, selected)) {
      text = "Dead card";
      action = canSwap(m, cur.id, selected) ? (
        <button onClick={() => game.swapDead()} className="ml-2 border-[1.5px] border-[#111111] bg-[#EA5B0C] px-1.5 py-px text-[#FFFDF6]">
          Swap it
        </button>
      ) : null;
    } else text = turn;
  } else if (thinking) text = <span className="rt-cursor">{cur.name} is thinking</span>;
  else text = turn;
  return (
    <span key={`${cur.id}-${m.phase}-${selected ?? ""}`} className="flex min-w-0 items-center animate-fadeIn" aria-live="polite">
      <span className="truncate">{text}</span>
      {action}
    </span>
  );
}

function HandArea({ m, seat, myTurn, selected, reveal, onReveal }: { m: MatchState; seat: Seat | null; myTurn: boolean; selected: CardId | null; reveal: boolean; onReveal: () => void }) {
  const [w, setW] = useState(360);
  useEffect(() => {
    const f = () => setW(Math.min(560, window.innerWidth));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const n = MODES[m.mode].hand;
  const gap = 6;
  const cardW = Math.floor(Math.max(40, Math.min(64, (w - 24 - gap * (n - 1)) / n)));
  const hand = seat ? m.hands[seat.id] ?? [] : [];

  // The card drawn since this player's last turn deals in when their turn
  // starts, and wears a "New" tag for the rest of the turn.
  const seen = useRef<Record<string, CardId[]>>({});
  const [fresh, setFresh] = useState<{ seat: string; cards: CardId[]; key: number } | null>(null);
  useEffect(() => {
    if (!seat || !myTurn) return;
    const now = m.hands[seat.id] ?? [];
    const before = seen.current[seat.id];
    if (before) {
      const added = now.filter((c) => !before.includes(c));
      if (added.length) setFresh({ seat: seat.id, cards: added, key: Date.now() });
    }
    seen.current[seat.id] = now;
  }, [seat?.id, myTurn, m.hands]);
  const isFresh = (c: CardId) => !!seat && myTurn && fresh?.seat === seat.id && fresh.cards.includes(c);

  return (
    <div className="relative shrink-0" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 6px)" }}>
      <div className="flex items-end justify-center pt-4" style={{ gap, minHeight: cardW * 1.4 + 22 }}>
        {seat
          ? hand.map((card) => {
              const state: CardState = !myTurn ? "disabled" : selected === card ? "selected" : isDead(m, card) ? "dead" : "available";
              const nu = isFresh(card);
              return (
                <span key={nu ? `${card}-${fresh!.key}` : card} className={`relative block ${nu ? "lu-newcard" : ""}`}>
                  <HandCard card={card} width={cardW} state={state} side={seat.side} onPress={() => game.selectCard(card)} />
                  {nu && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -top-2.5 z-10 flex justify-center"
                      style={{ transform: state === "selected" ? `translateY(-${Math.round(cardW * 1.4 * 0.14)}px)` : undefined, transition: "transform 140ms cubic-bezier(.2,.9,.3,1.2)" }}
                    >
                      <span className="lu-pill lu-badge lu-newtag !px-1.5 !py-0 !text-[8.5px]">
                      New
                      </span>
                    </span>
                  )}
                </span>
              );
            })
          : Array.from({ length: n }, (_, i) => <CardBack key={i} width={cardW} />)}
      </div>
      {!seat && <div className="lu-label mt-1.5 text-center !text-[9.5px] opacity-60">Cards are hidden between turns</div>}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={onReveal}
          aria-pressed={reveal}
          className={`flex h-9 items-center gap-2 border-2 border-[#111111] px-3 text-[13px] font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px] ${reveal ? "bg-[#111111] text-[#FFFDF6]" : "bg-[#FFFDF6] text-[#111111]"}`}
          style={{ boxShadow: "3px 3px 0 #111111" }}
        >
          <PixelIcon name="eye" size={18} />
          View board
        </button>
      </div>
    </div>
  );
}

function Intro({ m }: { m: MatchState }) {
  const [pct, setPct] = useState(0.1);
  useEffect(() => {
    const steps: [number, number][] = [[350, 0.28], [1100, 0.52], [1900, 0.74], [2600, 0.9], [3050, 1]];
    const ts = steps.map(([t, v]) => setTimeout(() => setPct(v), t));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[#111111]/40 px-5" style={{ paddingTop: "var(--safe-top,0px)" }}>
      <div className="card w-full max-w-[360px] p-4 animate-pop">
        <div className="mt-1 flex flex-wrap items-start justify-center gap-3">
          {m.seats.map((s) => (
            <div key={s.id} className="flex w-[72px] flex-col items-center gap-1.5">
              <SeatAvatar seat={s} size={48} />
              <div className="w-full truncate text-center text-[12px] font-bold text-white">{seatLabel(s)}</div>
              {s.kind === "bot" && !m.rated && <span className="lu-pill lu-badge -mt-1 !text-[8.5px]">{s.difficulty}</span>}
            </div>
          ))}
        </div>
        <div className="lu-label mt-4 flex items-center gap-2">
          <span className="lu-spin inline-block"><PixelIcon name="hourglass" size={13} /></span>
          <span className="flex-1">Shuffling 104 cards</span>
          <span className="tabular">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-2">
          <BlockBar pct={pct} />
        </div>
        <div className="mt-3 text-center text-[12px] text-white/70">
          First to {toWin(m)} {toWin(m) === 1 ? "sequence" : "sequences"} wins
        </div>
      </div>
    </div>
  );
}

function Handoff({ seat }: { seat: Seat }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-center overflow-hidden bg-[#111111] px-7" style={{ paddingTop: "var(--safe-top,0px)", backgroundImage: "linear-gradient(rgba(255,253,246,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,253,246,.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
      <div className="mx-auto w-full max-w-[360px] animate-fadeUp">
        <div className="lu-label !text-[#FFFDF6]/80">(Pass) Cards stay hidden</div>
        <div className="mt-3 font-display text-[58px] leading-[0.9] text-[#FFFDF6]">
          <span className="text-[#3355FF]">Pass the</span>
          <br />
          <span className="pl-8 text-[#FF2E93]">device</span>
          <br />
          <span className="text-[#EA5B0C]">to {seat.name}</span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <SeatAvatar seat={seat} size={44} active />
          <p className="text-[13px] leading-snug text-[#FFFDF6]/75">Hand it over. {seat.name}'s cards stay hidden until they tap below.</p>
        </div>
        <button onClick={() => game.reveal()} className="lu-btn lu-btn-primary mt-6 flex h-12 w-full items-center justify-center px-5 text-[15px]" style={{ boxShadow: "4px 4px 0 #FF2E93" }}>
          I'm {seat.name}, show my cards
        </button>
      </div>
      <div className="absolute bottom-[calc(var(--safe-bottom,0px)+28px)] right-6">
        <Sticker size={64} bg="#EA5B0C" shadow="#FF2E93" rotate={10}>
          <Smiley size={36} color="#111111" />
        </Sticker>
      </div>
    </div>
  );
}

function Hint() {
  const g = useGame();
  const h = g.hint;
  useEffect(() => {
    if (!h) return;
    const t = setTimeout(() => game.dismissHint(), 2200);
    return () => clearTimeout(t);
  }, [h?.id]);
  if (!h) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-6" style={{ top: "calc(var(--safe-top, 0px) + 54px)" }}>
      <div key={h.id} role="status" className="lu-toast lu-toast-warn flex w-full max-w-[320px] items-center gap-2.5 px-3.5 py-2.5 text-[13px] animate-pop">
        <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FFFDF6] text-[13px] font-bold text-[#EA5B0C]">!</span>
        {h.text}
      </div>
    </div>
  );
}

function MatchMenu({ which, set }: { which: null | "menu" | "rules" | "forfeit"; set: (v: null | "menu" | "rules" | "forfeit") => void }) {
  const casual = !!game.get().config?.casual;
  const { Sheet, Button, Toggle } = shell();
  const s = useSoundSettings();
  const row = "surface flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold text-white";
  return (
    <>
      <Sheet open={which === "menu"} onClose={() => set(null)} title="Match menu">
        <div className="space-y-2">
          <button className={row} onClick={() => set("rules")}>
            <span>
              <span aria-hidden className="mr-2">{"\u{1F4D6}"}</span>How to play
            </span>
            <span className="text-white/60">{"›"}</span>
          </button>
          <div className={row}>
            <span>
              <span aria-hidden className="mr-2">{"\u{1F50A}"}</span>Sound effects
            </span>
            <Toggle on={s.sound} onChange={s.setSound} label="Sound effects" />
          </div>
          <div className={row}>
            <span>
              <span aria-hidden className="mr-2">{"\u{1F3B5}"}</span>Music
            </span>
            <Toggle on={s.music} onChange={s.setMusic} label="Music" />
          </div>
          <button
            className={row}
            onClick={() => {
              set(null);
              game.leave();
            }}
          >
            <span>
              <span aria-hidden className="mr-2">{"\u{1F6AA}"}</span>Leave match
              <span className="block pl-7 text-xs font-normal text-white/60">Saved. Resume it from Play.</span>
            </span>
            <span className="text-white/60">{"›"}</span>
          </button>
          <button className={`${row} !text-[#E11D2E]`} onClick={() => set("forfeit")}>
            <span>
              <span aria-hidden className="mr-2">{"\u{1F3F3}️"}</span>Forfeit match
              <span className="block pl-7 text-xs font-normal text-white/60">{casual ? "Ends the match" : "Counts as a loss"}</span>
            </span>
          </button>
        </div>
      </Sheet>
      <Sheet open={which === "rules"} onClose={() => set(null)} title="How to play" tall>
        <RulesSheet onClose={() => set(null)} />
      </Sheet>
      <Sheet open={which === "forfeit"} onClose={() => set(null)} title="Forfeit this match?">
        <p className="text-sm leading-relaxed text-white/80">{casual ? "The match ends now. It's a casual match, so nothing is recorded." : "The match ends now and counts as a loss. You won't earn XP for it."}</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="ghost" onClick={() => set(null)}>
            Keep playing
          </Button>
          <button
            onClick={() => {
              set(null);
              game.forfeit();
            }}
            className="lu-btn lu-btn-danger h-12 rounded-2xl"
          >
            Forfeit
          </button>
        </div>
      </Sheet>
    </>
  );
}
