import { Chip } from "./Chip";
import { LOGO, LOGO_RATIO } from "./logoArt";
import { BLUE, CROWN, ORANGE, PINK, TEXT } from "./logoPieces";

/** Chip Flip mark on its own: five chips in a row (a sequence). */
export function LogoMark({ size = 40 }: { size?: number; animate?: boolean }) {
  const chip = size * 0.5;
  const step = chip * 1.08;
  return (
    <span className="relative inline-block shrink-0" style={{ width: chip + step * 4, height: chip }} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="absolute top-0" style={{ left: i * step }}>
          <Chip side={i % 3} size={chip} />
        </span>
      ))}
    </span>
  );
}

/** Logo used in headers. `height` is the height of the artwork. */
export function Wordmark({ height = 34 }: { height?: number }) {
  const h = Math.round(height * 1.25);
  return <img src={LOGO} alt="Chip Flip" draggable={false} className="block select-none" style={{ height: h, width: Math.round(h * LOGO_RATIO) }} />;
}

/** Animated logo for the welcome screen, built from the logo's pieces:
 *  the chips pop in left to right with the name; the pink and orange chips
 *  dissolve into blue ones; then all five flip over to show crowns. */
export function WelcomeLogo({ width = 210 }: { width?: number }) {
  const k = width / 823;
  const xs = [0, 167, 333, 500, 667];
  const start = [BLUE, PINK, BLUE, BLUE, ORANGE];
  const size = Math.round(155 * k);
  // Timeline (seconds). Starts 2s after the page appears; each dissolve
  // pauses before the blue chip takes its place.
  const D = 2;
  return (
    <div role="img" aria-label="Chip Flip" className="lu-wlogo relative" style={{ width, height: Math.round(312 * k) }}>
      {xs.map((x, i) => {
        const swaps = start[i] !== BLUE;
        const swapAt = D + (i === 1 ? 1.9 : 3.9);
        return (
          <div key={i} className="lu-wl-pop absolute" style={{ left: Math.round(x * k), top: 0, width: size, height: size, perspective: size * 5, animationDelay: `${D + i * 0.18}s` }}>
            <div className="lu-wl-flip" style={{ animationDelay: `${D + 6.3 + i * 0.14}s` }}>
              <div className="lu-wl-face">
                {swaps ? (
                  <>
                    <img src={BLUE} alt="" className="lu-wl-in absolute inset-0 h-full w-full" style={{ animationDelay: `${swapAt + 1.5}s` }} draggable={false} />
                    <img src={start[i]} alt="" className="lu-wl-out absolute inset-0 h-full w-full" style={{ animationDelay: `${swapAt}s` }} draggable={false} />
                  </>
                ) : (
                  <img src={BLUE} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
                )}
              </div>
              <div className="lu-wl-face lu-wl-back">
                <img src={CROWN} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
              </div>
            </div>
          </div>
        );
      })}
      <img src={TEXT} alt="" draggable={false} className="absolute left-0" style={{ top: Math.round(192 * k), width: Math.round(822 * k), height: Math.round(120 * k) }} />
    </div>
  );
}
