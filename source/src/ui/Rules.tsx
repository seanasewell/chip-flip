import { shell } from "../shell";
import { tutorial } from "./Tutorial";
import { sideColor } from "./theme";

const MINI = 7;
function MiniLine({ cells, label, corner = false }: { cells: number[]; label: string; corner?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="grid gap-[2px] rounded-lg bg-white/[.05] p-1" style={{ gridTemplateColumns: `repeat(${MINI}, 7px)` }}>
        {Array.from({ length: MINI * MINI }, (_, i) => (
          <span
            key={i}
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: corner && i === 0 ? "#FF2E93" : cells.includes(i) ? sideColor(0).base : "rgba(17,17,17,.08)" }}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-white/70">{label}</span>
    </div>
  );
}

const Step = ({ n, title, body }: { n: number; title: string; body: string }) => (
  <div className="flex gap-3">
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-iris font-display text-sm font-bold text-white">{n}</span>
    <div>
      <div className="font-bold text-white">{title}</div>
      <div className="mt-0.5 text-sm leading-relaxed text-white/75">{body}</div>
    </div>
  </div>
);

export function RulesSheet({ onClose }: { onClose: () => void }) {
  const { Button } = shell();
  const sec = "mt-5 text-[11px] font-semibold uppercase tracking-[.14em] text-white/65";
  return (
    <div className="scroll-soft -mx-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      <div className="space-y-4">
        <Step n={1} title="Play a card" body="Every card is printed on two spaces of the board. Tap a card, then tap one of its glowing spaces to place a chip." />
        <Step n={2} title="Draw" body="After each play you draw a new card from the deck." />
        <Step n={3} title="Make a sequence" body="Five of your chips in a straight line is a sequence: across, down or diagonal." />
        <Step n={4} title="Win" body="Two sequences win. With three players or three teams, one sequence wins." />
      </div>
      <div className="mt-5 flex justify-between px-1">
        <MiniLine cells={[22, 23, 24, 25, 26]} label="Across" />
        <MiniLine cells={[3, 10, 17, 24, 31]} label="Down" />
        <MiniLine cells={[8, 16, 24, 32, 40]} label="Diagonal" />
        <MiniLine cells={[1, 2, 3, 4]} label="With a corner" corner />
      </div>
      <div className={sec}>Jacks</div>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-white/80">
        <li>
          <b className="text-white">Two-eyed jacks</b> ({"\u2666"} and {"\u2663"}) are wild: place a chip on any open space. Look for the two-eyed jack in the corner and the Wild badge.
        </li>
        <li>
          <b className="text-white">One-eyed jacks</b> ({"\u2660"} and {"\u2665"}) remove one opponent chip instead of placing. Look for the one-eyed jack in the corner and the Remove badge. Chips in a
          completed sequence can't be removed.
        </li>
      </ul>
      <div className={sec}>Good to know</div>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-white/80">
        <li>
          <b className="text-white">Free corners.</b> The four corners count for everyone, so a corner plus four chips is a sequence.
        </li>
        <li>
          <b className="text-white">Sharing.</b> Your two sequences may share one chip.
        </li>
        <li>
          <b className="text-white">Dead cards.</b> If both spaces for a card are taken, select it and tap Swap it to trade it for a new card. Once per
          turn.
        </li>
        <li>
          <b className="text-white">Teams.</b> Teammates share a color and alternate with the other teams around the table.
        </li>
        <li>
          <b className="text-white">No moves?</b> A player who can't play passes. If nobody can play, the most sequences wins, then the longest line.
        </li>
      </ul>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button
          variant="ghost"
          onClick={() => {
            onClose();
            tutorial.open();
          }}
        >
          Replay tutorial
        </Button>
        <Button onClick={onClose}>Got it</Button>
      </div>
    </div>
  );
}

/** Settings > How stats work. */
export function StatsRulesSheet() {
  return (
    <ul className="scroll-soft -mx-3 max-h-[62vh] space-y-2.5 overflow-y-auto px-3 text-sm leading-relaxed text-white/80">
      <li>
        <b className="text-white">Matches count when they end.</b> Each match is one game.
      </li>
      <li>
        <b className="text-white">Win or loss.</b> You win when you, or your team, complete the sequences needed first. With three players or
        teams anything else is a loss; your placement shows on the results screen.
      </li>
      <li>
        <b className="text-white">Forfeits</b> count as a loss and earn no XP. Starting a new match while one is saved forfeits the saved one
        if you'd already played a card.
      </li>
      <li>
        <b className="text-white">Leaving</b> a match keeps it saved, even if you close the app. It counts once you finish or forfeit it.
      </li>
      <li>
        <b className="text-white">Rematches</b> are new matches and count separately.
      </li>
      <li>
        <b className="text-white">Playing on one device.</b> Stats go to you, the player in seat one. Other people at the device play as
        guests.
      </li>
      <li>
        <b className="text-white">Guest players</b> keep progress on this device. Signing in with "Switch and merge" adds it to your account.
      </li>
      <li>
        <b className="text-white">Ranks</b> use the same stats as your profile. Other players on the ranks are samples in this preview.
      </li>
    </ul>
  );
}
