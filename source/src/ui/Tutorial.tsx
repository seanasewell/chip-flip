import { useEffect, useState, useSyncExternalStore } from "react";
import { applySideColors } from "./theme";
import { LAYOUT, cardFace, cellAt, cellsForCard, faceKey, faceLabel, isCorner } from "../core/board";
import { findNewSequences } from "../core/engine";
import { CELL_COUNT, type CardId, type CellOwner, type Move, type Sequence } from "../core/types";
import { shell, store } from "../shell";
import { sfx } from "../sfx";
import { Board, useSquare } from "./Board";
import { HandCard } from "./Cards";

// ---------------------------------------------------------------- store

let isOpen = false;
let version = 0;
const subs = new Set<() => void>();
const emit = () => {
  version++;
  subs.forEach((f) => f());
};
const doneKey = (id: string) => `lu.tutorial.${id}`;

export const tutorial = {
  open() {
    isOpen = true;
    emit();
  },
  close(accountId?: string) {
    if (accountId) store.set(doneKey(accountId), "1");
    isOpen = false;
    emit();
  },
  needed(accountId: string) {
    return store.get(doneKey(accountId)) !== "1";
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  isOpen: () => isOpen,
  version: () => version,
};

/** Shows the tutorial on first launch after onboarding, or when reopened
 *  from How to play / Settings. */
export function TutorialGate() {
  useSyncExternalStore(tutorial.subscribe, tutorial.version, tutorial.version);
  const open = tutorial.isOpen();
  const { account, onboarding } = shell().useAccount();
  if (!account || onboarding) return null;
  if (!open && !tutorial.needed(account.id)) return null;
  applySideColors();
  return <Tutorial onDone={() => tutorial.close(account.id)} />;
}

// ---------------------------------------------------------------- script

type Step = "hello" | "select" | "place" | "coach" | "wild" | "sequence" | "remove" | "removed" | "win";
const ME = 0;
const COACH = 1;
const WILD: CardId = 13 * 2 + 10; // jack of diamonds
const REMOVE: CardId = 10; // jack of spades
const cardFor = (cell: number) => [...Array(52).keys()].find((id) => faceKey(cardFace(id)) === faceKey(LAYOUT[cell]!))!;

function boardWith(mine: number[], coach: number[]): CellOwner[] {
  const b: CellOwner[] = Array(CELL_COUNT).fill(null);
  mine.forEach((c) => (b[c] = ME));
  coach.forEach((c) => (b[c] = COACH));
  return b;
}

const BASIC = cardFor(cellAt(4, 4));
const COACH_REPLY = cellAt(3, 6);
const WILD_LINE = [cellAt(5, 2), cellAt(5, 3), cellAt(5, 4), cellAt(5, 5)];
const WILD_TARGET = cellAt(5, 6);
const COACH_LINE = [cellAt(8, 2), cellAt(8, 3), cellAt(8, 4), cellAt(8, 5)];

const SCENES = {
  basics: { board: boardWith([], [cellAt(2, 7)]), hand: [BASIC, cardFor(cellAt(1, 2)), cardFor(cellAt(6, 8)), cardFor(cellAt(7, 1))] },
  wild: { board: boardWith(WILD_LINE, [cellAt(2, 7), COACH_REPLY, cellAt(4, 6), cellAt(6, 6)]), hand: [cardFor(cellAt(1, 2)), WILD, cardFor(cellAt(7, 1)), cardFor(cellAt(6, 8))] },
  remove: { hand: [cardFor(cellAt(1, 2)), REMOVE, cardFor(cellAt(7, 1)), cardFor(cellAt(6, 8))] },
};

const COPY: Record<Step, { title: string; body: string }> = {
  hello: { title: "Welcome to Chip Flip", body: "Play cards, claim spaces and line up five. Here's a one-minute warm-up on the real board." },
  select: { title: "Pick a card", body: `Every card is printed on two spaces. Tap the ${faceLabel(cardFace(BASIC))} in your hand.` },
  place: { title: "Claim a space", body: "Both of its spaces light up. Tap either one to place your chip." },
  coach: { title: "Take turns", body: "Opponents claim spaces with their cards too. After every play you draw a new card." },
  wild: { title: "Two-eyed jacks are wild", body: "You have four in a row. Use the wild jack to place a chip at the end and finish the line." },
  sequence: { title: "That's a sequence!", body: "Five in a straight line, across, down or diagonal. Corners are free and count for everyone." },
  remove: { title: "One-eyed jacks remove", body: "Coach has four in a row. Play the one-eyed jack and remove one of their chips." },
  removed: { title: "Line broken", body: "Removal jacks can't touch chips that are already part of a sequence." },
  win: { title: "Two sequences win", body: "In head to head and two-team games, the first to complete two sequences wins. With three players or teams, one is enough." },
};

function Tutorial({ onDone }: { onDone: () => void }) {
  const d = shell();
  const { Button } = d;
  const [step, setStep] = useState<Step>("hello");
  const [board, setBoard] = useState<CellOwner[]>(SCENES.basics.board);
  const [hand, setHand] = useState<CardId[]>(SCENES.basics.hand);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [fresh, setFresh] = useState<Sequence[]>([]);
  const [last, setLast] = useState<Move | null>(null);
  const [nudge, setNudge] = useState(0);
  const { ref, size } = useSquare(520);

  useEffect(() => {
    if (step === "wild") {
      setBoard(SCENES.wild.board);
      setHand(SCENES.wild.hand);
      setSelected(null);
      setLast(null);
    }
    if (step === "remove") {
      setBoard((b) => {
        const nb = b.slice();
        COACH_LINE.forEach((c) => (nb[c] = COACH));
        return nb;
      });
      setHand(SCENES.remove.hand);
      setSelected(null);
      setLast(null);
    }
  }, [step]);

  const interactive = step === "select" || step === "place" || step === "wild" || step === "remove";
  const wanted: CardId | null = step === "select" || step === "place" ? BASIC : step === "wild" ? WILD : step === "remove" ? REMOVE : null;
  const targets =
    selected == null
      ? []
      : selected === REMOVE
        ? COACH_LINE.filter((c) => board[c] === COACH)
        : selected === WILD
          ? board.map((o, c) => (o === null && !isCorner(c) ? c : -1)).filter((c) => c >= 0)
          : cellsForCard(selected).filter((c) => board[c] === null);

  const choose = (card: CardId) => {
    if (!interactive) return;
    if (card !== wanted) {
      sfx.invalid();
      setNudge((n) => n + 1);
      return;
    }
    sfx.select();
    setSelected(card);
    if (step === "select") setStep("place");
  };

  const tap = (cell: number) => {
    if (!interactive || selected == null || !targets.includes(cell)) {
      if (interactive) {
        sfx.invalid();
        setNudge((n) => n + 1);
      }
      return;
    }
    if (step === "wild" && cell !== WILD_TARGET) {
      sfx.invalid();
      setNudge((n) => n + 1);
      return;
    }
    const b = board.slice();
    const n = (last?.n ?? 0) + 1;
    if (selected === REMOVE) {
      b[cell] = null;
      setBoard(b);
      setLast({ seat: "you", side: ME, action: { kind: "remove", card: REMOVE, cell }, n, newSequences: 0 });
      setHand(hand.filter((c) => c !== selected));
      setSelected(null);
      sfx.remove();
      setStep("removed");
      return;
    }
    b[cell] = ME;
    setBoard(b);
    setLast({ seat: "you", side: ME, action: { kind: "place", card: selected, cell }, n, newSequences: 0 });
    setHand(hand.filter((c) => c !== selected));
    setSelected(null);
    sfx.place(ME);
    d.vibrate(14);
    if (step === "place") {
      setStep("coach");
      setTimeout(() => {
        setBoard((bb) => {
          const nb = bb.slice();
          nb[COACH_REPLY] = COACH;
          return nb;
        });
        setLast({ seat: "coach", side: COACH, action: { kind: "place", card: cardFor(COACH_REPLY), cell: COACH_REPLY }, n: n + 1, newSequences: 0 });
        setHand((h) => [...h, cardFor(cellAt(3, 8))]);
        sfx.place(COACH);
      }, 700);
    } else if (step === "wild") {
      const made = findNewSequences(b, [], ME, cell, "you");
      setSequences(made);
      setFresh(made);
      setTimeout(() => sfx.roundWin(), 250);
      setStep("sequence");
    }
  };

  const copy = COPY[step];
  const hint =
    nudge > 0 && interactive
      ? step === "wild"
        ? selected === WILD
          ? "Tap the open space at the end of your four teal chips."
          : "Tap the jack with two eyes (Wild)."
        : step === "remove"
          ? selected === REMOVE
            ? "Tap one of Coach's pink chips in the row."
            : "Tap the jack with one eye (Remove)."
          : step === "place"
            ? "Tap one of the glowing spaces."
            : `Tap the ${faceLabel(cardFace(BASIC))} in your hand.`
      : null;
  const next = (s: Step) => (
    <Button className="w-full" onClick={() => setStep(s)}>
      Next
    </Button>
  );

  return (
    <div className="absolute inset-0 z-[45] flex flex-col bg-stage" style={{ paddingTop: "var(--safe-top,0px)" }} role="dialog" aria-label="Tutorial">
      <div className="mx-auto flex h-full w-full max-w-[520px] flex-col px-3">
        <header className="flex items-center justify-between pb-1 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/60">Tutorial</span>
          <button onClick={onDone} className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/75 hover:bg-white/5">
            Skip
          </button>
        </header>

        <div key={step} className="card mt-1 rounded-3xl px-4 py-3 animate-fadeUp" aria-live="polite">
          <div className="font-display text-[18px] font-bold text-white">{copy.title}</div>
          <div className="mt-0.5 text-[13.5px] leading-relaxed text-white/80">{copy.body}</div>
          {hint && (
            <div key={nudge} className="mt-1.5 text-[13px] font-semibold text-amber animate-fadeIn">
              {hint}
            </div>
          )}
        </div>

        <div ref={ref} className="relative grid min-h-0 flex-1 place-items-center py-2">
          <Board
            board={board}
            size={size}
            sequences={sequences}
            fresh={fresh}
            lastMove={last}
            targets={targets}
            targetKind={selected === REMOVE ? "remove" : "place"}
            activeSide={ME}
            onTap={tap}
            spotlight={step === "wild" && selected === WILD ? [WILD_TARGET] : []}
            sideNames={["You", "Coach"]}
          />
        </div>

        <div className="shrink-0" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)" }}>
          {interactive ? (
            <div className="flex items-end justify-center gap-2 pt-5">
              {hand.map((c) => (
                <HandCard key={c} card={c} width={58} side={ME} state={selected === c ? "selected" : "available"} onPress={() => choose(c)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {step === "hello" && (
                <Button className="w-full" onClick={() => setStep("select")}>
                  Show me
                </Button>
              )}
              {step === "coach" && next("wild")}
              {step === "sequence" && next("remove")}
              {step === "removed" && next("win")}
              {step === "win" && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => {
                      onDone();
                      d.nav.push({ name: "setup", mode: "h2h" });
                    }}
                  >
                    Play a match
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={onDone}>
                    Done
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
