"""Turns the copied Last word bundle into the Lineup shell.

Works on the prettified bundle (app.pretty.js). Step 1 removes word-game
systems by line range (each range is checked against its expected first
line). Step 2 rewires the shell with exact-match string replacements; every
replacement must match the expected number of times or the build stops.
"""
import re
import sys

SRC = "app.pretty.js"
OUT = "build/app.lineup.js"
lines = open(SRC).read().split("\n")

# ----------------------------------------------------------------- step 1
# (start, end_exclusive, expected start text, replacement lines)
OPS = [
    (9241, 9531, "  var ok = [", []),  # source words, dictionary, bot skill
    (9531, 9586, "  var mk = ", []),  # word scoring and validation
    (9586, 9634, "  var Xa = [", ["  var hk = ["]),  # bot word styles (keep names)
    (9685, 9784, "  function em(e)", []),  # word bots
    (9804, 9929, "  var wk = [", [
        "  var wk = LU.LEVEL_TITLES,",
        "    Po = (e) => wk.find(([i]) => e >= i)[1],",
        "    sm = () => LU.blankStats(),",
        "    Ps = LU.ACHIEVEMENTS,",
        "    nm = LU.ACHIEVEMENT_SERIES;",
    ]),
    (9939, 10123, "  var er = [", [
        "  var er = LU.DAILY,",
        "    Hs = LU.WEEKLY,",
        "    Xo = LU.DAILY_BONUS,",
        "    _o = LU.WEEKLY_BONUS,",
    ]),
    (10364, 10446, "  function Ik(e)", []),  # word round/match progress
    (10539, 10546, "  function gg(e, i, s)", []),
    (10546, 10617, "  function mm()", [
        "  function mm() {",
        "    // Sample players only: no fabricated requests, challenges or",
        "    // activity. Friends start as a handful of sample players.",
        "    let e = Yk();",
        "    return {",
        "      v: 2,",
        "      people: e,",
        "      friends: e.slice(0, 8).map((r) => r.id),",
        "      incoming: [],",
        "      outgoing: [],",
        "      challenges: [],",
        "      notes: [],",
        "    };",
        "  }",
    ]),
    (10672, 10764, "  function pm()", []),  # simulated friend/challenge activity
    (10777, 10833, "  function sn(e)", []),  # 1v1 challenge results
    (10916, 10975, "  function mg(e, i)", []),  # challenge actions
    (10983, 10993, "  function Ig(e", []),
    (11003, 11004, "  var kg = ", []),
    (11004, 11483, "  var Zk = 6e4", ['  var W = "you";']),  # word game engine
    (12391, 12428, "  function mn(", [
        "  function mn({ size: e = 38 }) {",
        "    return (0, O.jsx)(LU.Wordmark, { height: e });",
        "  }",
    ]),
    (12591, 12697, "  var th = [", [
        "  function nh() {",
        "    return (0, O.jsx)(LU.WelcomeLogo, {});",
        "  }",
    ]),
    (13922, 14455, "  var Y = R(z());", []),  # word gameplay screens
    (14691, 14963, "  function CE()", []),  # word share images
    (14963, 15706, "  var m = R(z()),", ["  var m = R(z());"]),  # word results screens
    (15757, 15944, "  function vh(", []),
    (16681, 17449, "  function ia(e, i)", []),  # 1v1 challenge screens
    (18694, 18946, "  function Kn(e)", []),  # word leaderboards
    (19230, 19376, "  function iy(", []),
    (19411, 19759, "  var ty = {", []),  # word ranks screen
]

for start, end, expect, repl in sorted(OPS, key=lambda o: -o[0]):
    got = lines[start - 1]
    if not got.startswith(expect):
        sys.exit(f"line {start}: expected {expect!r}, got {got!r}")
    lines[start - 1 : end - 1] = repl

src = "\n".join(lines)

# ----------------------------------------------------------------- step 2
def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n != count:
        sys.exit(f"expected {count} match(es), found {n}:\n{old[:200]}")
    src = src.replace(old, new)


def rx(pattern, new, count=1):
    global src
    out, n = re.subn(pattern, lambda _m: new, src, flags=re.S)
    if n != count:
        sys.exit(f"regex expected {count}, found {n}: {pattern[:120]}")
    src = out


