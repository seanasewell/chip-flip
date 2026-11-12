import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODES, cellLabel, isRemoveJack, isWildJack } from '@/core/board';
import { canSwap, currentSeatId, isDead, seatById, targetsFor, toWin } from '@/core/engine';
import type { CardId, MatchState, Seat } from '@/core/types';
import { game, useGame } from '@/lib/game';
import { Board } from './Board';
import { TileFace } from './Cards';
import { ChipIcon } from './Chip';
import { CardBack, HandCard, type CardState } from './Cards';
import { Icon } from './icons';
import { Badge, Button, Card, Display, IconButton, Label, Paper, Row, Sheet, T, Toggle } from './kit';
import { PlayerStrip, SeatAvatar } from './Players';
import { Spin, dealIn, fadeIn, fadeOut, fadeUp, pop } from './motion';
import { Results } from './Results';
import { RulesList } from './Rules';
import { musicEnabled, onSoundChange, setMusicEnabled, setSoundEnabled, soundEnabled } from './sound';
import { C, F, applySideColors, sideColor } from './theme';

export function useSoundSettings() {
  const sound = useSyncExternalStore(onSoundChange, soundEnabled, soundEnabled);
  const music = useSyncExternalStore(onSoundChange, musicEnabled, musicEnabled);
  return { sound, music, setSound: setSoundEnabled, setMusic: setMusicEnabled };
}

export function GameScreen() {
  const g = useGame();
  if (g.view === 'none' || !g.match) return null;
  applySideColors(g.match.colors);
  if (g.view === 'results') return <Results />;
  return <Table />;
}

const seatLabel = (s: Seat) => (s.kind === 'you' ? 'You' : s.name);

