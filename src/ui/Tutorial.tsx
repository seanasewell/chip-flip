// First-run tutorial: a one-minute warm-up on the real board, shown on the
// Play tab right after someone signs in for the first time (or reopened
// from How to play). Ported from the web build's tutorial.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT, cardFace, cellAt, cellsForCard, faceKey, faceLabel, isCorner } from '@/core/board';
import { findNewSequences } from '@/core/engine';
import { CELL_COUNT, type CardId, type CellOwner, type Move, type Sequence } from '@/core/types';
import { kv } from '@/lib/kv';
import { Board } from './Board';
import { HandCard } from './Cards';
import { Button, Card, Display, Label, Paper, T } from './kit';
import { fadeIn, fadeUp } from './motion';
import { haptic, sfx } from './sound';
import { C, F, applySideColors, sideColor } from './theme';

// ---------------------------------------------------------------- store

let isOpen = false;
let version = 0;
const subs = new Set<() => void>();
const emit = () => {
  version++;
  subs.forEach((f) => f());
};
const doneKey = (id: string) => `cf.tutorial.${id}`;

export const tutorial = {
  /** Reopen it (How to play). */
  open() {
    isOpen = true;
    emit();
  },
  close(playerId?: string) {
    if (playerId) kv.set(doneKey(playerId), '1');
    isOpen = false;
    emit();
  },
  needed: (playerId: string) => kv.get(doneKey(playerId)) !== '1',
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
  isOpen: () => isOpen,
  version: () => version,
};

/** Shows the tutorial the first time a player reaches the tabs, or when
 *  reopened. */
