"""Stage four: 1990s desktop chrome for shell components (taskbar, pixel
tab icons, block progress bars)."""
import sys, re
OUT = "build/app.lineup.js"
src = open(OUT).read()

def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n != count:
        sys.exit(f"expected {count}, found {n}:\n{old[:300]}")
    src = src.replace(old, new)

# Taskbar-style bottom navigation with pixel icons.
rep('''      className: "relative z-10 border-t border-white/[.07] bg-ink-900",
      style: { paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)" },''', '''      className: "rt-taskbar relative z-10",
      style: { paddingBottom: "calc(var(--safe-bottom, 0px) + 8px)" },''')
rep('''        className: "mx-auto flex max-w-[480px]",
        children: HE.map((t) => {''', '''        className: "mx-auto flex max-w-[480px] gap-1.5 px-2 pt-2",
        children: HE.map((t) => {''')
rep('''              className:
                "flex flex-1 flex-col items-center gap-1 pt-2.5 transition active:scale-95",''', '''              className: `rt-tab flex flex-1 flex-col items-center gap-1 py-1.5 ${a ? "rt-tab-on" : ""}`,''')
rep('''                  className: `grid h-[26px] place-items-center transition ${a ? "opacity-100" : "opacity-60"}`,
                  children:
                    t.id === "profile"
                      ? (0, u.jsx)(oe, {
                          player: {
                            glyph: s.name[0]?.toUpperCase() ?? "Y",
                            hue: 255,
                            isYou: !0,
                            photo: s.photo,
                          },
                          size: 26,
                        })
                      : (0, u.jsx)("span", {
                          className: "text-[24px] leading-none",
                          children: t.emoji,
                        }),''', '''                  className: `grid h-[26px] place-items-center ${a ? "" : "opacity-80"}`,
                  children:
                    t.id === "profile"
                      ? (0, u.jsx)(oe, {
                          player: {
                            glyph: s.name[0]?.toUpperCase() ?? "Y",
                            hue: 255,
                            isYou: !0,
                            photo: s.photo,
                          },
                          size: 26,
                        })
                      : (0, u.jsx)("span", {
                          className: "text-[24px] leading-none",
                          children: t.emoji,
                        }),''')
rep('''                  className: `text-[11px] font-semibold transition ${a ? "text-white" : "text-white/80"}`,''', '''                  className: `text-[11px] font-bold ${a ? "text-white" : "text-white/70"}`,''')

# Block-style progress bars.
rep('''      className: "w-full overflow-hidden rounded-full bg-white/10",
      style: { height: s },''', '''      className: "rt-progress w-full",
      style: { height: s },''')

# Tab emoji: gamepad for Play.
rep('''    { id: "play", label: "Play", emoji: "\\u{1F3AF}" },''', '''    { id: "play", label: "Play", emoji: "\\u{1F3AE}" },''')

# Player profile: no "Sample player" badge.
rep('''          badge: "Sample player",''', '''          badge: void 0,''')

# Notices: bright solid colour with light text, no border.
rep('''            className: `w-full rounded-2xl border ${e.good ? "border-mint/50 bg-[#123A33]" : "border-coral/50 bg-[#3A1820]"} px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,.35)]`,''', '''            className: `lu-toast ${e.good ? "lu-toast-good" : "lu-toast-bad"} w-full px-4 py-3 text-center text-sm`,''')

# Avatars: one solid colour, no gradient or glow.
rep('''        background: a
          ? "conic-gradient(from 200deg, #3D8BFF, #5CC8FF, #3EE6B8, #3D8BFF)"
          : `linear-gradient(140deg, hsl(${r} 85% 62%), hsl(${(r + 40) % 360} 75% 42%))`,''', '''        background: a ? "#3D8BFF" : `hsl(${r} 72% 52%)`,''')
rep('''            style: { textShadow: "0 1px 2px rgba(0,0,0,.35)" },
            children: e.glyph,''', '''            children: e.glyph,''')

# Test ad interstitial: on the light theme it rendered as a blank black
# screen (dark background, ink text). Give it the paper look.
rep('''          "pointer-events-auto absolute inset-0 z-[80] flex animate-[fadeUp_.25s_ease-out] flex-col items-center justify-center bg-[#0B0F1A] p-6 text-center",''', '''          "pointer-events-auto absolute inset-0 z-[80] flex animate-[fadeUp_.25s_ease-out] flex-col items-center justify-center bg-stage p-6 text-center",''')
rep('''                      "grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg text-white",
                    children: "\\u2715",''', '''                      "rt-icon-btn text-lg",
                    children: "\\u2715",''')
rep('''          (0, b.jsx)("div", {
            className: "mt-3 font-display text-[26px] font-bold text-white",
            children: "Test ad",
          }),''', '''          (0, b.jsx)("div", {
            className: "card mt-3 px-8 py-6 font-display text-[34px] font-bold text-white",
            children: "Test ad",
          }),''')

# Completed challenges: the green check mark emoji.
rep('''            ? (0, h.jsx)("span", {
                "aria-hidden": !0,
                className: "text-[22px] font-bold leading-none text-mint",
                children: "\\u2713",
              })
            : (0, h.jsx)(Zs, { e: e.emoji, size: 22 }),''', '''            ? (0, h.jsx)(Zs, { e: "\\u2705", size: 22 })
            : (0, h.jsx)(Zs, { e: e.emoji, size: 22 }),''')

