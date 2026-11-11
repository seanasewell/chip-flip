// Match controller: owns the live MatchState, runs computer turns, guards
// against double taps and stale timers, saves after every change and
// records the result exactly once. The rules themselves are in core/.
import { chooseAction, chooseBySkill } from "./core/ai";
import { MODES, isRemoveJack, isWildJack } from "./core/board";
import { canSwap, createMatch, currentSeatId, forfeit, play, seatById, sequenceCount, targetsFor } from "./core/engine";
import { randomSeed } from "./core/rng";
import type { Action, CardId, Difficulty, GameModeId, MatchState, Seat, Sequence } from "./core/types";
import type { MatchSummary } from "./progress";
import { sfx } from "./sfx";
import { getRating, nextRating, opponentRating, ratingToSkill, setRating } from "./skill";
import { SIDE_COLORS, validColors } from "./ui/theme";
import { reducedMotion, shell, store, type ShellDeps } from "./shell";

export interface SeatSetup {
  kind: "you" | "bot" | "local";
  difficulty: Difficulty;
  name: string;
  friendId?: string;
}

export interface SetupConfig {
  mode: GameModeId;
  seats: SeatSetup[];
  /** Palette color per side, chosen in setup. */
  colors?: number[];
  /** Casual matches are just for fun: no stats, ranks, XP or achievements. */
  casual?: boolean;
}

export type View = "none" | "intro" | "play" | "results";

export interface GameState {
  view: View;
  match: MatchState | null;
  config: SetupConfig | null;
  /** Selected card in the viewer's hand. */
  selected: CardId | null;
  /** True while a chip is landing; input is ignored until it clears. */
  busy: boolean;
  /** Pass-and-play: seat waiting to take the device. */
  handoff: string | null;
  /** Seat whose hand is visible. */
  viewer: string | null;
  /** Sequences just completed, for the highlight. */
  fresh: Sequence[];
  hint: { text: string; id: number } | null;
  thinking: string | null;
}

interface Saved {
  match: MatchState;
  config: SetupConfig;
  activeMs: number;
  recorded: boolean;
  youPlaced: boolean;
}

// A new sequence's chips flip one by one (see Board: 120ms + 220ms each, 1.1s
// flip), so the cheer waits until the last chip has landed.
const FLIP_DONE = 120 + 4 * 220 + 1100 + 60;
const TIMING = { intro: 3400, land: 380, bot: [700, 1200] as [number, number], seqHold: FLIP_DONE + 500, endHold: 1900 };

const key = (acct: string) => `lu.match.${acct}`;
const setupKey = (mode: string) => `lu.setup.${mode}`;

class GameController {
  state: GameState = blank();
  private listeners = new Set<() => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private token = 0;
  private account = "";
  private saved: Saved | null = null;
  private playClock = 0;
  private hintId = 0;

  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
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

  setAccount(id: string) {
    if (id === this.account) return;
    this.clearTimers();
    this.account = id;
    this.saved = store.json<Saved | null>(key(id), null);
    // Matches saved by the earlier round-based version can't be resumed.
    if (this.saved && this.saved.match?.v !== 2) {
      this.saved = null;
      store.remove(key(id));
    }
    if (this.saved && this.saved.match.phase === "over" && !this.saved.recorded) this.record();
    this.set({ ...blank() });
  }

  private persist() {
    if (!this.account || !this.saved) return;
    store.set(key(this.account), JSON.stringify(this.saved));
  }

  private tickClock() {
    if (this.saved && this.playClock) {
      const now = Date.now();
      this.saved.activeMs += now - this.playClock;
      this.playClock = now;
    }
  }

  /** A saved, unfinished match for the Play tab's resume card. */
  resumable(): { mode: GameModeId; score: number[]; youSide: number } | null {
    const s = this.saved;
    if (!s || s.match.phase === "over") return null;
    const you = s.match.seats.find((x) => x.kind === "you")!;
    return { mode: s.match.mode, score: s.match.sides.map((x) => sequenceCount(s.match, x.index)), youSide: you.side };
  }