export function TutorialGate({ playerId, onPlay }: { playerId: string; onPlay: () => void }) {
  useSyncExternalStore(tutorial.subscribe, tutorial.version, tutorial.version);
  if (!tutorial.isOpen() && !tutorial.needed(playerId)) return null;
  return (
    <Animated.View entering={fadeIn(250)} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Tutorial
        onDone={() => tutorial.close(playerId)}
        onPlay={() => {
          tutorial.close(playerId);
          onPlay();
        }}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------- script

type Step = 'hello' | 'select' | 'place' | 'coach' | 'wild' | 'sequence' | 'remove' | 'removed' | 'win';
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

const mine = () => sideColor(ME).name.toLowerCase();
const theirs = () => sideColor(COACH).name.toLowerCase();

const COPY: Record<Step, () => { title: string; body: string }> = {
  hello: () => ({ title: 'Welcome to Chip Flip', body: "Play cards, claim spaces and line up five. Here's a one-minute warm-up on the real board." }),
  select: () => ({ title: 'Pick a card', body: `Every card is printed on two spaces. Tap the ${faceLabel(cardFace(BASIC))} in your hand.` }),
  place: () => ({ title: 'Claim a space', body: 'Both of its spaces light up. Tap either one to place your chip.' }),
  coach: () => ({ title: 'Take turns', body: 'Opponents claim spaces with their cards too. After every play you draw a new card.' }),
  wild: () => ({ title: 'Two-eyed jacks are wild', body: `You have four ${mine()} chips in a row. Use the wild jack to place a chip at the end and finish the line.` }),
  sequence: () => ({ title: "That's a sequence!", body: 'Five in a straight line, across, down or diagonal. Corners are free and count for everyone.' }),
  remove: () => ({ title: 'One-eyed jacks remove', body: 'Coach has four in a row. Play the one-eyed jack and remove one of their chips.' }),
  removed: () => ({ title: 'Line broken', body: "Removal jacks can't touch chips that are already part of a sequence." }),
  win: () => ({ title: 'Two sequences win', body: 'In head to head and two-team games, the first to complete two sequences wins. With three players or teams, one is enough.' }),
};
const ORDER: Step[] = ['hello', 'select', 'place', 'coach', 'wild', 'sequence', 'remove', 'removed', 'win'];

function Tutorial({ onDone, onPlay }: { onDone: () => void; onPlay: () => void }) {
  applySideColors(null);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('hello');
  const [board, setBoard] = useState<CellOwner[]>(SCENES.basics.board);
  const [hand, setHand] = useState<CardId[]>(SCENES.basics.hand);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [fresh, setFresh] = useState<Sequence[]>([]);
  const [last, setLast] = useState<Move | null>(null);
  const [nudge, setNudge] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));

  const go = (s: Step) => {
    setNudge(0);
    if (s === 'wild') {
      setBoard(SCENES.wild.board);
      setHand(SCENES.wild.hand);
      setSelected(null);
      setLast(null);
    }
    if (s === 'remove') {
      setBoard((b) => {
        const nb = b.slice();
        COACH_LINE.forEach((c) => (nb[c] = COACH));
        return nb;
      });
      setHand(SCENES.remove.hand);
      setSelected(null);
      setLast(null);
      setFresh([]);
    }
    setStep(s);
  };

  const interactive = step === 'select' || step === 'place' || step === 'wild' || step === 'remove';
  const wanted: CardId | null = step === 'select' || step === 'place' ? BASIC : step === 'wild' ? WILD : step === 'remove' ? REMOVE : null;
  const targets =
    selected == null
      ? []
      : selected === REMOVE
        ? COACH_LINE.filter((c) => board[c] === COACH)
        : selected === WILD
          ? [WILD_TARGET]
          : cellsForCard(selected).filter((c) => board[c] === null && !isCorner(c));

  const wrong = () => {
    sfx.invalid();
    haptic.warning();
    setNudge((n) => n + 1);
  };

  const choose = (card: CardId) => {
    if (!interactive) return;
    if (card !== wanted) return wrong();
    sfx.select();
    haptic.tap();
    setSelected(card);
    if (step === 'select') setStep('place');
  };

  const tap = (cell: number) => {
    if (!interactive) return;
    if (selected == null || !targets.includes(cell)) return wrong();
    const b = board.slice();
    const n = (last?.n ?? 0) + 1;
    setHand(hand.filter((c) => c !== selected));
    setSelected(null);
    setNudge(0);
    if (selected === REMOVE) {
      b[cell] = null;
      setBoard(b);
      setLast({ seat: 'you', side: ME, action: { kind: 'remove', card: REMOVE, cell }, n, newSequences: 0 });
      sfx.remove();
      haptic.place();
      later(700, () => setStep('removed'));
      return;
    }
    b[cell] = ME;
    setBoard(b);
    setLast({ seat: 'you', side: ME, action: { kind: 'place', card: selected, cell }, n, newSequences: 0 });
    sfx.place(ME);
    haptic.place();
    if (step === 'place') {
      setStep('coach');
      later(800, () => {
        setBoard((bb) => {
          const nb = bb.slice();
          nb[COACH_REPLY] = COACH;
          return nb;
        });
        setLast({ seat: 'coach', side: COACH, action: { kind: 'place', card: cardFor(COACH_REPLY), cell: COACH_REPLY }, n: n + 1, newSequences: 0 });
        setHand((h) => [...h, cardFor(cellAt(3, 8))]);
        sfx.place(COACH);
      });
    } else if (step === 'wild') {
      const made = findNewSequences(b, [], ME, cell, 'you');
      setSequences(made);
      setFresh(made);
      // Let the line flip and the confetti fly before the next card.
      later(1800, () => {
        sfx.sequenceWin();
        haptic.success();
      });
      later(2600, () => setStep('sequence'));
    }
  };

  const copy = COPY[step]();
  const hint =
    nudge > 0 && interactive
      ? step === 'wild'
        ? selected === WILD
          ? `Tap the open space at the end of your four ${mine()} chips.`
          : 'Tap the jack with two eyes (Wild).'
        : step === 'remove'
          ? selected === REMOVE
            ? `Tap one of Coach's ${theirs()} chips in the row.`
            : 'Tap the jack with one eye (Remove).'
          : step === 'place'
            ? 'Tap one of the highlighted spaces.'
            : `Tap the ${faceLabel(cardFace(BASIC))} in your hand.`
      : null;

  // Largest square board that fits (border 4, the board's own shadow 5).
  const size = Math.floor(Math.max(0, Math.min(box.w - 9, box.h - 9, 520)));
  const cardW = 58;
  const at = ORDER.indexOf(step);

  return (
    <Paper>
      <View style={{ flex: 1, paddingTop: insets.top + 6, paddingHorizontal: 14, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Label style={{ fontSize: 10 }}>Tutorial</Label>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {ORDER.map((s, k) => (
                <View key={s} style={{ width: k === at ? 14 : 6, height: 6, borderRadius: 3, backgroundColor: C.ink, opacity: k <= at ? 1 : 0.2 }} />
              ))}
            </View>
          </View>
          <Pressable onPress={onDone} accessibilityRole="button" hitSlop={10} style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
            <T style={{ fontFamily: F.bodyBold, fontSize: 14, opacity: 0.7 }}>Skip</T>
          </Pressable>
        </View>

        <Animated.View key={step} entering={fadeUp(0, 350)} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
          <Card>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Display size={22}>{copy.title}</Display>
              <T style={{ marginTop: 4, fontSize: 14, lineHeight: 20, opacity: 0.85 }}>{copy.body}</T>
              {hint && (
                <Animated.View key={nudge} entering={fadeIn(200)}>
                  <T style={{ marginTop: 6, fontSize: 13.5, fontFamily: F.bodyBold, color: C.orange }}>{hint}</T>
                </Animated.View>
              )}
            </View>
          </Card>
        </Animated.View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {size > 0 && (
            <View style={{ width: size + 4 + 5 }}>
              <View style={{ borderWidth: 2, borderColor: C.ink, width: size + 4, height: size + 4 }}>
                <Board
                  board={board}
                  size={size}
                  sequences={sequences}
                  fresh={fresh}
                  lastMove={last}
                  targets={targets}
                  targetKind={selected === REMOVE ? 'remove' : 'place'}
                  activeSide={ME}
                  onTap={tap}
                  sideNames={['You', 'Coach']}
                />
              </View>
            </View>
          )}
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, 8) + 12, minHeight: cardW * 1.4 + 30 }}>
          {interactive ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingTop: 16 }}>
              {hand.map((c) => (
                <HandCard key={c} card={c} width={cardW} state={selected === c ? 'selected' : 'available'} onPress={() => choose(c)} />
              ))}
            </View>
          ) : (
            <Animated.View key={step} entering={fadeIn(250)} style={{ gap: 10, paddingTop: 14 }}>
              {step === 'hello' && <Button title="Show me" onPress={() => go('select')} />}
              {step === 'coach' && <Button title="Next" onPress={() => go('wild')} />}
              {step === 'sequence' && <Button title="Next" onPress={() => go('remove')} />}
              {step === 'removed' && <Button title="Next" onPress={() => go('win')} />}
              {step === 'win' && (
                <>
                  <Button title="Play a match" onPress={onPlay} />
                  <Button title="Done" variant="ghost" onPress={onDone} />
                </>
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </Paper>
  );
}
