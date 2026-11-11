import asyncio, sys, json
from playwright.async_api import async_playwright
from helpers import boot, my_move
W=int(sys.argv[1]) if len(sys.argv)>1 else 390; H=int(sys.argv[2]) if len(sys.argv)>2 else 844
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p, W, H)
        await pg.get_by_text("Head to head").first.click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"shots/{W}-10-setup.png", full_page=True)
        await pg.get_by_role("button", name="Start match").click()
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"shots/{W}-11-intro.png")
        await pg.wait_for_timeout(1400)
        shots = {"turn":False,"select":False,"round":False}
        for step in range(400):
            if await pg.get_by_text("Back to Play").count(): break
            nxt = pg.get_by_role("button", name="Next round")
            if await nxt.count():
                if not shots["round"]:
                    await pg.screenshot(path=f"shots/{W}-14-round.png"); shots["round"]=True
                await nxt.click(); await pg.wait_for_timeout(300); continue
            cards = pg.locator("button.lu-card:not([disabled])")
            if await cards.count():
                if not shots["turn"]:
                    await pg.screenshot(path=f"shots/{W}-12-turn.png"); shots["turn"]=True
                await cards.first.click(); await pg.wait_for_timeout(120)
                if not shots["select"]:
                    await pg.screenshot(path=f"shots/{W}-13-selected.png"); shots["select"]=True
                sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
                if await sel.count(): await sel.click()
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1600)
        await pg.screenshot(path=f"shots/{W}-15-results.png")
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f"shots/{W}-16-celebrate.png")
        prog = await pg.evaluate("() => { const k = Object.keys(localStorage).find(k=>k.startsWith('lu.progress.')); return localStorage.getItem(k) }")
        print("progress:", json.dumps(json.loads(prog)["stats"])[:600])
        print("xp:", json.loads(prog)["xp"], "unlocked:", list(json.loads(prog)["unlocked"].keys()))
        print("\n".join(errs[:20]))
        await b.close()
asyncio.run(main())
