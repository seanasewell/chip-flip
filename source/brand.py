"""Lineup brand: editorial neo-brutalist with a dash of the 90s desktop.
Remaps the inherited palette and fonts at build time so every shell and
Lineup screen shares one look.

Palette: warm paper on a faint grid, near-black ink, electric blue, hot
pink and acid yellow. Fonts: Anton (condensed display, uppercase), Space
Grotesk (body) and Space Mono (labels).
"""
import re

INK = "17 17 17"  # #111111

HEX = {
    "#3d8bff": "#3355FF",  # brand blue -> electric blue
    "#5cc8ff": "#3355FF",
    "#3ee6b8": "#19C37D",
    "#0d1e3d": "#111111",
    "#081428": "#F3F1EA",
    "#0c1a34": "#FFFDF6",
    "#173a72": "#E9E6DC",
    "#5c9eff": "#5C77FF",
    "#2f6feb": "#3355FF",
    "#0b1a33": "#111111",
    "#6f93c9": "#111111",
    "#8fa9d1": "#111111",
    "#b9cbe6": "#111111",
    "#eaf1ff": "#111111",
}
RGB = {
    "61,139,255": "51,85,255",
    "61 139 255": "51 85 255",
    "62,230,184": "25,195,125",
    "62 230 184": "25 195 125",
    "4,10,22": "243,241,234",
}

FONT_LINK_OLD = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap"
FONT_LINK_NEW = "https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"


def recolor(text: str) -> str:
    for old, new in HEX.items():
        text = re.sub(re.escape(old) + r"(?![0-9a-fA-F])", new, text, flags=re.I)
    for old, new in RGB.items():
        text = re.sub(r"(rgba?\(\s*)" + re.escape(old) + r"(?=\s*[,/)])", lambda m: m.group(1) + new, text)
    return text


def refont(text: str) -> str:
    return text.replace(FONT_LINK_OLD, FONT_LINK_NEW).replace("Bricolage Grotesque", "Anton").replace("Manrope", "Space Grotesk")


def ink_utilities(css: str) -> str:
    """The app was written white-on-dark. On the light paper, every
    translucent-white text/border/fill utility becomes ink at the same
    opacity. Solid bg-white (cards, sign-in buttons) stays white."""
    def fix(m):
        sel, body = m.group(1), m.group(2)
        if "white" in sel and not re.fullmatch(r"\s*\.bg-white\s*", sel.split("}")[-1].split("{")[-1]):
            body = body.replace("255 255 255", INK).replace("#fff", "#111111")
            body = re.sub(r"hsla\(0,\s*0%,\s*100%,\s*([.\d]+)\)", r"rgba(17,17,17,\1)", body)
            body = re.sub(r"rgba\(255,\s*255,\s*255,\s*([.\d]+)\)", r"rgba(17,17,17,\1)", body)
        return f"{sel}{{{body}}}"

    return re.sub(r"([^{}]+)\{([^{}]*)\}", fix, css)
