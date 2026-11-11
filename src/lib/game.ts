// Match controller: owns the live MatchState, runs computer turns, guards
// against double taps and stale timers, saves after every change and
// records the result exactly once. The rules themselves are in core/.
// (Same controller as the web version, with the web shell swapped for
// native storage, sound and haptics.)
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import { chooseAction, chooseBySkill } from '@/core/ai';
import { MODES, isRemoveJack, isWildJack } from '@/core/board';
import { canSwap, createMatch, currentSeatId, forfeit, play, seatById, sequenceCount, targetsFor } from '@/core/engine';
import { randomSeed } from '@/core/rng';
import type { Action, CardId, Difficulty, GameModeId, MatchState, Seat, Sequence } from '@/core/types';
import { gameMusic, haptic, sfx } from '@/ui/sound';
import { SIDE_COLORS, validColors } from '@/ui/theme';
import { kv } from './kv';
import { profile } from './profile';
import { progress, type MatchSummary } from './progress';
import { START_RATING, RATING_FLOOR, nextRating, opponentRating, ratingToSkill } from './skill';

export interface SeatSetup {
  kind: 'you' | 'bot' | 'local';
  difficulty: Difficulty;
  name: string;
}

export interface SetupConfig {
  mode: GameModeId;
  seats: SeatSetup[];
  colors?: number[];
  /** Casual matches are just for fun: nothing is recorded. */
  casual?: boolean;
}

export type View = 'none' | 'intro' | 'play' | 'results';

export interface GameState {
  view: View;
  match: MatchState | null;
  config: SetupConfig | null;
  selected: CardId | null;
  /** True while a chip is landing; input is ignored until it clears. */
  busy: boolean;
  /** Pass-and-play: seat waiting to take the device. */
  handoff: string | null;
  /** Seat whose hand is visible. */
  viewer: string | null;
  /** Sequences just completed, for the flip. */
  fresh: Sequence[];
  hint: { text: string; id: number } | null;
  thinking: string | null;
}

interface Saved {
  match: MatchState;
  config: SetupConfig;
  recorded: boolean;
  youPlaced: boolean;
  /** Time actually spent playing (not left in the background). */
  activeMs?: number;
}

// A new sequence's chips flip one by one (120ms + 220ms each, 1.1s flip),
// so the cheer waits until the last chip has landed.
export const FLIP_START = 120;
export const FLIP_STAGGER = 220;
export const FLIP_MS = 1100;
const FLIP_DONE = FLIP_START + 4 * FLIP_STAGGER + FLIP_MS + 60;
const TIMING = { intro: 3400, land: 380, bot: [700, 1200] as [number, number], seqHold: FLIP_DONE + 500, endHold: 1900 };

const MATCH_KEY = 'cf.match';
const RATING_KEY = 'cf.rating';
const setupKey = (mode: string) => `cf.setup.${mode}`;

export const BOT_NAMES = [
  'Pip', 'Juno', 'Atlas', 'Mika', 'Rook', 'Nova', 'Ziggy', 'Bramble', 'Echo', 'Fable', 'Indigo', 'Kit', 'Lumen', 'Maple', 'Nimbus',
  'Orbit', 'Pixel', 'Quill', 'Rune', 'Sable', 'Tango', 'Umber', 'Vesper', 'Wren', 'Yuki', 'Zephyr', 'Basil', 'Clover', 'Dash',
  'Ember', 'Fern', 'Gizmo', 'Halo', 'Iris', 'Jinx', 'Koda', 'Moss', 'Nico', 'Olive', 'Pepper', 'Quinn', 'Remy', 'Sage', 'Tully',
  'Vale', 'Willow', 'Yara', 'Zuri', 'Biscuit', 'Cosmo',
];

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => (reduceMotion = v)).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => (reduceMotion = v));
export const reducedMotion = () => reduceMotion;

function getRating(): number {
  const v = Number(kv.get(RATING_KEY));
  return Number.isFinite(v) && v > 0 ? v : START_RATING;
}

class GameController {
  state: GameState = blank();
  private listeners = new Set<() => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private token = 0;
  private saved: Saved | null = null;
  private hintId = 0;
  private loaded = false;

  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  get = () => this.state;

  private set(p: Partial<GameState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((f) => f());
  }