  /** True if starting a new match now would forfeit the saved one. */
  startWouldForfeit() {
    return !!this.saved && this.saved.match.phase !== "over" && this.saved.youPlaced;
  }

  lastSetup(mode: GameModeId): SetupConfig | null {
    const c = store.json<SetupConfig | null>(setupKey(mode), null);
    return c && c.mode === mode && c.seats?.length === MODES[mode].players ? c : null;
  }

  // ------------------------------------------------------------ lifecycle

  start(config: SetupConfig) {
    this.abandonSaved();
    store.set(setupKey(config.mode), JSON.stringify(config));
    const ranked = !config.casual && config.seats.every((s) => s.kind !== "local");
    if (!ranked && !config.casual) config = { ...config, casual: true };
    const me = getRating(this.account);
    const opp = ranked ? opponentRating(me) : 0;
    const seats = buildSeats(config, shell(), ranked ? opp : null);
    const base = createMatch({ mode: config.mode, seats, seed: randomSeed() });
    const colors = validColors(config.colors, MODES[config.mode].sides);
    const match = {
      ...base,
      colors,
      rated: ranked ? { me, opp } : undefined,
      sides: base.sides.map((s) => (MODES[config.mode].teams ? { ...s, name: `Team ${SIDE_COLORS[colors[s.index]].name.toLowerCase()}` } : s)),
    };
    this.saved = { match, config, activeMs: 0, recorded: false, youPlaced: false };
    this.persist();
    this.clearTimers();
    this.set({ ...blank(), view: "intro", match, config });
    shell().music.play(match.id);
    this.after(reducedMotion() ? 300 : TIMING.intro, () => this.enterPlay());
  }

  resume() {
    if (!this.saved) return;
    this.clearTimers();
    const m = this.saved.match;
    this.set({ ...blank(), view: "play", match: m, config: this.saved.config });
    shell().music.play(m.id);
    this.playClock = Date.now();
    this.beginTurn();
  }

  private enterPlay() {
    this.playClock = Date.now();
    this.set({ view: "play" });
    this.beginTurn();
  }

  /** Back to the Play tab. The match stays saved and can be resumed. */
  leave() {
    this.tickClock();
    this.playClock = 0;
    this.persist();
    this.clearTimers();
    shell().music.stop();
    this.set({ ...blank() });
  }

  forfeit() {
    const m = this.state.match;
    if (!m || m.phase === "over" || !this.saved) return;
    this.tickClock();
    const you = m.seats.find((s) => s.kind === "you")!;
    const done = forfeit(m, you.id);
    this.saved.match = done;
    this.clearTimers();
    this.record();
    this.set({ match: done, view: "results", handoff: null, selected: null, busy: false });
    sfx.matchLoss();
    shell().music.sting("loss");
  }

  /** Leaves the results screen; the finished match is cleared. */
  exit(then?: () => void) {
    this.clearTimers();
    shell().music.stop();
    this.saved = null;
    store.remove(key(this.account));
    this.set({ ...blank() });
    shell().afterGame(() => then?.());
  }

  playAgain() {
    const cfg = this.state.config;
    this.saved = null;
    store.remove(key(this.account));
    shell().afterGame(() => cfg && this.start(cfg));
  }

  /** Starting something new while a match is saved forfeits it if you had
   *  already played a card, and simply discards it otherwise. */
  private abandonSaved() {
    const s = this.saved;
    if (!s || s.match.phase === "over") return;
    if (s.youPlaced) {
      const you = s.match.seats.find((x) => x.kind === "you")!;
      s.match = forfeit(s.match, you.id);
      this.record();
    }
    this.saved = null;
    store.remove(key(this.account));
  }

  // ------------------------------------------------------------ turns

  private replace(match: MatchState, extra: Partial<GameState> = {}) {
    if (this.saved) this.saved.match = match;
    this.persist();
    this.set({ match, ...extra });
  }

