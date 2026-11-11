// Lineup core types. Pure data: no React, no DOM, no storage.
// Rules follow the classic card-and-board connection game: a 10×10 board,
// two standard decks, wild and removal jacks, free corners and sequences of
// five. Kept separate from the UI so they can be tested on their own and
// reused (e.g. by a React Native client or a game server).

export const BOARD_SIZE = 10;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const SEQ_LENGTH = 5;
/** Two standard 52-card decks. */
export const DECK_SIZE = 104;

export type GameModeId = "h2h" | "ffa3" | "teams" | "teams3v3" | "teams3";

export interface GameMode {
  id: GameModeId;
  name: string;
  short: string;
  players: number;
  /** Number of sides (individual players or teams). */
  sides: number;
  teams: boolean;
  /** Cards per hand. */
  hand: number;
  /** Sequences needed to win. */
  toWin: number;
}

export type Difficulty = "easy" | "medium" | "hard";
export type SeatKind = "you" | "local" | "bot";

/** One participant. In team modes several seats share a side. */
export interface Seat {
  id: string;
  name: string;
  kind: SeatKind;
  difficulty?: Difficulty;
  /** Ranked computer players: play strength from 0 to 1. */
  skill?: number;
  side: number;
  glyph: string;
  hue: number;
  photo?: string | null;
  /** Set when a local seat is one of the account's friends. */
  friendId?: string;
}

export type Suit = "spade" | "heart" | "diamond" | "club" | "star";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

/** A physical card in the shoe (0–103); two copies of each identity. */
export type CardId = number;

export interface CardFace {
  rank: Rank;
  suit: Suit;
}

/** Owner of a cell: side index, or null when empty. Corners stay null and
 *  count for every side. */
export type CellOwner = number | null;

export type Direction = "row" | "col" | "diag" | "anti";

export interface Sequence {
  side: number;
  cells: number[];
  dir: Direction;
  /** Seat that completed it. */
  seat: string;
}

export interface Side {
  index: number;
  seats: string[];
  name: string;
}

export type Action =
  | { kind: "place"; card: CardId; cell: number }
  | { kind: "remove"; card: CardId; cell: number }
  | { kind: "swap"; card: CardId };

export interface Move {
  seat: string;
  side: number;
  action: Action;
  /** Monotonic counter so the UI can animate the latest change. */
  n: number;
  newSequences: number;
}

export type MatchPhase = "playing" | "over";

export interface MatchConfig {
  mode: GameModeId;
  seats: Seat[];
  /** Seed for the shuffle, so a saved match resumes identically. */
  seed: number;
}

export interface MatchState {
  v: 2;
  /** Palette color chosen for each side (display only). */
  colors?: number[];
  /** Ranked: the player's hidden rating and the opponents' at the start. */
  rated?: { me: number; opp: number };
  id: string;
  mode: GameModeId;
  seats: Seat[];
  sides: Side[];
  /** Seat ids in turn order; teams alternate around the table. */
  order: string[];
  turn: number;
  board: CellOwner[];
  sequences: Sequence[];
  deck: CardId[];
  discard: CardId[];
  hands: Record<string, CardId[]>;
  /** A dead card has been exchanged this turn (allowed once per turn). */
  swapped: boolean;
  moves: Move[];
  moveCounter: number;
  /** Consecutive turns passed for want of any legal play. */
  passes: number;
  phase: MatchPhase;
  winnerSide: number | null;
  /** How the match ended. */
  ending: "sequences" | "forfeit" | "stalemate" | null;
  forfeitedBy: string | null;
  rng: number;
  startedAt: number;
  endedAt: number | null;
}

export type MoveError =
  | "not-playing"
  | "not-your-turn"
  | "card-not-in-hand"
  | "wrong-space"
  | "occupied"
  | "not-removable"
  | "not-dead"
  | "already-swapped";

export type MoveOutcome = { ok: true; state: MatchState; sequences: Sequence[] } | { ok: false; error: MoveError };