# --- storage keys: new namespace so Lineup never reads Last word data.
src = src.replace('"lw.', '"lu.').replace("`lw.", "`lu.")

# --- music: drop the championship track (word-game specific).
rep("    CHAMPIONSHIP_MP3: () => Jk,\n", "")
rep('        (Jk = "__BLOB1__"),\n', "")
rep('''          t = {
            rounds: s.ROUNDS_MP3,
            championship: s.CHAMPIONSHIP_MP3,
            win: s.WIN_MP3,''', '''          t = {
            rounds: s.ROUNDS_MP3,
            win: s.WIN_MP3,''')
rep('for (let e of ["rounds", "win", "loss", "championship"]) await Zg(e);', 'for (let e of ["rounds", "win", "loss"]) await Zg(e);')

# --- sound toggle preview
rep("(un.forEach((i) => i()), e && Ve.word(4));", "(un.forEach((i) => i()), e && LU.sfx.select());")

# --- progress store: Lineup match handler; guest merge uses Lineup stats.
rep('''    round(i) {
      this.apply(`round:${i.matchId}:${i.round}`, (s, t) => kk(s, t, i));
    }
    match(i) {
      this.apply(`match:${i.matchId}`, (s, t) => Ek(s, t, i), !0);
    }
    solo(i) {
      this.apply(`solo:${i.matchId}`, (s, t) => yk(s, t), !0);
    }''', '''    match(i) {
      this.apply(`match:${i.matchId}`, (s, t) => LU.applyMatch(s, t, i), !0);
    }''')
rep('''    let a = { ...t.stats };
    for (let [g, d] of Object.entries(s.stats))
      typeof d == "number" &&
        (a[g] = g === "streakBest" ? Math.max(a[g] ?? 0, d) : (a[g] ?? 0) + d);''', '''    let a = LU.mergeStats(t.stats, s.stats);''')

# --- social: sample players, honest friends (no simulated acceptance)
rep('''      style: s % Xa.length,
      level: [0.7, 0.85, 1, 1.15, 1.3][s % 5],''', '''      sample: !0,''')
rep('''        if (i?.v === 1) return i;''', '''        if (i?.v === 2) return i;''')
rep('''        ((en = e), (Je = Cm()), pm(), Oe(), dm || (dm = setInterval(pm, 1e3)));''', '''        ((en = e), (Je = Cm()), Oe());''')
rep('''  function dg() {
    return ee()
      .friends.map((e) => ({ ...Xi(e), ...Ms(e) }))''', '''  function dg() {
    return ee()
      .friends.map((e) => Xi(e))
      .filter(Boolean)''')
rep('''      yourTurn: e.filter((i) => i.needsResponse || i.yourTurn).length,
      active: e.filter(
        (i) =>
          (i.status === "pending" || i.status === "accepted") &&
          Date.now() < i.expiresAt,
      ).length,
      friends: ee().friends.length,
      requests: ee().incoming.length,
      record: Ms(),''', '''      friends: ee().friends.length,
      requests: ee().incoming.length,''')
rep('''  function Mm() {
    let e = ug();
    return {''', '''  function Mm() {
    return {''')
rep('''          style: i.people.length % Xa.length,
          level: 1,''', '''          sample: !0,
          sampleId: e.sampleId ?? e.id,''')
# Adding a sample player as a friend happens locally and at once; nothing is
# "sent" to anyone.
rep('''  function pg(e) {
    let i = ee();
    an(e) === "none" && (i.outgoing.push({ id: e, at: Date.now() }), Oe());
  }''', '''  function pg(e) {
    let i = ee();
    an(e) === "none" &&
      (i.friends.push(e), Oe(), ss.success("Added to your friends"));
  }''')
rep('''    for (let s of i.challenges)
      s.otherId === e &&
        (s.status === "pending" || s.status === "accepted") &&
        (s.status = "cancelled");
    Oe();''', '''    Oe();''')
rep('''  var Zm =
      "Think you can beat me? \\u{1F9E0}\\u26A1 I'm playing Last Word, a competitive word game. Download it and challenge me!",
    Km = "https://seanasewell.github.io/last-word/";''', '''  var Zm =
    "Think you can out-think me? \\u{1F9E0} I'm playing Lineup: play a card, claim a space, line up five. Come play me!";''')