  private beginTurn() {
    const m = this.state.match;
    if (!m || m.phase !== "playing") return;
    const id = currentSeatId(m);
    const seat = seatById(m, id);
    if (seat.kind === "bot") {
      this.set({ thinking: id, selected: null });
      const [a, b] = TIMING.bot;
      this.after(a + Math.random() * (b - a), () => this.botMove(id));
      return;
    }
    const humans = m.seats.filter((s) => s.kind !== "bot");
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
    if (!m || m.phase !== "playing" || currentSeatId(m) !== id) return;
    const bot = seatById(m, id);
    const a = bot.skill != null ? chooseBySkill(m, id, bot.skill) : chooseAction(m, id, bot.difficulty ?? "medium");
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
    shell().vibrate(8);
  }

  /** Board tap with a card selected: place (or remove with a one-eyed jack). */
  tapCell(cell: number) {
    const m = this.state.match;
    if (!m || !this.canAct()) return;
    const id = currentSeatId(m);
    const card = this.state.selected;
    if (card == null) return this.hint("Pick a card first. Its spaces light up.");
    if (!targetsFor(m, id, card).includes(cell)) {
      if (isRemoveJack(card)) return this.hint("Tap an opponent's chip that isn't in a sequence.");
      return this.hint(m.board[cell] !== null ? "That space is taken." : "Tap one of the glowing spaces.");
    }
    this.commit(id, isRemoveJack(card) ? { kind: "remove", card, cell } : { kind: "place", card, cell });
  }

  /** Exchanges the selected dead card for a new one (once per turn). */
  swapDead() {
    const m = this.state.match;
    const card = this.state.selected;
    if (!m || card == null || !this.canAct()) return;
    const id = currentSeatId(m);
    if (!canSwap(m, id, card)) return this.hint("You can swap one dead card per turn.");
    this.commit(id, { kind: "swap", card });
  }

  private canAct() {
    const s = this.state;
    const m = s.match;
    if (!m || s.view !== "play" || s.busy || s.handoff || m.phase !== "playing") return false;
    const seat = seatById(m, currentSeatId(m));
    return seat.kind !== "bot" && s.viewer === seat.id;
  }

  private hint(text: string) {
    sfx.invalid();
    this.set({ hint: { text, id: ++this.hintId } });
  }

  private commit(seatId: string, a: Action) {
    const m = this.state.match!;
    const out = play(m, seatId, a);
    if (!out.ok) return this.hint("That move isn't allowed.");
    const seat = seatById(m, seatId);
    if (seat.kind === "you" && this.saved && a.kind !== "swap") this.saved.youPlaced = true;
    this.tickClock();
    if (a.kind === "swap") sfx.refresh();
    else if (a.kind === "remove") sfx.remove();
    else sfx.place(seat.side);
    if (a.kind !== "swap") shell().vibrate(14);
    const next = out.state;
    const madeSeq = out.sequences.length > 0;
    this.replace(next, { busy: true, selected: null, thinking: null, fresh: madeSeq ? out.sequences : this.state.fresh });

    if (next.phase === "playing") {
      const youSide = next.seats.find((s) => s.kind === "you")!.side;
      if (madeSeq) this.after(FLIP_DONE, () => (out.sequences[0].side === youSide ? sfx.roundWin() : sfx.roundLoss()));
      const sameSeat = currentSeatId(next) === seatId;
      this.after(madeSeq ? TIMING.seqHold : sameSeat ? 120 : TIMING.land, () => {
        this.set({ busy: false });
        if (sameSeat && seat.kind !== "bot") return; // a swap keeps the turn
        this.beginTurn();
      });
      return;
    }
    // Game over: record immediately so closing the app can't lose it.
    this.record();
    const youSide = next.seats.find((s) => s.kind === "you")!.side;
    const won = next.winnerSide === youSide;
    if (madeSeq) this.after(FLIP_DONE, () => (out.sequences[0].side === youSide ? sfx.roundWin() : sfx.roundLoss()));
    this.after(madeSeq ? FLIP_DONE + 900 : TIMING.endHold, () => {
      this.set({ busy: false, view: "results" });
      if (won) sfx.matchWin();
      else sfx.matchLoss();
      shell().music.sting(won ? "win" : "loss");
    });
  }

