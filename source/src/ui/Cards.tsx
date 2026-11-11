import { JACK_ONE_EYED, JACK_TWO_EYED } from "./jackArt";
import { LAYOUT, cardFace, faceLabel, isRemoveJack, isWildJack } from "../core/board";
import type { CardId, Suit } from "../core/types";
import { SUIT_ON_DARK, SUIT_ON_LIGHT } from "./theme";

const SUIT_PATH: Record<Suit, string> = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  diamond: "M12 1.8 20.2 12 12 22.2 3.8 12Z",
  spade: "M12 1.8C9 6 3 9.6 3 14.2a4.6 4.6 0 0 0 7.7 3.3c-.3 1.8-1 3.3-2.2 4.7h7c-1.2-1.4-1.9-2.9-2.2-4.7A4.6 4.6 0 0 0 21 14.2C21 9.6 15 6 12 1.8Z",
  club: "M12 2.3a4.5 4.5 0 0 1 3.9 6.8 4.5 4.5 0 1 1-2.6 7.6c.3 2 1.1 3.7 2.4 5.5H8.3c1.3-1.8 2.1-3.5 2.4-5.5a4.5 4.5 0 1 1-2.6-7.6A4.5 4.5 0 0 1 12 2.3Z",
  star: "M12 1.9l3.1 6.4 7 .9-5.1 4.9 1.3 7L12 17.7l-6.3 3.4 1.3-7L1.9 9.2l7-.9z",
};

export function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block">
      <path d={SUIT_PATH[suit]} fill={color} />
    </svg>
  );
}

/** The card printed on a board space. */
export function TileFace({ cell, size, dim = false }: { cell: number; size: number; dim?: boolean }) {
  const k = LAYOUT[cell];
  if (!k) return null;
  return (
    <span className={`pointer-events-none flex flex-col items-center justify-center leading-none transition-opacity ${dim ? "opacity-40" : ""}`} aria-hidden>
      <span className="font-display font-bold text-white" style={{ fontSize: size * (k.rank === "10" ? 0.32 : 0.38), letterSpacing: k.rank === "10" ? "-0.06em" : 0 }}>
        {k.rank}
      </span>
      <span style={{ marginTop: size * 0.04 }}>
        <SuitIcon suit={k.suit} size={size * 0.3} color={SUIT_ON_DARK[k.suit]} />
      </span>
    </span>
  );
}

export type CardState = "available" | "selected" | "disabled" | "dead";

/** A playing card in the hand. Jacks say what they do. */
export function HandCard({ card, width, state, side, onPress }: { card: CardId; width: number; state: CardState; side: number; onPress?: () => void }) {
  const k = cardFace(card);
  const color = SUIT_ON_LIGHT[k.suit];
  const h = width * 1.4;
  const sel = state === "selected";
  const wild = isWildJack(card);
  const remove = isRemoveJack(card);
  const pad = Math.max(3, Math.round(width * 0.07));
  const label = `${faceLabel(k)}${wild ? ", wild: place anywhere" : remove ? ", removes an opponent's chip" : ""}${state === "dead" ? ", dead card" : ""}${sel ? ", selected" : ""}`;
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={state === "disabled"}
      aria-pressed={sel}
      aria-label={label}
      className={`lu-card relative shrink-0 select-none overflow-hidden text-left focus:outline-none focus-visible:outline-dashed focus-visible:outline-2 ${state === "disabled" ? "opacity-50" : ""} ${state === "dead" && !sel ? "opacity-60" : ""}`}
      style={{
        width,
        height: h,
        borderRadius: 2,
        background: "#FFFFFF",
        border: "2px solid #111111",
        transform: sel ? `translateY(-${Math.round(h * 0.14)}px)` : undefined,
        boxShadow: "3px 3px 0 #111111",
        transition: "transform 140ms cubic-bezier(.2,.9,.3,1.2)",
      }}
    >
      {(wild || remove) && (
        <img
          src={wild ? JACK_TWO_EYED : JACK_ONE_EYED}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute right-1 top-1 block"
          style={{ width: Math.max(16, Math.round(width * 0.38)), height: "auto" }}
        />
      )}
      <span className="absolute left-1.5 top-1 flex flex-col items-center leading-none" style={{ color }}>
        <span className="font-display font-extrabold" style={{ fontSize: width * 0.3, letterSpacing: k.rank === "10" ? "-0.08em" : 0 }}>
          {k.rank}
        </span>
        <span style={{ marginTop: 1 }}>
          <SuitIcon suit={k.suit} size={width * 0.22} color={color} />
        </span>
      </span>
      {wild || remove ? (
        <span
          className="rt-keep absolute border-[1.5px] border-[#111111] py-[2px] text-center font-bold uppercase leading-none"
          style={{ left: pad, right: pad, bottom: pad, fontSize: Math.max(8, width * 0.15), background: "#39FF6A", color: "#111111", borderRadius: 2 }}
        >
          {wild ? "Wild" : "Remove"}
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-[10%] grid place-items-center">
          <SuitIcon suit={k.suit} size={width * 0.5} color={color} />
        </span>
      )}
      {state === "dead" && (
        <span className="absolute inset-x-0 top-[42%] grid place-items-center">
          <span className="rt-keep border-[1.5px] border-[#111111] bg-[#EA5B0C] px-1 py-px font-bold uppercase" style={{ fontSize: Math.max(7.5, width * 0.14), color: "#111111", borderRadius: 2 }}>
            Dead
          </span>
        </span>
      )}
    </button>
  );
}

/** Face-down card, for hidden hands. */
export function CardBack({ width }: { width: number }) {
  return (
    <span
      aria-hidden
      className="rt-keep relative block shrink-0 overflow-hidden"
      style={{
        width,
        height: width * 1.4,
        borderRadius: 2,
        border: "2px solid #111111",
        boxShadow: "3px 3px 0 #111111",
        backgroundColor: "#3355FF",
        backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,46,147,.55) 6px 9px)",
      }}
    >
      <span className="absolute inset-[4px] grid place-items-center border-[1.5px] border-[#FFFDF6]">
        <svg width={width * 0.42} height={width * 0.42} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill="#EA5B0C" stroke="#111111" strokeWidth="1.5" />
        </svg>
      </span>
    </span>
  );
}