rep('''    let e = `${Zm}
${Km}`;''', '''    let e = Zm;''')

# --- accounts
rep('''        return (delete A[s.id], Di(ar, A), this.signIn(i));''', '''        return (delete A[s.id], Di(ar, A), Jm(`lu.match.${s.id}`), this.signIn(i));''')
rep('''        (this.persist(o), cm(s.id, a.id));
        let n = Math.max(
          Number(Ot(`lu.best.${s.id}`, 0)) || 0,
          Number(Ot(`lu.best.${a.id}`, 0)) || 0,
        );
        n > 0 && Di(`lu.best.${a.id}`, n);''', '''        (this.persist(o), cm(s.id, a.id));''')
rep('''        (delete s[i.id], Di(ar, s), Jm(`lu.best.${i.id}`), Hp(i.id));''', '''        (delete s[i.id],
          Di(ar, s),
          [`lu.progress.${i.id}`, `lu.match.${i.id}`, `lu.social.${i.id}`, `lu.tutorial.${i.id}`].forEach(Jm));''')
rep('''        Tp(t.id, s);
        let a = { ...t, matchesPlayed: t.matchesPlayed + 1 },''', '''        let a = { ...t, matchesPlayed: t.matchesPlayed + 1 },''')

# --- branding in shell copy
rep('"aria-label": "Last word",', '"aria-label": "Lineup",', 0)  # removed with logos
rep('''                "The simple but addicting game where you find words within a word.",''', '''                "Play a card. Claim its space. Line up five before anyone else.",''')
rep('''                "Bring your friends to Last Word and challenge them to beat your score.",''', '''                "Share Lineup with friends. Until online play is live, you can play together on one device.",''')
rep('''              "Type at least 2 letters to search everyone on Last Word.",''', '''              "Type at least 2 letters to search sample players.",''')
rep('''              " account is already saved to another Last Word player. You can switch to that player in two ways:",''', '''              " account is already saved to another Lineup player. You can switch to that player in two ways:",''')
rep('''                      children: "Enjoy Last Word without interruptions.",''', '''                      children: "Enjoy Lineup without interruptions.",''')
rep('''                "Remove all advertisements from Last Word with a one-time purchase.",''', '''                "Remove all advertisements from Lineup with a one-time purchase.",''')
rep('''      idea: "What would make Last Word better?",''', '''      idea: "What would make Lineup better?",''')
rep('''                  "Adds what you've done with this guest account (XP, wins, streak, friends and challenges) to that player. Nothing that player already has is lost.",''', '''                  "Adds what you've done with this guest account (XP, wins, streak and friends) to that player. Nothing that player already has is lost.",''')

# --- leveling sheet
rx(r'''  function bh\(\) \{\n    let e = \[\n.*?\n    \];''', '''  function bh() {
    let e = LU.XP_WAYS;''')

# --- route titles and pages
rep('''  var bE = {
    friends: "Friends",
    challenges: "1v1 challenges",
    challenge: "1v1 challenge",
    player: "Player",''', '''  var bE = {
    friends: "Friends",
    setup: "New match",
    player: "Player",''')
rep('''              children: e.name === "player" ? "Back" : bE[e.name],''', '''              children:
                e.name === "player"
                  ? "Back"
                  : e.name === "setup"
                    ? LU.MODES[e.mode].name
                    : bE[e.name],''')
rep('''        e.name === "challenge"
          ? (0, c.jsx)(
              "div",
              {
                className: "relative min-h-0 flex-1 animate-fadeIn",
                children: (0, c.jsx)(qE, { id: e.id }),
              },
              i,
            )
          : (0, c.jsx)(''', '''        (0, c.jsx)(''')
rep('''                    e.name === "challenges" &&
                      (0, c.jsx)(DE, { initial: e.tab ?? "active" }),''', '''                    e.name === "setup" &&
                      (0, c.jsx)(LU.Setup, { mode: e.mode, friendId: e.friendId }),''')

