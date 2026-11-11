// Lineup design primitives: bold line icons, slim "OS" windows, stickers,
// a ticker band and a solid progress bar. Editorial neo-brutalist with a
// wink at the 90s desktop.
import type { ReactNode } from "react";

export const INK = "#111111";
export const PAPER = "#FFFDF6";
export const BLUE = "#3355FF";
export const PINK = "#FF2E93";
export const ACID = "#EA5B0C";

/** Bold line icons drawn in currentColor on a 24px grid. */
const ICONS: Record<string, () => ReactNode> = {
  play: () => (
    <>
      <rect x="3" y="7" width="18" height="11" />
      <path d="M8 10.5v4M6 12.5h4" />
      <circle cx="15.5" cy="11.5" r=".6" fill="currentColor" />
      <circle cx="17.5" cy="13.5" r=".6" fill="currentColor" />
    </>
  ),
  ranks: () => <path d="M4 20V13h4v7M10 20V5h4v15M16 20V9h4v11M2.5 20h19" />,
  achievements: () => <path d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z" />,
  profile: () => (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  smiley: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10.2q1-1.2 2 0M14 10.2q1-1.2 2 0M7.8 14q4.2 4 8.4 0" />
    </>
  ),
  hourglass: () => <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />,
  sound: () => <path d="M4 9h4l5-4v14l-5-4H4ZM16.5 9q2 3 0 6M19 6.5q4 5.5 0 11" />,
  mute: () => <path d="M4 9h4l5-4v14l-5-4H4ZM16 9.5l5 5M21 9.5l-5 5" />,
  menu: () => <path d="M3 6.5h18M3 12h18M3 17.5h18" />,
  sparkle: () => <path d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z" />,
  floppy: () => (
    <>
      <path d="M4 3h13l3 3v15H4Z" />
      <path d="M8 3v5h7V3M7 21v-7h10v7" />
    </>
  ),
  arrow: () => <path d="M7 17 17 7M8.5 7H17v8.5" />,
  back: () => <path d="M20 12H5M11 5.5 4.5 12l6.5 6.5" />,
  eye: () => (
    <>
      <path d="M1.5 12C5 6 8.5 4.5 12 4.5S19 6 22.5 12C19 18 15.5 19.5 12 19.5S5 18 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </>
  ),
};

/** Kept as PixelIcon so the shell's tab bar keeps working; draws line icons. */
export function PixelIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  const filled = name === "achievements" || name === "sparkle";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      className={`block ${className}`}
    >
      {(ICONS[name] ?? ICONS.sparkle)()}
    </svg>
  );
}

export type BarColor = "violet" | "magenta" | "mint" | "yellow" | "cyan" | "pink";

/** A slim "OS" window: three dots, a mono label and an optional right-hand
 *  note, over a paper body with a hard ink shadow. */
export function RetroWindow({
  title,
  meta,
  children,
  className = "",
  bodyClassName = "",
  dark = false,
  onClose,
}: {
  title: ReactNode;
  meta?: ReactNode;
  bar?: BarColor;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  dark?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={`rt-window overflow-hidden ${dark ? "rt-window-dark" : ""} ${className}`}>
      <div className="rt-titlebar">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {meta != null && <span className="shrink-0 opacity-70">{meta}</span>}
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="shrink-0 px-1 text-[13px] leading-none">
            {"✕"}
          </button>
        )}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** Solid progress bar in an ink frame. */
export function BlockBar({ pct, color = BLUE }: { pct: number; blocks?: number; color?: string }) {
  const v = Math.max(0, Math.min(1, pct));
  return (
    <div className="h-3.5 border-2 border-[#111111] bg-[#FFFDF6]" role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full transition-[width] duration-500 ease-out" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

/** Tilted ticker band with star separators. */
export function Marquee({ items, color = BLUE, text = PAPER, tilt = -1.5, reverse = false }: { items: string[]; color?: string; text?: string; tilt?: number; reverse?: boolean }) {
  const run = (k: string) => (
    <span key={k} className="flex shrink-0 items-center" aria-hidden={k !== "a"}>
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="px-3 font-display text-[22px] leading-none">{t}</span>
          <PixelIcon name="sparkle" size={14} />
        </span>
      ))}
    </span>
  );
  return (
    <div className="lu-marquee overflow-hidden border-y-2 border-[#111111] py-2" style={{ background: color, color: text, transform: `rotate(${tilt}deg)` }}>
      <div className="lu-marquee-track flex w-max" style={reverse ? { animationDirection: "reverse" } : undefined}>
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}

/** Round sticker with an offset shadow, slightly rotated. */
export function Sticker({
  children,
  size = 84,
  bg = ACID,
  fg = INK,
  shadow = INK,
  rotate = -10,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  bg?: string;
  fg?: string;
  shadow?: string;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-center ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${shadow}`, transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** Line smiley used on corners and stickers. */
export function Smiley({ size, color = PAPER }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M8 10.4q1-1.3 2 0M14 10.4q1-1.3 2 0M7.6 14q4.4 4.2 8.8 0" />
    </svg>
  );
}

/** Mono section label like "(01) Games". */
export function Label({ n, children, className = "" }: { n?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`lu-label ${className}`}>
      {n && <span>({n}) </span>}
      {children}
    </div>
  );
}
