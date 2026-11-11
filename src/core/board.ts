import { nextRandom } from "./rng";
import {
  BOARD_SIZE,
  CELL_COUNT,
  SEQ_LENGTH,
  type CardFace,
  type CardId,
  type CellOwner,
  type Direction,
  type GameMode,
  type GameModeId,
  type Rank,
  type Suit,
} from "./types";

export const MODES: Record<GameModeId, GameMode> = {
  h2h: { id: "h2h", name: "Head to head", short: "1v1", players: 2, sides: 2, teams: false, hand: 7, toWin: 2 },
  ffa3: { id: "ffa3", name: "Three players", short: "3 players", players: 3, sides: 3, teams: false, hand: 6, toWin: 1 },
  teams: { id: "teams", name: "2v2 teams", short: "2v2", players: 4, sides: 2, teams: true, hand: 6, toWin: 2 },
  teams3v3: { id: "teams3v3", name: "3v3 teams", short: "3v3", players: 6, sides: 2, teams: true, hand: 5, toWin: 2 },
  teams3: { id: "teams3", name: "Three teams", short: "2v2v2", players: 6, sides: 3, teams: true, hand: 5, toWin: 1 },
};

export const MODE_ORDER: GameModeId[] = ["h2h", "ffa3", "teams", "teams3v3", "teams3"];

const DECK_SUITS: Suit[] = ["spade", "heart", "diamond", "club"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const SUIT_NAME: Record<Suit, string> = { spade: "spades", heart: "hearts", diamond: "diamonds", club: "clubs", star: "stars" };
const RANK_NAME: Record<Rank, string> = {
  A: "Ace", "2": "Two", "3": "Three", "4": "Four", "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine", "10": "Ten",
  J: "Jack", Q: "Queen", K: "King",
};

export function cardFace(id: CardId): CardFace {
  const i = id % 52;
  return { suit: DECK_SUITS[Math.floor(i / 13)], rank: RANKS[i % 13] };
}
export const faceKey = (f: CardFace) => `${f.rank}${f.suit}`;
export const faceLabel = (f: CardFace) => `${RANK_NAME[f.rank]} of ${SUIT_NAME[f.suit]}`;

/** Two-eyed jacks (diamonds, clubs) are wild: place a chip anywhere open. */
export const isWildJack = (id: CardId) => {
  const f = cardFace(id);
  return f.rank === "J" && (f.suit === "diamond" || f.suit === "club");
};
/** One-eyed jacks (spades, hearts) remove an opponent's chip. */
export const isRemoveJack = (id: CardId) => {
  const f = cardFace(id);
  return f.rank === "J" && (f.suit === "spade" || f.suit === "heart");
};
export const isJack = (id: CardId) => cardFace(id).rank === "J";

export const rowOf = (cell: number) => Math.floor(cell / BOARD_SIZE);
export const colOf = (cell: number) => cell % BOARD_SIZE;
export const cellAt = (r: number, c: number) => r * BOARD_SIZE + c;
const LAST = BOARD_SIZE - 1;
export const CORNERS = [cellAt(0, 0), cellAt(0, LAST), cellAt(LAST, 0), cellAt(LAST, LAST)];
export const isCorner = (cell: number) => CORNERS.includes(cell);

/**
 * Board layout: each of the 48 non-jack cards appears on exactly two
 * spaces, the four corners are free. Lineup uses its own arrangement: the
 * two copies of a card sit at point-symmetric positions (r, c) and
 * (9−r, 9−c), so every card offers one option in each half of the board.
 * The assignment is a fixed shuffle, identical on every device.
 */
export const LAYOUT: (CardFace | null)[] = (() => {
  const faces: CardFace[] = [];
  for (const suit of DECK_SUITS) for (const rank of RANKS) if (rank !== "J") faces.push({ suit, rank });
  const reps: number[] = [];
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const mirror = CELL_COUNT - 1 - cell;
    if (!isCorner(cell) && cell < mirror) reps.push(cell);
  }
  // Fixed shuffle (seeded, so the board never changes).
  let s = 0x1ed5;
  const order = faces.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const [r, n] = nextRandom(s);
    s = n;
    const j = Math.floor(r * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: (CardFace | null)[] = Array(CELL_COUNT).fill(null);
  reps.forEach((cell, i) => {
    out[cell] = order[i];
    out[CELL_COUNT - 1 - cell] = order[i];
  });
  return out;
})();

const CELLS_BY_FACE = new Map<string, number[]>();
LAYOUT.forEach((f, cell) => {
  if (!f) return;
  const k = faceKey(f);
  CELLS_BY_FACE.set(k, [...(CELLS_BY_FACE.get(k) ?? []), cell]);
});

/** The two spaces a (non-jack) card can claim. */
export const cellsForCard = (id: CardId): number[] => CELLS_BY_FACE.get(faceKey(cardFace(id))) ?? [];

export function cellLabel(cell: number) {
  const f = LAYOUT[cell];
  return f ? faceLabel(f) : "Free corner";
}

const DIRS: [Direction, number, number][] = [
  ["row", 0, 1],
  ["col", 1, 0],
  ["diag", 1, 1],
  ["anti", 1, -1],
];
export const DIRECTIONS = DIRS;

export interface Window {
  cells: number[];
  dir: Direction;
}

/** Every straight run of five spaces (192 on a 10×10 board). */
export const WINDOWS: Window[] = (() => {
  const out: Window[] = [];
  for (const [dir, dr, dc] of DIRS)
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cells: number[] = [];
        for (let k = 0; k < SEQ_LENGTH; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr > LAST || cc < 0 || cc > LAST) break;
          cells.push(cellAt(rr, cc));
        }
        if (cells.length === SEQ_LENGTH) out.push({ cells, dir });
      }
  return out;
})();

export const WINDOWS_THROUGH: Window[][] = Array.from({ length: CELL_COUNT }, (_, cell) => WINDOWS.filter((w) => w.cells.includes(cell)));

/** True if the space counts for `side` (its chip, or a free corner). */
export const counts = (board: CellOwner[], cell: number, side: number) => isCorner(cell) || board[cell] === side;

/** Longest straight run that counts for `side` (corners included). */
export function longestRun(board: CellOwner[], side: number): number {
  let best = 0;
  for (const [, dr, dc] of DIRS)
    for (let r = 0; r <= LAST; r++)
      for (let c = 0; c <= LAST; c++) {
        const pr = r - dr;
        const pc = c - dc;
        if (pr >= 0 && pr <= LAST && pc >= 0 && pc <= LAST && counts(board, cellAt(pr, pc), side)) continue;
        let n = 0;
        let rr = r;
        let cc = c;
        while (rr >= 0 && rr <= LAST && cc >= 0 && cc <= LAST && counts(board, cellAt(rr, cc), side)) {
          n++;
          rr += dr;
          cc += dc;
        }
        if (n && !(n === 1 && isCorner(cellAt(r, c)))) best = Math.max(best, n);
      }
  return best;
}
