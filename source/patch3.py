"""Stage three: tactile 3D buttons for the shell button component."""
import sys
OUT = "build/app.lineup.js"
src = open(OUT).read()

def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n != count:
        sys.exit(f"expected {count}, found {n}:\n{old[:300]}")
    src = src.replace(old, new)

# Button: one tactile system for every screen (primary / secondary / reward).
rep('''    let t =
        "h-12 rounded-2xl px-5 font-semibold transition active:scale-[.97] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-iris/70",
      a = {
        primary:
          "bg-gradient-to-b from-[#5C9EFF] to-[#2F6FEB] text-white shadow-[0_8px_24px_-8px_rgba(61,139,255,.7),inset_0_1px_0_rgba(255,255,255,.25)] hover:brightness-110 disabled:bg-none disabled:bg-iris/50 disabled:shadow-none disabled:hover:brightness-100",
        gold: "bg-gradient-to-b from-[#FFC870] to-[#F4A23A] text-[#2A1A05] shadow-[0_8px_24px_-8px_rgba(255,181,71,.7),inset_0_1px_0_rgba(255,255,255,.4)] hover:brightness-105 disabled:opacity-50",
        ghost: "surface text-white/90 hover:bg-iris/[.16] disabled:opacity-50",
      }[e];''', '''    let t = "lu-btn h-12 rounded-2xl px-5 text-[16px]",
      a = {
        primary: "lu-btn-primary",
        gold: "lu-btn-reward",
        ghost: "lu-btn-secondary",
        danger: "lu-btn-danger",
      }[e];''')

# Level token: subtle collectible bevel comes from tokens.css (.level-badge).
open(OUT, "w").write(src)
print("stage three ok")
