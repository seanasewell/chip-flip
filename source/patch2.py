"""Stage two: Play tab, profile, settings, root wiring. Reads and rewrites
build/app.lineup.js produced by patch.py."""
import re
import sys

OUT = "build/app.lineup.js"
src = open(OUT).read()


def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n != count:
        sys.exit(f"expected {count} match(es), found {n}:\n{old[:300]}")
    src = src.replace(old, new)


def rx(pattern, new, count=1):
    global src
    out, n = re.subn(pattern, lambda _m: new, src, flags=re.S)
    if n != count:
        sys.exit(f"regex expected {count}, found {n}: {pattern[:120]}")
    src = out


# --- Play tab ---------------------------------------------------------
rx(r"""  function _E\(\) \{.*?\n  function \$E\(\{ s: e, account: i \}\) \{.*?\n  var yw = """, """  function $E({ account: i }) {
    return (0, u.jsxs)("div", {
      children: [
        (0, u.jsxs)("div", {
          className: "flex items-center gap-2 pt-2",
          children: [
            (0, u.jsx)("div", {
              className: "flex w-[52px] shrink-0 justify-start",
              children: (0, u.jsx)(kh, {}),
            }),
            (0, u.jsx)("div", {
              className: "flex min-w-0 flex-1 justify-center",
              children: (0, u.jsx)(mn, { size: 30 }),
            }),
            (0, u.jsx)("div", {
              className: "flex w-[52px] shrink-0 justify-end",
              children: (0, u.jsx)(aw, {}),
            }),
          ],
        }),
        (0, u.jsx)("div", {
          className: "animate-fadeUp",
          style: { animationDelay: "60ms" },
          children: (0, u.jsx)(uw, {}),
        }),
        (0, u.jsx)(ow, { account: i }),
        (0, u.jsx)("div", {
          className: "mt-7 animate-fadeUp",
          style: { animationDelay: "120ms" },
          children: (0, u.jsx)(LU.HomeModes, {}),
        }),
        (0, u.jsx)("div", {
          className: "mt-7 animate-fadeUp",
          style: { animationDelay: "180ms" },
          children: (0, u.jsx)(zg, {}),
        }),
      ],
    });
  }
  var yw = """)

# --- tab host ---------------------------------------------------------
rep("""  function Yw({ s: e }) {""", """  function Yw() {""")
rep("""                    s === "play" && (0, u.jsx)($E, { s: e, account: i }),
                    s === "achievements" && (0, u.jsx)(Qh, {}),
                    s === "ranks" &&
                      (0, u.jsx)(ny, { account: i, best: e.personalBest }),
                    s === "profile" && (0, u.jsx)(Ay, { s: e, account: i }),""", """                    s === "play" && (0, u.jsx)($E, { account: i }),
                    s === "achievements" && (0, u.jsx)(Qh, {}),
                    s === "ranks" && (0, u.jsx)(LU.Ranks, {}),
                    s === "profile" &&
                      (0, u.jsx)(Ay, { account: i, onTab: a }),""")
rep("""            (0, u.jsx)(XE, {}),
            (0, u.jsx)(Ph, {}),""", """            (0, u.jsx)(XE, {}),""")

# --- profile tab ------------------------------------------------------
rx(r"""  function Ay\(\{ s: e, account: i \}\) \{.*?\n  function gy\(""", """  function Ay({ account: i, onTab: e }) {
    let [s, t] = (0, T.useState)(!1);
    return s
      ? (0, u.jsx)(gy, { account: i, onBack: () => t(!1) })
      : (0, u.jsxs)("div", {
          children: [
            (0, u.jsxs)("div", {
              className: "flex items-center justify-between",
              children: [
                (0, u.jsx)("h1", {
                  className: "font-display text-3xl font-bold text-white",
                  children: "Profile",
                }),
                (0, u.jsx)("button", {
                  onClick: () => t(!0),
                  "aria-label": "Settings",
                  className:
                    "grid h-10 w-10 place-items-center rounded-full text-[22px] hover:bg-white/5",
                  children: "\\u2699\\uFE0F",
                }),
              ],
            }),
            (0, u.jsx)("div", {
              className: "mt-3",
              children: (0, u.jsx)(ly, { account: i, onTab: e }),
            }),
          ],
        });
  }
  function ly({ account: i, onTab: t }) {
    let s = ei(),
      e = gi(),
      a = Ps.filter((r) => e.unlocked[r.id]).sort((r, o) =>
        String(e.unlocked[o.id]).localeCompare(String(e.unlocked[r.id])),
      );
    return (0, u.jsx)(ec, {
      mine: !0,
      avatar: {
        glyph: i.name[0]?.toUpperCase() ?? "Y",
        hue: 255,
        isYou: !0,
        photo: i.photo,
      },
      name: i.name,
      friends: s.friends,
      onFriends: () => L.push({ name: "friends" }),
      stats: { ...LU.blankStats(), ...e.stats },
      extra: (0, u.jsx)(LU.AchievementSummary, {
        earned: a.length,
        total: Ps.length,
        recent: a.map((r) => r.emoji),
        onOpen: () => t("achievements"),
      }),
    });
  }
  function gy(""")

