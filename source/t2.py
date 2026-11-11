import asyncio, sys
from playwright.async_api import async_playwright
W,H = int(sys.argv[1]) if len(sys.argv)>1 else 390, int(sys.argv[2]) if len(sys.argv)>2 else 844
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"PAGEERROR {e}"))
        await pg.goto("file:///home/claude/lw/build/index.html")
        await pg.wait_for_timeout(800)
        await pg.get_by_text("Play as a guest").click()
        await pg.fill('input[aria-label="Display name"]', "Sean")
        await pg.get_by_text("Continue").click()
        await pg.get_by_text("Skip for now").click()
        await pg.wait_for_timeout(500)
        # tutorial
        await pg.get_by_text("Show me").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"shots/{W}-03-tut-select.png")
        await pg.locator("button.lu-card").first.click(); await pg.wait_for_timeout(300)  # wrong card -> nudge
        await pg.locator('button.lu-card[aria-label^="King of stars"]').click(); await pg.wait_for_timeout(300)
        await pg.locator('[role=gridcell][aria-label*="selected space"]').click(); await pg.wait_for_timeout(1100)
        await pg.screenshot(path=f"shots/{W}-04-tut-coach.png")
        await pg.get_by_role("button", name="Next").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/{W}-05-tut-block.png")
        cards = pg.locator("button.lu-card")
        n = await cards.count()
        # find the block card: target cell 8 = row1 col3
        for i in range(n):
            await cards.nth(i).click(); await pg.wait_for_timeout(150)
            sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
            if await sel.count():
                await sel.click(); break
        await pg.wait_for_timeout(500)
        await pg.get_by_role("button", name="Next").click(); await pg.wait_for_timeout(400)
        for i in range(await cards.count()):
            await cards.nth(i).click(); await pg.wait_for_timeout(150)
            sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
            if await sel.count():
                await sel.click(); break
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"shots/{W}-06-tut-win.png")
        await pg.wait_for_timeout(600)
        await pg.get_by_role("button", name="Next").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/{W}-07-tut-match.png")
        await pg.get_by_role("button", name="Done").click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=f"shots/{W}-08-home.png", full_page=True)
        print("\n".join(errs[:20]))
        await ctx.storage_state(path=f"build/state-{W}.json")
        await b.close()
asyncio.run(main())