function Table() {
  const g = useGame();
  const m = g.match!;
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [reveal, setReveal] = useState(false);
  const [menu, setMenu] = useState<null | 'menu' | 'rules' | 'forfeit'>(null);
  const cur = seatById(m, currentSeatId(m));
  const viewer = g.viewer ? seatById(m, g.viewer) : null;
  const humans = m.seats.filter((s) => s.kind !== 'bot');
  // With one person at the device, keep their hand on screen (dimmed)
  // during computer turns so they can plan ahead.
  const handSeat = viewer ?? (humans.length === 1 ? humans[0] : null);
  const myTurn = !!viewer && viewer.id === cur.id && m.phase === 'playing' && !g.busy && !g.handoff;
  const targets = myTurn && g.selected != null ? targetsFor(m, cur.id, g.selected) : [];
  const lastMove = m.moves[m.moves.length - 1] ?? null;
  const left = m.deck.length;
  // Largest square board that fits (title bar 26, shadow 5, borders 4).
  const size = Math.floor(Math.max(0, Math.min(box.w - 13, box.h - 26 - 13, 560)));

  return (
    <Paper>
      <View style={{ flex: 1, paddingTop: insets.top + 4, paddingHorizontal: 10, maxWidth: 580, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <IconButton name="menu" onPress={() => setMenu('menu')} label="Match menu" />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Display size={20}>{MODES[m.mode].name}</Display>
            <Label style={{ fontSize: 9, opacity: 0.7 }}>
              {g.config?.casual ? 'Casual · ' : ''}First to {toWin(m)} {toWin(m) === 1 ? 'sequence' : 'sequences'}
            </Label>
          </View>
          <SoundButton />
        </View>

        <View style={{ marginTop: 8 }}>
          <PlayerStrip m={m} activeId={m.phase === 'playing' ? cur.id : null} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {size > 0 && (
            <View style={{ width: size + 4 + 5 }}>
              <View style={{ borderWidth: 2, borderColor: C.ink, borderBottomWidth: 0, backgroundColor: C.paper, height: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8, marginRight: 5 }}>
                <StatusLine m={m} cur={cur} myTurn={myTurn} selected={g.selected} thinking={g.thinking} handoff={!!g.handoff} />
                <Label style={{ fontSize: 9, opacity: 0.75 }}>
                  {left} {left === 1 ? 'card' : 'cards'} left
                </Label>
              </View>
              <View style={{ borderWidth: 2, borderColor: C.ink, width: size + 4, height: size + 4 }}>
                <Board
                  board={m.board}
                  size={size}
                  sequences={m.sequences}
                  fresh={g.fresh}
                  lastMove={lastMove}
                  targets={targets}
                  targetKind={g.selected != null && isRemoveJack(g.selected) ? 'remove' : 'place'}
                  activeSide={cur.side}
                  onTap={(c) => game.tapCell(c)}
                  sideNames={m.sides.map((s) => s.name)}
                  reveal={reveal}
                />
              </View>
            </View>
          )}
        </View>

        <LastPlay m={m} />

        <HandArea m={m} seat={handSeat} myTurn={myTurn} selected={g.selected} reveal={reveal} onReveal={() => setReveal((v) => !v)} width={Math.min(W, 580)} bottom={insets.bottom} />
      </View>

      {g.view === 'intro' && <Intro m={m} />}
      {g.handoff && <Handoff seat={seatById(m, g.handoff)} />}
      <Hint top={insets.top + 56} />
      <MatchMenu which={menu} set={setMenu} />
    </Paper>
  );
}

function SoundButton() {
  const s = useSoundSettings();
  const on = s.sound || s.music;
  return (
    <IconButton
      name={on ? 'sound' : 'mute'}
      label={on ? 'Mute music and sound effects' : 'Turn on music and sound effects'}
      onPress={() => {
        // One switch for everything: music and sound effects together.
        s.setMusic(!on);
        s.setSound(!on);
      }}
    />
  );
}

/** Turn status, shown in the board's title bar. */
function StatusLine({ m, cur, myTurn, selected, thinking, handoff }: { m: MatchState; cur: Seat; myTurn: boolean; selected: CardId | null; thinking: string | null; handoff: boolean }) {
  let text = '';
  let swap = false;
  const turn = cur.kind === 'you' ? 'Your turn' : `${seatLabel(cur)}'s turn`;
  if (m.phase !== 'playing') text = 'Game over';
  else if (handoff) text = turn;
  else if (myTurn) {
    if (selected == null) text = `${turn} · pick a card`;
    else if (isWildJack(selected)) text = 'Wild jack: any open space';
    else if (isRemoveJack(selected)) text = 'One-eyed jack: remove a chip';
    else if (isDead(m, selected)) {
      text = 'Dead card';
      swap = canSwap(m, cur.id, selected);
    } else text = turn;
  } else if (thinking) text = `${cur.name} is thinking…`;
  else text = turn;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
      <Label numberOfLines={1} style={{ flexShrink: 1, fontSize: 9.5 }}>
        {text}
      </Label>
      {swap && (
        <Pressable onPress={() => game.swapDead()} accessibilityRole="button" style={{ backgroundColor: C.orange, borderWidth: 1.5, borderColor: C.ink, paddingHorizontal: 6 }}>
          <Label style={{ fontSize: 9.5, color: C.paper }}>Swap it</Label>
        </Pressable>
      )}
    </View>
  );
}

function HandArea({ m, seat, myTurn, selected, reveal, onReveal, width, bottom }: { m: MatchState; seat: Seat | null; myTurn: boolean; selected: CardId | null; reveal: boolean; onReveal: () => void; width: number; bottom: number }) {
  const n = MODES[m.mode].hand;
  const gap = 6;
  const cardW = Math.floor(Math.max(40, Math.min(62, (width - 28 - gap * (n - 1) - 3 * n) / n)));
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
  }, [seat, myTurn, m.hands]);
  const isFresh = (c: CardId) => !!seat && myTurn && fresh?.seat === seat.id && fresh.cards.includes(c);

  return (
    <View style={{ paddingBottom: Math.max(bottom, 8) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap, paddingTop: 16, minHeight: cardW * 1.4 + 22 }}>
        {seat
          ? hand.map((card) => {
              const state: CardState = !myTurn ? 'disabled' : selected === card ? 'selected' : isDead(m, card) ? 'dead' : 'available';
              const nu = isFresh(card);
              return (
                <Animated.View key={nu ? `${card}-${fresh!.key}` : card} entering={nu ? dealIn : undefined}>
                  <HandCard card={card} width={cardW} state={state} dead={myTurn && isDead(m, card)} fresh={nu} onPress={() => game.selectCard(card)} />
                </Animated.View>
              );
            })
          : Array.from({ length: n }, (_, i) => <CardBack key={i} width={cardW} />)}
      </View>
      {!seat && <Label style={{ textAlign: 'center', marginTop: 6, fontSize: 9, opacity: 0.6 }}>Cards are hidden between turns</Label>}
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Pressable onPress={onReveal} accessibilityRole="button" accessibilityState={{ selected: reveal }}>
          {({ pressed }) => (
            <View style={{ paddingRight: 3, paddingBottom: 3 }}>
              <View style={{ position: 'absolute', left: 3, top: 3, right: 0, bottom: 0, backgroundColor: C.ink }} />
              <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: C.ink, backgroundColor: reveal ? C.ink : C.paper, transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [] }}>
                <Icon name="eye" size={18} color={reveal ? C.paper : C.ink} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: reveal ? C.paper : C.ink }}>View board</Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
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
    <Animated.View entering={fadeIn(150)} exiting={fadeOut(200)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,17,17,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
      <Animated.View entering={pop()} style={{ width: '100%', maxWidth: 360 }}>
        <Card>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {m.seats.map((s) => (
                <View key={s.id} style={{ width: 72, alignItems: 'center', gap: 6 }}>
                  <SeatAvatar seat={s} size={48} />
                  <T numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 12 }}>
                    {seatLabel(s)}
                  </T>
                  {s.kind === 'bot' && !m.rated && <Badge style={{ alignSelf: 'center', marginTop: -4 }}>{s.difficulty}</Badge>}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <Spin>
                <Icon name="hourglass" size={13} />
              </Spin>
              <Label style={{ flex: 1 }}>Shuffling 104 cards</Label>
              <Label>{Math.round(pct * 100)}%</Label>
            </View>
            <View style={{ height: 14, borderWidth: 2, borderColor: C.ink, marginTop: 8, backgroundColor: C.white }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: C.blue }} />
            </View>
            <T style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 12 }}>
              First to {toWin(m)} {toWin(m) === 1 ? 'sequence' : 'sequences'} wins
            </T>
          </View>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}