  dismissHint() {
    this.set({ hint: null });
  }

  // ------------------------------------------------------------ results

  private record() {
    const s = this.saved;
    if (!s || s.recorded || s.match.phase !== "over") return;
    s.recorded = true;
    this.persist();
    const summary = { ...summarize(s.match, s.activeMs), casual: !!s.config.casual };
    shell().recordMatch(summary);
    const r = s.match.rated;
    if (r && !summary.casual && this.account) setRating(this.account, nextRating(getRating(this.account), r.opp, summary.won));
  }
}

function blank(): GameState {
  return { view: "none", match: null, config: null, selected: null, busy: false, handoff: null, viewer: null, fresh: [], hint: null, thinking: null };
}

const SIDE_HUES = [250, 305, 168];

/** Ranked computer players get a strength near the player's rating; the
 *  label is kept internally (for stats) but never shown in ranked. */
function botStrength(s: SeatSetup, rated: number | null): { difficulty?: Difficulty; skill?: number } {
  if (s.kind !== "bot") return {};
  if (rated == null) return { difficulty: s.difficulty };
  const skill = ratingToSkill(opponentRating(rated, Math.random));
  return { skill, difficulty: skill > 0.7 ? "hard" : skill < 0.3 ? "easy" : "medium" };
}

export function buildSeats(config: SetupConfig, deps: Pick<ShellDeps, "botNames" | "currentAccount">, rated: number | null = null): Seat[] {
  const mode = MODES[config.mode];
  const acct = deps.currentAccount() ?? undefined;
  const used = new Set(config.seats.map((s) => s.name.toLowerCase()));
  const pool = deps.botNames.filter((n) => !used.has(n.toLowerCase()) && n.toLowerCase() !== acct?.name.toLowerCase());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return config.seats.map((s, i) => {
    const side = i % mode.sides;
    const name = s.kind === "you" ? acct?.name || "You" : s.kind === "bot" ? pool.pop() ?? `Bot ${i}` : s.name.trim() || `Player ${i + 1}`;
    return {
      id: s.kind === "you" ? "you" : `s${i}`,
      name,
      kind: s.kind,
      ...botStrength(s, rated),
      side,
      glyph: name[0]?.toUpperCase() ?? "?",
      hue: SIDE_HUES[side % 3] + Math.floor(i / mode.sides) * 16,
      photo: s.kind === "you" ? acct?.photo ?? null : null,
      friendId: s.kind === "local" ? s.friendId : undefined,
    };
  });
}

export function summarize(m: MatchState, activeMs: number): MatchSummary {
  const you = m.seats.find((s) => s.kind === "you")!;
  const mine = you.side;
  const won = m.winnerSide === mine;
  const mySeqs = m.sequences.filter((q) => q.side === mine);
  const firstSeq = m.sequences[0];
  const myMoves = m.moves.filter((x) => x.seat === you.id);
  const counts = m.sides.map((s) => sequenceCount(m, s.index));
  const placement = won ? 1 : 1 + counts.filter((c, i) => i !== mine && c >= counts[mine]).length;
  return {
    matchId: m.id,
    mode: m.mode,
    won,
    forfeit: m.forfeitedBy === you.id,
    sequences: mySeqs.length,
    diagonals: mySeqs.filter((q) => q.dir === "diag" || q.dir === "anti").length,
    wildJacks: myMoves.filter((x) => x.action.kind === "place" && isWildJack(x.action.card)).length,
    removals: myMoves.filter((x) => x.action.kind === "remove").length,
    shutout: won && m.sequences.every((q) => q.side === mine),
    comeback: won && !!firstSeq && firstSeq.side !== mine,
    vsFriend: m.seats.some((s) => !!s.friendId),
    beatHard: won && m.seats.some((s) => s.kind === "bot" && s.difficulty === "hard" && s.side !== mine),
    durationMs: activeMs || (m.endedAt ?? Date.now()) - m.startedAt,
    placement: Math.max(1, won ? 1 : Math.max(2, placement)),
    sides: m.sides.length,
  };
}

export const game = new GameController();
