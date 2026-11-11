import { sideColor, type SideColor } from "./theme";

/** Symbol shapes, each centred exactly on (10, 10) in a 20 x 20 box. */
function shape(kind: string, color: string) {
  if (kind === "ring") return <circle cx="10" cy="10" r="6.4" fill={color} />;
  if (kind === "diamond") return <path d="M10 2.6 17.4 10 10 17.4 2.6 10Z" fill={color} />;
  if (kind === "triangle") return <path d="M10 3.4 17.6 16.6H2.4Z" fill={color} />;
  return <rect x="3.6" y="3.6" width="12.8" height="12.8" fill={color} />;
}

/** A chip drawn as one SVG: fill, ink outline and symbol share one
 *  coordinate system, so the symbol is always dead centre. */
export function ChipIcon({ color, size, mark = 0.42, stroke = 1.5, className = "" }: { color: SideColor; size: number; mark?: number; stroke?: number; className?: string }) {
  const sw = (stroke * 20) / size;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={`block shrink-0 ${className}`} shapeRendering="geometricPrecision">
      <circle cx="10" cy="10" r={10 - sw / 2} fill={color.base} stroke="#111111" strokeWidth={sw} />
      <g transform={`translate(10 10) scale(${mark}) translate(-10 -10)`}>{shape(color.marker, color.mark)}</g>
    </svg>
  );
}

/** A player's chip on the board: flat, with an even ink outline. When it
 *  becomes part of a sequence it flips over to show a crown. */
export function Chip({ side, size, ghost = false, locked = false, flipDelay = 0, className = "", style }: {
  side: number;
  size: number;
  ghost?: boolean;
  /** Part of a completed sequence (can't be removed). */
  locked?: boolean;
  /** Stagger for the flip, in ms, so a new sequence flips chip by chip. */
  flipDelay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  size = Math.round(size);
  const c = sideColor(side);
  const bw = Math.max(1.5, size * 0.07);
  return (
    <span aria-hidden className={`lu-chip relative block rounded-full ${className}`} style={{ width: size, height: size, perspective: size * 5, opacity: ghost ? 0.4 : 1, ...style }}>
      <span className="lu-flip" style={{ transform: locked ? "rotateY(180deg)" : "none", transitionDelay: `${flipDelay}ms` }}>
        <span className="lu-face">
          <ChipIcon color={c} size={size} mark={0.34} stroke={bw} />
        </span>
        <span className="lu-face lu-back">
          <svg width={size} height={size} viewBox="0 0 20 20" className="absolute inset-0 block">
            <circle cx="10" cy="10" r={10 - (bw * 10) / size} fill={c.base} stroke="#111111" strokeWidth={(bw * 20) / size} />
          </svg>
          <span className="relative grid h-full w-full place-items-center">
            <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 1.25 24 24" aria-hidden className="block">
              <path d="M3 18.5 2 7.5l5.5 4.5L12 4.5l4.5 7.5L22 7.5l-1 11Z" fill="#FFFFFF" strokeLinejoin="round" />
              <rect x="3" y="19.5" width="18" height="2.5" rx="1" fill="#FFFFFF" />
            </svg>
          </span>
        </span>
      </span>
    </span>
  );
}

/** Symbol alone (kept for callers that draw their own circle). */
export function Marker({ kind, size, color = "#fff" }: { kind: string; size: number; color?: string }) {
  const s = Math.round(size);
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" className="block" aria-hidden>
      {shape(kind, color)}
    </svg>
  );
}
