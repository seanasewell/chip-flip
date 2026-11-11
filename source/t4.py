import asyncio, sys, json
from playwright.async_api import async_playwright
from helpers import boot
W=int(sys.argv[1]) if len(sys.argv)>1 else 390; H=int(sys.argv[2]) if len(sys.argv)>2 else 844
MODE=sys.argv[3] if len(sys.argv)>3 else "h2h"
async def play(pg, tag, maxsteps=600, stop_after_round=False):
    shot=False
    for step in range(maxsteps):
        if await pg.get_by_text("Back to Play").count(): return "done"
        if await pg.get_by_role("button", name="Next round").count():
            if stop_after_round: return "round"
            await pg.get_by_role("button", name="Next round").click(); await pg.wait_for_timeout(250); continue
        ho = pg.get_by_role("button", name="show my cards")
        if await ho.count():
            if not shot: await pg.screenshot(path=f"shots/{W}-{tag}-handoff.png")
            await ho.click(); await pg.wait_for_timeout(200)
        cards = pg.locator("button.lu-card:not([disabled])")
        if await cards.count():
            if not shot:
                await pg.screenshot(path=f"shots/{W}-{tag}-turn.png"); shot=True
            await cards.first.click(); await pg.wait_for_timeout(100)
            sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
            if await sel.count(): await sel.click()
        await pg.wait_for_timeout(200)
    return "timeout"
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p, W, H)
        title = {"h2h":"Head to head","ffa3":"3-player free-for-all","ffa4":"4-player free-for-all","teams":"2v2 teams"}[MODE]
        await pg.get_by_text(title).first.click(); await pg.wait_for_timeout(400)
        if len(sys.argv)>4 and sys.argv[4]=="local":
            await pg.get_by_role("tab", name="On this device").first.click()
            await pg.fill('input[aria-label="Player 2 name"]', "Alex")
        await pg.screenshot(path=f"shots/{W}-{MODE}-setup.png", full_page=True)
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2300)
        r = await play(pg, MODE, stop_after_round=True)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"shots/{W}-{MODE}-round.png")
        r = await play(pg, MODE)
        print("result", r)
        await pg.wait_for_timeout(1500)
        cont = pg.get_by_role("button", name="Continue")
        if await cont.count(): await cont.click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/{W}-{MODE}-results.png", full_page=False)
        print("\n".join(errs[:20]))
        await b.close()
asyncio.run(main())