  private after(ms: number, f: () => void) {
    const tok = this.token;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (tok === this.token) f();
    }, ms);
    this.timers.add(id);
  }

  private clearTimers() {
    this.token++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  // ------------------------------------------------------------ persistence

  /** Reads a saved match once storage has loaded. */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.saved = kv.json<Saved | null>(MATCH_KEY, null);
    if (this.saved && this.saved.match?.v !== 2) this.saved = null;
    if (this.saved && this.saved.match.phase === 'over' && !this.saved.recorded) this.record();
    this.set({ ...blank() });
  }

  private persist() {
    if (this.saved) kv.set(MATCH_KEY, JSON.stringify(this.saved));
  }

  private clearSaved() {
    this.saved = null;
    kv.remove(MATCH_KEY);
  }

  /** A saved, unfinished match for the resume card. */
  resumable(): { mode: GameModeId; score: number[]; youSide: number } | null {
    const s = this.saved;
    if (!s || s.match.phase === 'over') return null;
    const you = s.match.seats.find((x) => x.kind === 'you')!;
    return { mode: s.match.mode, score: s.match.sides.map((x) => sequenceCount(s.match, x.index)), youSide: you.side };
  }

  /** True if starting a new match now would forfeit the saved one. */
  startWouldForfeit() {
    return !!this.saved && this.saved.match.phase !== 'over' && this.saved.youPlaced;
  }

  lastSetup(mode: GameModeId): SetupConfig | null {
    const c = kv.json<SetupConfig | null>(setupKey(mode), null);
    return c && c.mode === mode && c.seats?.length === MODES[mode].players ? c : null;
  }

  // ------------------------------------------------------------ lifecycle

  start(config: SetupConfig) {
    this.abandonSaved();
    kv.set(setupKey(config.mode), JSON.stringify(config));
    const ranked = !config.casual && config.seats.every((s) => s.kind !== 'local');
    if (!ranked && !config.casual) config = { ...config, casual: true };
    const me = getRating();
    // Ranked opponents come from the server's hidden rating when connected.
    const fromServer = ranked ? profile.takeOpponent() : null;
    const opp = ranked ? (fromServer?.opp ?? opponentRating(me)) : 0;
    const seats = buildSeats(config, ranked ? opp : null);
    const base = createMatch({ mode: config.mode, seats, seed: randomSeed() });
    const colors = validColors(config.colors, MODES[config.mode].sides);
    const match: MatchState = {
      ...base,
      colors,
      rated: ranked ? { me, opp } : undefined,
      sides: base.sides.map((s) => (MODES[config.mode].teams ? { ...s, name: `Team ${SIDE_COLORS[colors[s.index]].name.toLowerCase()}` } : s)),
    };
    match.id = `${Date.now().toString(36)}${match.id}`;
    this.saved = { match, config, recorded: false, youPlaced: false };
    this.persist();
    this.clearTimers();
    this.set({ ...blank(), view: 'intro', match, config });
    gameMusic.play(match.id);
    this.after(reducedMotion() ? 300 : TIMING.intro, () => this.enterPlay());
  }

  resume() {
    if (!this.saved) return;
    this.clearTimers();
    const m = this.saved.match;
    this.set({ ...blank(), view: 'play', match: m, config: this.saved.config });
    gameMusic.play(m.id);
    this.beginTurn();
  }

  private enterPlay() {
    this.set({ view: 'play' });
    this.beginTurn();
  }

  /** Back home. The match stays saved and can be resumed. */
  leave() {
    this.persist();
    this.clearTimers();
    gameMusic.stop();
    this.set({ ...blank() });
  }

  forfeit() {
    const m = this.state.match;
    if (!m || m.phase === 'over' || !this.saved) return;
    const you = m.seats.find((s) => s.kind === 'you')!;
    const done = forfeit(m, you.id);
    this.saved.match = done;
    this.clearTimers();
    this.record();
    gameMusic.stop();
    this.set({ match: done, view: 'results', handoff: null, selected: null, busy: false });
    sfx.matchLoss();
  }

  /** Leaves the results screen; the finished match is cleared. */
  exit() {
    this.clearTimers();
    gameMusic.stop();
    this.clearSaved();
    this.set({ ...blank() });
  }

  playAgain() {
    const cfg = this.state.config;
    this.clearSaved();
    if (cfg) this.start(cfg);
  }

  /** Starting something new while a match is saved forfeits it if you had
   *  already played a card, and simply discards it otherwise. */
  private abandonSaved() {
    const s = this.saved;
    if (!s || s.match.phase === 'over') return;
    if (s.youPlaced) {
      const you = s.match.seats.find((x) => x.kind === 'you')!;
      s.match = forfeit(s.match, you.id);
      this.record();
    }
    this.clearSaved();
  }

  // ------------------------------------------------------------ turns

  private replace(match: MatchState, extra: Partial<GameState> = {}) {
    if (this.saved) this.saved.match = match;
    this.persist();
    this.set({ match, ...extra });
  }

  private beginTurn() {
    const m = this.state.match;
    if (!m || m.phase !== 'playing') return;
    const id = currentSeatId(m);
    const seat = seatById(m, id);
    if (seat.kind === 'bot') {
      this.set({ thinking: id, selected: null });
      const [a, b] = TIMING.bot;
      this.after(a + Math.random() * (b - a), () => this.botMove(id));
      return;
    }
    const humans = m.seats.filter((s) => s.kind !== 'bot');
    if (humans.length > 1 && this.state.viewer !== id) {
      this.set({ handoff: id, viewer: null, thinking: null, selected: null });
    } else {
      this.set({ handoff: null, viewer: id, thinking: null, selected: null });
      sfx.turn();
    }
  }

  /** Pass-and-play: the next player confirms they have the device. */
  reveal() {
    const id = this.state.handoff;
    if (!id) return;
    this.set({ handoff: null, viewer: id });
    sfx.turn();
  }

  private botMove(id: string) {
    const m = this.state.match;
    if (!m || m.phase !== 'playing' || currentSeatId(m) !== id) return;
    const bot = seatById(m, id);
    const a = bot.skill != null ? chooseBySkill(m, id, bot.skill) : chooseAction(m, id, bot.difficulty ?? 'medium');
    if (!a) return;
    this.commit(id, a);
  }

  /** Card tap. Tapping the selected card again clears the selection. */
  selectCard(card: CardId) {
    const m = this.state.match;
    if (!this.canAct()) return;
    const id = currentSeatId(m!);
    if (!m!.hands[id].includes(card)) return;
    this.set({ selected: this.state.selected === card ? null : card });
    sfx.select();
    haptic.tap();
  }

  /** Board tap with a card selected: place (or remove with a one-eyed jack). */
  tapCell(cell: number) {
    const m = this.state.match;
    if (!m || !this.canAct()) return;
    const id = currentSeatId(m);
    const card = this.state.selected;
    if (card == null) return this.hint('Pick a card first. Its spaces light up.');
    if (!targetsFor(m, id, card).includes(cell)) {
      if (isRemoveJack(card)) return this.hint("Tap an opponent's chip that isn't in a sequence.");
      return this.hint(m.board[cell] !== null ? 'That space is taken.' : 'Tap one of the highlighted spaces.');
    }
    this.commit(id, isRemoveJack(card) ? { kind: 'remove', card, cell } : { kind: 'place', card, cell });
  }

  /** Exchanges the selected dead card for a new one (once per turn). */
  swapDead() {
    const m = this.state.match;
    const card = this.state.selected;
    if (!m || card == null || !this.canAct()) return;
    const id = currentSeatId(m);
    if (!canSwap(m, id, card)) return this.hint('You can swap one dead card per turn.');
    this.commit(id, { kind: 'swap', card });
  }

  private canAct() {
    const s = this.state;
    const m = s.match;
    if (!m || s.view !== 'play' || s.busy || s.handoff || m.phase !== 'playing') return false;
    const seat = seatById(m, currentSeatId(m));
    return seat.kind !== 'bot' && s.viewer === seat.id;
  }

  private hint(text: string) {
    sfx.invalid();
    haptic.warning();
    this.set({ hint: { text, id: ++this.hintId } });
  }

  dismissHint() {
    this.set({ hint: null });
  }

  private commit(seatId: string, a: Action) {
    const m = this.state.match!;
    const out = play(m, seatId, a);
    if (!out.ok) return this.hint("That move isn't allowed.");
    const seat = seatById(m, seatId);
    if (seat.kind === 'you' && this.saved && a.kind !== 'swap') this.saved.youPlaced = true;
    if (a.kind === 'swap') sfx.swap();
    else if (a.kind === 'remove') sfx.remove();
    else sfx.place(seat.side);
    if (a.kind !== 'swap' && seat.kind !== 'bot') haptic.place();
    const next = out.state;
    const madeSeq = out.sequences.length > 0;
    this.replace(next, { busy: true, selected: null, thinking: null, fresh: madeSeq ? out.sequences : this.state.fresh });
    const youSide = next.seats.find((s) => s.kind === 'you')!.side;
    const cheer = () => {
      if (out.sequences[0].side === youSide) {
        sfx.sequenceWin();
        haptic.success();
      } else sfx.sequenceLoss();
    };

    if (next.phase === 'playing') {
      if (madeSeq) this.after(FLIP_DONE, cheer);
      const sameSeat = currentSeatId(next) === seatId;
      this.after(madeSeq ? TIMING.seqHold : sameSeat ? 120 : TIMING.land, () => {
        this.set({ busy: false });
        if (sameSeat && seat.kind !== 'bot') return; // a swap keeps the turn
        this.beginTurn();
      });
      return;
    }
    // Game over: record immediately so closing the app can't lose it.
    this.record();
    const won = next.winnerSide === youSide;
    if (madeSeq) this.after(FLIP_DONE, cheer);
    this.after(madeSeq ? FLIP_DONE + 900 : TIMING.endHold, () => {
      gameMusic.stop();
      this.set({ busy: false, view: 'results' });
      if (won) sfx.matchWin();
      else sfx.matchLoss();
    });
  }

  // ------------------------------------------------------------ results

  private record() {
    const s = this.saved;
    if (!s || s.recorded || s.match.phase !== 'over') return;
    s.recorded = true;
    this.persist();
    if (s.config.casual) return;
    const m = s.match;
    const you = m.seats.find((x) => x.kind === 'you')!;
    const won = m.winnerSide === you.side;
    const forfeited = m.forfeitedBy === you.id;
    const summary = summarize(m, s.activeMs ?? 0);
    progress.match(summary);
    profile.recordRanked({ matchId: m.id, mode: m.mode, won, forfeit: forfeited, sequences: sequenceCount(m, you.side), opp: m.rated?.opp ?? START_RATING });
    // Offline fallback rating (the server keeps its own).
    if (m.rated) kv.set(RATING_KEY, String(Math.round(Math.max(RATING_FLOOR, nextRating(getRating(), m.rated.opp, won && !forfeited)))));
  }
}