# "Save your progress": bigger close button, centred on the title.
rep('''          className: "flex items-start justify-between gap-3",
          children: [
            (0, N.jsx)("div", {
              className: "font-display text-xl font-bold text-white",
              children: "Save your progress",
            }),''', '''          className: "flex items-center justify-between gap-3",
          children: [
            (0, N.jsx)("div", {
              className: "font-display text-xl font-bold text-white",
              children: "Save your progress",
            }),''')
rep('''                  "-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-lg text-white/55 hover:bg-white/5",''', '''                  "-mr-1.5 grid h-10 w-10 shrink-0 place-items-center text-[24px] leading-none text-white",''')

# Achievements: unlocked tiles get the green check emoji; XP is pink until
# earned, green once earned.
rep('''            className:
              "absolute right-2.5 top-1.5 text-lg font-bold leading-none text-mint",
            children: "\\u2713",
          }),''', '''            className: "absolute right-2 top-2 leading-none",
            children: (0, h.jsx)(Zs, { e: "\\u2705", size: 18 }),
          }),''')
rep('''          className: `mt-1 text-xs font-bold tabular ${e.unlocked ? "text-amber" : "text-amber/70"}`,''', '''          className: `mt-1 text-xs font-bold tabular ${e.unlocked ? "text-[#0E9F55]" : "text-[#E8157A]"}`,''')
rep('''                  className: `shrink-0 text-xs font-bold ${s ? "text-mint" : "text-amber"}`,''', '''                  className: `shrink-0 text-xs font-bold ${s ? "text-[#0E9F55]" : "text-[#E8157A]"}`,''')

# Level-up sheet: "Level 2 reached!", centred label, no box around each
# unlocked achievement.
rep('''                          children: ["Level ", r.level, " reached"],''', '''                          children: ["Level ", r.level, " reached!"],''')
rep('''                                "mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-white/65",
                              children:
                                n.length === 1''', '''                                "mb-2 text-center text-[11px] font-semibold uppercase tracking-[.14em] text-white/65",
                              children:
                                n.length === 1''')
rep('''                                    "card flex flex-col items-center gap-1.5 rounded-[20px] px-4 py-5 text-center",''', '''                                    "flex flex-col items-center gap-1.5 px-4 py-3 text-center",''')

# In-game music: the designer's track, streamed from music/game.mp3 through
# an <audio> element (a 5-minute song is too big to decode into memory on a
# phone). The short win/loss stings still use the built-in clips.
rep('''    if (((et = e), (cn = i), (bs = !0), !j)) return;
    let s = fg[i] ?? (await Zg(i));''', '''    if (((et = e), (cn = i), (bs = !0), !j)) return;
    if (i === "rounds") {
      let g = luGameAudio(j);
      if (g) {
        Tm(0.25);
        let tok = ++g.tok;
        ((_i = j.createGain()),
          (_i.gain.value = 0),
          g.src.disconnect(),
          g.src.connect(_i).connect(j.destination),
          (g.el.currentTime = 0),
          g.el.play().catch(() => {}),
          (qi = { stop: () => { g.tok === tok && g.el.pause(); } }),
          Tt && !document.hidden && Ar(nr, 0.15),
          Wm ||
            ((Wm = !0),
            document.addEventListener("visibilitychange", () => {
              (document.hidden && Ht(),
                Ar(document.hidden || !Tt || !bs || yi ? 0 : nr));
            })));
        return;
      }
    }
    let s = fg[i] ?? (await Zg(i));''')
rep('''  async function Kg(e, i) {''', '''  var luGA = null;
  function luGameAudio(ctx) {
    if (luGA) return luGA;
    try {
      let el = new Audio("music/game.mp3");
      ((el.loop = !0), (el.preload = "auto"), el.setAttribute("playsinline", ""));
      let src = ctx.createMediaElementSource(el),
        boost = ctx.createGain();
      ((boost.gain.value = 2.5), src.connect(boost));
      luGA = { el, src: boost, tok: 0 };
    } catch {
      luGA = null;
    }
    return luGA;
  }
  async function Kg(e, i) {''')

# Remove-ads list: green check mark emoji.
rep('''                className: "flex items-center gap-2.5 font-semibold text-white",
                children: [(0, b.jsx)(lw, {}), d],''', '''                className: "flex items-center gap-2.5 font-semibold text-white",
                children: [(0, b.jsx)("span", { "aria-hidden": !0, className: "text-[20px] leading-none", children: "\\u2705" }), d],''')

# Green check emoji wherever the shell's check icon appears (Settings when
# ads are removed).
rep('''  function lw() {
    return (0, b.jsxs)("svg", {''', '''  function lw() {
    return (0, b.jsx)("span", { "aria-hidden": !0, className: "shrink-0 text-[20px] leading-none", children: "\\u2705" });
    return (0, b.jsxs)("svg", {''')

# Welcome tagline.
rep('''                "Play a card. Claim its space. Line up five before anyone else.",''', '''                ["Play a card. Claim its space.", globalThis.__LU_REACT.createElement("br"), "Five in a row. Flip your chips."],''')

# Back buttons: a left arrow instead of the chevron, everywhere.
n_back = src.count('children: "\\u2039",')
if n_back < 3:
    sys.exit(f"expected 3+ back chevrons, found {n_back}")
src = src.replace('children: "\\u2039",', 'children: globalThis.__LU_REACT.createElement(LU.PixelIcon, { name: "back", size: 24 }),')

# Brand name in the shell's copy: Lineup is now Chip Flip.
src = src.replace("Lineup's", "Chip Flip's").replace("I'm playing Lineup: play a card, claim a space, line up five.", "I'm playing Chip Flip: play a card, claim a space, flip your chips.")
src = re.sub(r"\bLineup\b", "Chip Flip", src)

open(OUT, "w").write(src)
print("stage four ok")