# --- settings ---------------------------------------------------------
rep("""                onClick: () => n("scoring"),""", """                onClick: () => n("rules"),""")
rep("""                        children: "\\u{1F914}",
                      }),
                      "How scoring works",""", """                        children: "\\u{1F4D6}",
                      }),
                      "How to play",""")


def row(click, emoji, label):
    return f"""              (0, u.jsxs)("button", {{
                onClick: {click},
                className:
                  "divider flex w-full items-center justify-between border-b px-4 py-3.5 text-left",
                children: [
                  (0, u.jsxs)("span", {{
                    className:
                      "flex items-center gap-2 text-sm font-semibold text-white",
                    children: [
                      (0, u.jsx)("span", {{
                        "aria-hidden": !0,
                        children: "{emoji}",
                      }}),
                      "{label}",
                    ],
                  }}),
                  (0, u.jsx)("span", {{
                    className: "text-white/65",
                    children: "\\u203A",
                  }}),
                ],
              }}),
"""


rep("""              (0, u.jsxs)("button", {
                onClick: () => n("leveling"),""",
    row("() => LU.tutorial.open()", "\\u{1F393}", "Replay tutorial")
    + row('() => n("stats")', "\\u{1F4CA}", "How stats work")
    + """              (0, u.jsxs)("button", {
                onClick: () => n("leveling"),""")
for page in ["support", "privacy", "terms"]:
    rep(f"""              (0, u.jsxs)("a", {{
                href: "https://seanasewell.github.io/last-word/{page}.html",
                target: "_blank",
                rel: "noreferrer",
                className:""", f"""              (0, u.jsxs)("button", {{
                onClick: () => luLegalOpen("{page}"),
                className:""")
rep('''                    children: "\\u2197",''', '''                    children: "\\u203A",''', 3)
rep('''                className: "flex items-center justify-between px-4 py-3.5",''', '''                className: "flex w-full items-center justify-between px-4 py-3.5 text-left",''')
rep('''                  "divider flex items-center justify-between border-b px-4 py-3.5",''', '''                  "divider flex w-full items-center justify-between border-b px-4 py-3.5 text-left",''', 2)
rx(r"""          \(0, u\.jsxs\)\(ce, \{\n            open: o === "scoring",.*?\n          \(0, u\.jsx\)\(ce, \{\n            open: o === "blocked",""", """          (0, u.jsx)(ce, {
            open: o === "rules",
            onClose: () => n(null),
            title: "How to play",
            tall: !0,
            children: (0, u.jsx)(LU.RulesSheet, { onClose: () => n(null) }),
          }),
          (0, u.jsxs)(ce, {
            open: o === "stats",
            onClose: () => n(null),
            title: "How stats work",
            children: [
              (0, u.jsx)(LU.StatsRulesSheet, {}),
              (0, u.jsx)(D, {
                variant: "ghost",
                className: "mt-4 w-full",
                onClick: () => n(null),
                children: "Close",
              }),
            ],
          }),
          (0, u.jsx)(LuLegalSheet, {}),
          (0, u.jsx)(ce, {
            open: o === "blocked",""")

# --- in-app legal and support pages -----------------------------------
rep("""  function hw() {""", """  var luLegalCur = null,
    luLegalSubs = new Set();
  function luLegalOpen(e) {
    ((luLegalCur = e), luLegalSubs.forEach((i) => i()));
  }
  var luLegalText = {
    support: [
      "Help and support",
      "Lineup is in preview. For help, ideas or problems, use Send feedback in Settings. Your note is saved on this device.",
    ],
    privacy: [
      "Privacy policy",
      "In this preview, everything you do in Lineup (your name, photo, matches, stats and friends) is stored only in this browser on this device. Nothing is sent to a server. Lineup's full privacy policy will be published before launch.",
    ],
    terms: [
      "Terms of use",
      "Lineup is a preview build for testing. Other players shown are samples and purchases are simulated, so nothing is charged. Lineup's full terms of use will be published before launch.",
    ],
  };
  function LuLegalSheet() {
    let e = (0, ui.useSyncExternalStore)(
        (s) => (
          luLegalSubs.add(s),
          () => {
            luLegalSubs.delete(s);
          }
        ),
        () => luLegalCur,
      ),
      i = e ? luLegalText[e] : null;
    return (0, S.jsxs)(ce, {
      open: !!i,
      onClose: () => luLegalOpen(null),
      title: i?.[0],
      children: [
        (0, S.jsx)("p", {
          className: "text-sm leading-relaxed text-white/80",
          children: i?.[1],
        }),
        (0, S.jsx)(D, {
          variant: "ghost",
          className: "mt-5 w-full",
          onClick: () => luLegalOpen(null),
          children: "Close",
        }),
      ],
    });
  }
  function hw() {""")