# --- friends page: label sample players and explain what is local
rep('''        (0, c.jsx)("div", {
          className: "surface mt-6 grid grid-cols-3 gap-1 rounded-2xl p-1",
          role: "tablist",
          children: [
            ["friends", `Friends${n.length ? ` \\xB7 ${n.length}` : ""}`],''', '''        (0, c.jsx)("p", {
          className: "mt-3 px-1 text-[12px] leading-relaxed text-white/60",
          children:
            "Online friends need a server and aren't live in this preview. The players here are samples, and adding one happens on this device only.",
        }),
        (0, c.jsx)("div", {
          className: "surface mt-4 grid grid-cols-3 gap-1 rounded-2xl p-1",
          role: "tablist",
          children: [
            ["friends", `Friends${n.length ? ` \\xB7 ${n.length}` : ""}`],''')
rep('''                  body: "When someone asks to be your friend, it shows up here.",''', '''                  body: "Friend requests will show up here once online play is live.",''')
rep('''                  body: "Requests you send show up here until they're accepted.",''', '''                  body: "Online friend requests are coming soon. For now, adding a sample player makes them a friend right away.",''')

# --- profile body (yours and other players')
rx(r'''  function ec\(\{\n    mine: e = !1,.*?\n  function ZE\(\{ id: e \}\) \{''', '''  function ec({
    mine: e = !1,
    avatar: i,
    name: s,
    friends: t,
    onFriends: a,
    xp: r,
    streak: o,
    stats: n,
    actions: d,
    extra: C,
    badge: A,
  }) {
    let [E, k] = (0, ne.useState)(!1);
    return (0, c.jsxs)("div", {
      children: [
        (0, c.jsxs)("div", {
          className: "flex flex-col items-center",
          children: [
            (0, c.jsx)(oe, { player: i, size: 104, ring: !0 }),
            (0, c.jsx)("div", {
              className:
                "mt-3 text-center font-display text-[22px] font-bold text-white",
              children: s,
            }),
            A &&
              (0, c.jsx)("span", {
                className:
                  "mt-1.5 rounded-full bg-white/[.08] px-2.5 py-0.5 text-[11px] font-semibold text-white/70",
                children: A,
              }),
            (0, c.jsxs)("button", {
              onClick: a,
              disabled: !a,
              className: `mt-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.06] px-3.5 py-1.5 text-[13px] font-semibold text-white ${a ? "hover:bg-iris/20" : "cursor-default"}`,
              children: [
                (0, c.jsxs)("span", {
                  className: "tabular",
                  children: [t, " ", t === 1 ? "friend" : "friends"],
                }),
                a &&
                  (0, c.jsx)("span", {
                    className: "text-white/55",
                    children: "\\u203A",
                  }),
              ],
            }),
          ],
        }),
        d,
        (0, c.jsxs)("div", {
          className: "mt-5 space-y-3",
          children: [
            (0, c.jsx)(Ng, {
              large: !0,
              xp: r,
              onClick: e ? () => k(!0) : void 0,
            }),
            e && (0, c.jsx)(Og, { open: E, onClose: () => k(!1), xp: r }),
            (0, c.jsx)(Uh, { data: o }),
          ],
        }),
        (0, c.jsx)(LU.ProfileStats, { stats: n }),
        C,
      ],
    });
  }
  function ZE({ id: e }) {''')
rx(r'''    let a = an\(e\),\n      r = Em\(e\),\n      o = Ms\(e\),.*?\n    return \(0, c\.jsxs\)\("div", \{\n      children: \[\n        \(0, c\.jsx\)\(ec, \{.*?\n        \}\),\n''', '''    let a = an(e),
      r = LU.samplePlayer(t.sampleId ?? t.id, t.name, t.hue),
      l = (0, c.jsxs)(c.Fragment, {
        children: [
          (0, c.jsxs)("div", {
            className: "mt-4 flex gap-2.5",
            children: [
              (0, c.jsx)("div", {
                className: "flex-1",
                children:
                  a === "friends"
                    ? (0, c.jsx)(D, {
                        variant: "ghost",
                        className: "w-full",
                        onClick: () => s(!0),
                        children: "Friends \\u2713",
                      })
                    : (0, c.jsx)(D, {
                        className: "w-full",
                        onClick: () => pg(e),
                        children: "Add friend",
                      }),
              }),
              a === "friends" &&
                (0, c.jsx)("div", {
                  className: "flex-1",
                  children: (0, c.jsx)(D, {
                    className: "w-full",
                    onClick: () =>
                      L.push({ name: "setup", mode: "h2h", friendId: e }),
                    children: "Play together",
                  }),
                }),
            ],
          }),
          a === "friends" &&
            (0, c.jsx)("div", {
              className: "mt-2 text-center text-[12px] text-white/60",
              children:
                "Play together on this device. Online challenges are coming soon.",
            }),
        ],
      });
    return (0, c.jsxs)("div", {
      children: [
        (0, c.jsx)(ec, {
          avatar: { glyph: t.glyph, hue: t.hue, id: t.id },
          name: t.name,
          badge: "Sample player",
          friends: r.friends,
          xp: r.xp,
          streak: r.streak,
          stats: r.stats,
          actions: l,
        }),
''')
rep('''              children: "You'll stop being friends. Your 1v1 history stays.",''', '''              children: "They'll be removed from your friends list on this device.",''')