function blank(): GameState {
  return { view: 'none', match: null, config: null, selected: null, busy: false, handoff: null, viewer: null, fresh: [], hint: null, thinking: null };
}

const SIDE_HUES = [250, 305, 168];

/** Ranked computer players get a strength near the player's rating; the
 *  label is kept internally but never shown in ranked. */
function botStrength(s: SeatSetup, rated: number | null): { difficulty?: Difficulty; skill?: number } {
  if (s.kind !== 'bot') return {};
  if (rated == null) return { difficulty: s.difficulty };
  const skill = ratingToSkill(opponentRating(rated, Math.random));
  return { skill, difficulty: skill > 0.7 ? 'hard' : skill < 0.3 ? 'easy' : 'medium' };
}

export function buildSeats(config: SetupConfig, rated: number | null = null): Seat[] {
  const mode = MODES[config.mode];
  const me = profile.get().profile;
  const used = new Set(config.seats.map((s) => s.name.toLowerCase()));
  const pool = BOT_NAMES.filter((n) => !used.has(n.toLowerCase()) && n.toLowerCase() !== me?.name.toLowerCase());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return config.seats.map((s, i) => {
    const side = i % mode.sides;
    const name = s.kind === 'you' ? me?.name || 'You' : s.kind === 'bot' ? pool.pop() ?? `Bot ${i}` : s.name.trim() || `Player ${i + 1}`;
    return {
      id: s.kind === 'you' ? 'you' : `s${i}`,
      name,
      kind: s.kind,
      ...botStrength(s, rated),
      side,
      glyph: name[0]?.toUpperCase() ?? '?',
      hue: SIDE_HUES[side % 3] + Math.floor(i / mode.sides) * 16,
      photo: null,
    };
  });
}

export const game = new GameController();

export function useGame(): GameState {
  return useSyncExternalStore(game.subscribe, game.get, game.get);
}

export function summarize(m: MatchState, activeMs: number): MatchSummary {
  const you = m.seats.find((s) => s.kind === 'you')!;
  const mine = you.side;
  const won = m.winnerSide === mine && m.forfeitedBy !== you.id;
  const mySeqs = m.sequences.filter((q) => q.side === mine);
  const first = m.sequences[0];
  const myMoves = m.moves.filter((x) => x.seat === you.id);
  return {
    matchId: m.id,
    mode: m.mode,
    won,
    forfeit: m.forfeitedBy === you.id,
    sequences: mySeqs.length,
    diagonals: mySeqs.filter((q) => q.dir === 'diag' || q.dir === 'anti').length,
    wildJacks: myMoves.filter((x) => x.action.kind === 'place' && isWildJack(x.action.card)).length,
    removals: myMoves.filter((x) => x.action.kind === 'remove').length,
    shutout: won && m.sequences.every((q) => q.side === mine),
    comeback: won && !!first && first.side !== mine,
    durationMs: activeMs || (m.endedAt ?? Date.now()) - m.startedAt,
    sides: m.sides.length,
  };
}
