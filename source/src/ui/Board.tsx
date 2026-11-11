import { useEffect, useRef, useState } from "react";
import { BOARD_SIZE, type CellOwner, type Move, type Sequence } from "../core/types";
import { cellLabel, isCorner } from "../core/board";
import { Chip } from "./Chip";
import { TileFace } from "./Cards";
import { sideColor } from "./theme";
import { Smiley } from "./retro";

/** Largest square that fits the element (the board must never scroll). */
export function useSquare(max = 560, chromeW = 0, chromeH = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize(Math.floor(Math.max(0, Math.min(width - chromeW, height - chromeH, max))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [max, chromeW, chromeH]);
  return { ref, size };
}

export interface BoardProps {
  board: CellOwner[];
  size: number;
  sequences: Sequence[];
  /** Sequences completed on the last move (animated). */
  fresh?: Sequence[];
  lastMove?: Move | null;
  /** Spaces the selected card can act on. */
  targets: number[];
  targetKind: "place" | "remove";
  activeSide: number;
  onTap?: (cell: number) => void;
  /** Extra emphasis (tutorial). */
  spotlight?: number[];
  sideNames?: string[];
  /** Hide chips and outline taken spaces in the owner's color instead. */
  reveal?: boolean;
}

function CornerMark({ size }: { size: number }) {
  return <Smiley size={size * 0.68} color="#111111" />;
}

/** `hex` mixed into white at `amount` (0 to 1), as a solid color. */
function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 + (c - 255) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

export function Board({ board, size, sequences, fresh = [], lastMove = null, targets, targetKind, activeSide, onTap, spotlight = [], sideNames = [], reveal = false }: BoardProps) {
  if (!size) return null;
  const pad = Math.max(5, Math.round(size * 0.018));
  const gap = Math.max(2, Math.round(size * 0.009));
  const cell = (size - pad * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const locked = new Set(sequences.flatMap((q) => q.cells));
  const active = sideColor(activeSide);
  const lastCell = lastMove && lastMove.action.kind !== "swap" ? lastMove.action.cell : -1;
  const lastKind = lastMove?.action.kind;
  const targetSet = new Set(targets);
  // New sequences flip chip by chip along the line.
  const flipDelay = new Map<number, number>();
  fresh.forEach((q) => q.cells.forEach((c, k) => flipDelay.set(c, 120 + k * 220)));
  // "View board": chips hidden, taken spaces outlined inside their own edge.
  const ring = Math.max(2.5, Math.round(cell * 0.1));

  return (
    <div
      role="grid"
      aria-label="Board"
      className="rt-keep relative"
      style={{ width: size, height: size, padding: pad, background: "#111111", borderRadius: 0, boxShadow: "5px 5px 0 #3355FF" }}
    >
      <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`, gap }}>
        {board.map((owner, i) => {
          const corner = isCorner(i);
          const isTarget = targetSet.has(i);
          const lit = spotlight.includes(i);
          const isNew = i === lastCell && lastKind === "place";
          const removed = i === lastCell && lastKind === "remove";
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={
                corner
                  ? "Free corner"
                  : owner === null
                    ? `${cellLabel(i)}${isTarget ? ", available" : ""}`
                    : `${cellLabel(i)}, ${sideNames[owner] ?? sideColor(owner).name}${locked.has(i) ? ", in a sequence" : ""}${isTarget ? ", tap to remove" : ""}`
              }
              onClick={() => onTap?.(i)}
              disabled={!onTap}
              className={`relative grid place-items-center overflow-visible transition-colors duration-700 ${isTarget && targetKind === "place" ? "rt-ants" : ""}`}
              style={{
                borderRadius: 1,
                backgroundColor: corner ? "#39FF6A" : owner !== null ? (locked.has(i) ? tint(sideColor(owner).base, 0.1) : "#FFFDF6") : isTarget && targetKind === "place" ? `${active.light}` : "#FFFDF6",
                boxShadow: reveal && owner !== null && !corner
                  ? `inset 0 0 0 ${ring}px ${sideColor(owner).base}${isTarget && targetKind === "remove" ? `, inset 0 0 0 ${ring + 2}px #111111` : ""}`
                  : lit
                  ? "inset 0 0 0 2px #FF2E93"
                  : isTarget && targetKind === "remove"
                    ? "inset 0 0 0 2px #FF2E93"
                    : isTarget
                      ? "none"
                      : "none",
              }}
            >
              {corner ? (
                <CornerMark size={cell} />
              ) : owner === null || reveal ? (
                <span className={removed ? "animate-fadeIn" : ""}>
                  <TileFace cell={i} size={cell} dim={targets.length > 0 && !isTarget} />
                </span>
              ) : (
                <span key={`${i}-${owner}`} className={`grid place-items-center ${isNew ? "animate-luDrop" : ""}`}>
                  <Chip side={owner} size={cell * 0.84} locked={locked.has(i)} flipDelay={flipDelay.get(i) ?? 0} />
                </span>
              )}
              {isTarget && targetKind === "remove" && (
                <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                  <svg width={cell * 0.5} height={cell * 0.5} viewBox="0 0 20 20" shapeRendering="crispEdges">
                    <path d="M4 4l12 12M16 4L4 16" stroke="#111111" strokeWidth="5" />
                    <path d="M4 4l12 12M16 4L4 16" stroke="#EA5B0C" strokeWidth="2.4" />
                  </svg>
                </span>
              )}
              {isNew && owner !== null && (
                <span aria-hidden className="pointer-events-none absolute inset-0 animate-luRipple" style={{ borderRadius: 3, boxShadow: `0 0 0 2.5px ${sideColor(owner).base}` }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