function Handoff({ seat }: { seat: Seat }) {
  return (
    <Animated.View entering={fadeIn()} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Paper dark style={{ justifyContent: 'center', paddingHorizontal: 28 }}>
        <Animated.View entering={fadeUp()} style={{ width: '100%', maxWidth: 360, alignSelf: 'center' }}>
          <Label style={{ color: 'rgba(255,253,246,0.8)' }}>(Pass) Cards stay hidden</Label>
          <View style={{ marginTop: 12 }}>
            <Display size={54} style={{ color: C.blue }}>Pass the</Display>
            <Display size={54} style={{ color: C.pink, paddingLeft: 30, marginTop: -14 }}>device</Display>
            <Display size={54} style={{ color: C.orange, marginTop: -14 }} numberOfLines={2}>to {seat.name}</Display>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 }}>
            <SeatAvatar seat={seat} size={44} />
            <T style={{ flex: 1, color: 'rgba(255,253,246,0.75)', fontSize: 13, lineHeight: 18 }}>Hand it over. {seat.name}&apos;s cards stay hidden until they tap below.</T>
          </View>
          <Button title={`I'm ${seat.name}, show my cards`} onPress={() => game.reveal()} style={{ marginTop: 22 }} />
        </Animated.View>
      </Paper>
    </Animated.View>
  );
}

function Hint({ top }: { top: number }) {
  const g = useGame();
  const h = g.hint;
  useEffect(() => {
    if (!h) return;
    const t = setTimeout(() => game.dismissHint(), 2200);
    return () => clearTimeout(t);
  }, [h]);
  if (!h) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', paddingHorizontal: 24 }}>
      <Animated.View key={h.id} entering={pop()} exiting={fadeOut()} style={{ width: '100%', maxWidth: 330 }}>
        <Card shadow={C.ink} offset={3} bg={C.orange}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }} accessibilityLiveRegion="assertive">
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodyBold, color: C.orange, fontSize: 13 }}>!</Text>
            </View>
            <T style={{ flex: 1, color: C.paper, fontFamily: F.bodyMed, fontSize: 13.5 }}>{h.text}</T>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}