# --- root -------------------------------------------------------------
rx(r"""  function gc\(\) \{.*?\n  var Dw = R\(z\(\)\);\n  jo\(\);""", """  function gc() {
    return (
      oh(),
      (0, Gi.useEffect)(() => {
        let e = () => Yg();
        return (
          window.addEventListener("pointerdown", e, { passive: !0 }),
          window.addEventListener("keydown", e),
          () => {
            (window.removeEventListener("pointerdown", e),
              window.removeEventListener("keydown", e));
          }
        );
      }, []),
      (0, Fe.jsxs)(Zh, {
        children: [
          (0, Fe.jsx)(cy, {}),
          (0, Fe.jsx)(Mh, {}),
          (0, Fe.jsx)(dw, {}),
          (0, Fe.jsx)(Ph, {}),
        ],
      })
    );
  }
  function cy() {
    let e = st(),
      s = e.account,
      i = (0, Gi.useSyncExternalStore)(LU.game.subscribe, LU.game.get, LU.game.get);
    ((0, Gi.useEffect)(() => {
      s && (Ie.use(s.id), ir.use(s.id), LU.game.setAccount(s.id));
    }, [s?.id]),
      (0, Gi.useEffect)(() => {
        (Ji.refresh(), li.warmUp());
      }, [s?.id]),
      (0, Gi.useEffect)(() => {
        i.view === "none" && Hm();
      }, [i.view]));
    if (!s) return (Sw(), (0, Fe.jsx)(hw, {}));
    if (e.onboarding) return (0, Fe.jsx)(ww, {});
    return (0, Fe.jsxs)(Fe.Fragment, {
      children: [
        i.view === "none"
          ? (0, Fe.jsx)(Yw, {})
          : (0, Fe.jsx)(LU.GameScreen, {}),
        (0, Fe.jsx)(LU.TutorialGate, {}),
      ],
    });
  }
  var Dw = R(z());
  globalThis.__LU_REACT = ge;
  globalThis.__LU_JSX = O;
  LU.setDeps({
    Button: D,
    Sheet: ce,
    Avatar: oe,
    LevelBadge: yn,
    Confetti: Xg,
    XpChip: Un,
    Toggle: Dg,
    useAccount: st,
    currentAccount: () => X.getState().account,
    useProgress: gi,
    useSocial: ei,
    friends: () => dg(),
    nav: L,
    toast: ss,
    celebrate: aE,
    afterGame: at,
    recordMatch: (e) => {
      (e.casual || (Ie.match(e), X.recordMatch(e.won)), li.gameCompleted(e.matchId));
    },
    tone: ke,
    noise: gn,
    fanfare: () => Ve.win(),
    vibrate: lr,
    sound: { on: Sg, set: Nm, subscribe: Om },
    music: {
      on: Ri,
      set: Lm,
      play: (e) => Kg(e, "rounds"),
      stop: Hm,
      sting: (e) => Pt(e),
    },
    botNames: hk,
    share: async (e) => {
      try {
        if (navigator.share) {
          await navigator.share({ text: e });
          return;
        }
      } catch (i) {
        if (i?.name === "AbortError") return;
      }
      try {
        (await navigator.clipboard.writeText(e),
          ss.success("Copied. Paste it anywhere to share."));
      } catch {
        ss.show("Couldn't open sharing on this device.");
      }
    },
    openPlayer: (e) =>
      L.push({ name: "player", id: bm({ ...e, region: "", sampleId: e.id }) }),
    blockedIds: () => new Set(lc().map((e) => e.id)),
  });""")

open(OUT, "w").write(src)
print("stage two ok", len(src))

src = open(OUT).read()
rep("""  function rh() {
    return (0, ge.useSyncExternalStore)(x.subscribe, x.getState, x.getState);
  }
""", "")
open(OUT, "w").write(src)
print("rh removed")

src = open(OUT).read()
rep("""        return `${i} challenged you to a 1v1. Accept to play.`;""", """        return `${i} invited you to a match.`;""")
rep("""        return `Your 1v1 with ${i} is finished. See who won.`;""", """        return `Your match with ${i} is finished.`;""")
rep("""        return `Your 1v1 with ${i} expires soon.`;""", """        return `Your invite from ${i} expires soon.`;""")
open(OUT, "w").write(src)
print("copy ok")
