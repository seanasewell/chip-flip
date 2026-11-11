import asyncio
from playwright.async_api import async_playwright
async def boot(p, W=390, H=844, name="Sean"):
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = await ctx.new_page()
    errs=[]
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
    pg.on("pageerror", lambda e: errs.append(f"PAGEERROR {e}"))
    await pg.goto("file:///home/claude/lw/build/index.html")
    await pg.wait_for_timeout(500)
    await pg.get_by_text("Play as a guest").click()
    await pg.fill('input[aria-label="Display name"]', name)
    await pg.get_by_text("Continue").click()
    await pg.get_by_text("Skip for now").click()
    await pg.wait_for_timeout(300)
    await pg.get_by_role("button", name="Skip").click()
    await pg.wait_for_timeout(300)
    return b, ctx, pg, errs

async def my_move(pg):
    """If it's my turn: pick the first enabled card and place it. Returns True if moved."""
    cards = pg.locator("button.lu-card:not([disabled])")
    if await cards.count() == 0: return False
    await cards.first.click()
    await pg.wait_for_timeout(80)
    sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
    if await sel.count() == 0: return False
    await sel.click()
    return True