function MatchMenu({ which, set }: { which: null | 'menu' | 'rules' | 'forfeit'; set: (v: null | 'menu' | 'rules' | 'forfeit') => void }) {
  const casual = !!game.get().config?.casual;
  const s = useSoundSettings();
  return (
    <>
      <Sheet open={which === 'menu'} onClose={() => set(null)} title="Match menu">
        <Row icon="book" title="How to play" onPress={() => set('rules')} right={<Icon name="arrow" size={16} />} />
        <Row icon="sound" title="Sound effects" right={<Toggle on={s.sound} onChange={s.setSound} label="Sound effects" />} />
        <Row icon="music" title="Music" right={<Toggle on={s.music} onChange={s.setMusic} label="Music" />} />
        <Row
          icon="door"
          title="Leave match"
          sub="Saved. Resume it from Play."
          onPress={() => {
            set(null);
            game.leave();
          }}
          right={<Icon name="arrow" size={16} />}
        />
        <Row icon="flag" title="Forfeit match" sub={casual ? 'Ends the match' : 'Counts as a loss'} danger onPress={() => set('forfeit')} />
      </Sheet>
      <Sheet open={which === 'rules'} onClose={() => set(null)} title="How to play">
        <RulesList />
      </Sheet>
      <Sheet open={which === 'forfeit'} onClose={() => set(null)} title="Forfeit this match?">
        <T style={{ fontSize: 14, lineHeight: 20, color: C.muted }}>{casual ? "The match ends now. It's a casual match, so nothing is recorded." : 'The match ends now and counts as a loss.'}</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button title="Keep playing" variant="ghost" onPress={() => set(null)} style={{ flex: 1 }} />
          <Button
            title="Forfeit"
            variant="danger"
            onPress={() => {
              set(null);
              game.forfeit();
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Sheet>
    </>
  );
}

/** Play-by-play: what happened on the last turn, with the space it was on. */
function LastPlay({ m }: { m: MatchState }) {
  const mv = [...m.moves].reverse().find((x) => x.action.kind !== 'swap') ?? null;
  const swap = m.moves[m.moves.length - 1]?.action.kind === 'swap' ? m.moves[m.moves.length - 1] : null;
  const show = swap && (!mv || swap.n > mv.n) ? swap : mv;
  const H = 46;
  if (!show) {
    return (
      <View style={{ height: H, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
        <Label style={{ fontSize: 9.5, opacity: 0.55 }}>No plays yet</Label>
      </View>
    );
  }
  const seat = seatById(m, show.seat);
  const who = seat.kind === 'you' ? 'You' : seat.name;
  const a = show.action;
  const cellOf = a.kind === 'swap' ? null : a.cell;
  const place = cellOf != null ? cellLabel(cellOf).toLowerCase() : '';
  let text: string;
  if (a.kind === 'swap') text = `${who} swapped a dead card`;
  else if (a.kind === 'remove') {
    // Whose chip came off: with two sides it's the other one.
    const victim = m.sides.length === 2 ? m.sides.find((sd) => sd.index !== show.side)! : null;
    const yours = victim ? victim.seats.includes('you') : false;
    text = `${who} removed ${yours ? 'your' : victim ? `${victim.name}'s` : 'a'} chip from the ${place}`;
  } else if (isWildJack(a.card)) text = `${who} played a wild jack on the ${place}`;
  else text = `${who} placed a chip on the ${place}`;
  if (show.newSequences > 0) text += show.newSequences > 1 ? ' and completed two sequences!' : ' and completed a sequence!';
  return (
    <Animated.View key={show.n} entering={fadeUp(0, 300)} style={{ height: H, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }} accessibilityLiveRegion="polite">
      <View style={{ width: H - 6, height: H - 6, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
        {cellOf != null ? <TileFace cell={cellOf} size={H - 10} /> : <Icon name="arrow" size={16} />}
        <View style={{ position: 'absolute', right: -6, bottom: -6 }}>
          <ChipIcon color={sideColor(show.side)} size={18} mark={0.5} />
        </View>
      </View>
      <T numberOfLines={2} style={{ flex: 1, fontSize: 13.5, lineHeight: 18 }}>
        <T style={{ fontFamily: F.bodyBold, fontSize: 13.5 }}>{who}</T>
        {text.slice(who.length)}
      </T>
    </Animated.View>
  );
}