# --- notifications copy
rep('''        body: "Friend requests and 1v1 challenges will show up here.",''', '''        body: "Friend requests and match invites will show up here once online play is live.",''')

# --- dev controls: word-game items out, tutorial in
rx(r'''                \(0, S\.jsxs\)\("div", \{\n                  className: A,\n                  children: \[\n                    \(0, S\.jsxs\)\("div", \{\n                      children: \[\n                        \(0, S\.jsx\)\("div", \{\n                          className: "font-semibold text-white",\n                          children: "Bot difficulty",.*?\n                \(0, S\.jsxs\)\("button", \{\n                  className: A,\n                  onClick: \(\) => \{\n                    \(X\.devRestartOnboarding''', '''                (0, S.jsxs)("button", {
                  className: A,
                  onClick: () => {
                    (i(), LU.tutorial.open());
                  },
                  children: [
                    (0, S.jsxs)("div", {
                      children: [
                        (0, S.jsx)("div", {
                          className: "font-semibold text-white",
                          children: "Replay tutorial",
                        }),
                        (0, S.jsx)("div", {
                          className: "text-xs text-white/80",
                          children: "Opens the first-launch tutorial again",
                        }),
                      ],
                    }),
                    (0, S.jsx)("span", {
                      className: "text-white/75",
                      children: "\\u2192",
                    }),
                  ],
                }),
                (0, S.jsxs)("button", {
                  className: A,
                  onClick: () => {
                    (X.devRestartOnboarding''')
rep('''      [a, r] = (0, ui.useState)(!1),
      [o, n] = (0, ui.useState)(1);
    (0, ui.useEffect)(() => {
      e && t.account && n(Ha(t.account.id));
    }, [e, t.account]);
    let A =''', '''      [a, r] = (0, ui.useState)(!1);
    let A =''')

# --- welcome legal links: in-app pages until Lineup's are published
rep('''                (0, S.jsx)("a", {
                  href: "https://seanasewell.github.io/last-word/terms.html",
                  target: "_blank",
                  rel: "noreferrer",
                  className: "text-white/85 underline",
                  children: "Terms of use",
                }),''', '''                (0, S.jsx)("button", {
                  onClick: () => luLegalOpen("terms"),
                  className: "text-white/85 underline",
                  children: "Terms of use",
                }),''')
rep('''                (0, S.jsx)("a", {
                  href: "https://seanasewell.github.io/last-word/privacy.html",
                  target: "_blank",
                  rel: "noreferrer",
                  className: "text-white/85 underline",
                  children: "Privacy policy",
                }),''', '''                (0, S.jsx)("button", {
                  onClick: () => luLegalOpen("privacy"),
                  className: "text-white/85 underline",
                  children: "Privacy policy",
                }),''')
rep('''        (0, S.jsx)(tc, { open: e, onClose: () => i(!1), signedIn: !1 }),''', '''        (0, S.jsx)(tc, { open: e, onClose: () => i(!1), signedIn: !1 }),
        (0, S.jsx)(LuLegalSheet, {}),''')

# --- tabs
rep('''    { id: "play", label: "Play", emoji: "\\u{1F524}" },''', '''    { id: "play", label: "Play", emoji: "\\u{1F3AF}" },''')

open(OUT, "w").write(src)
print("patched step 1+2a", len(src))
