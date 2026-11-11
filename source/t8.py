import asyncio, sys
from playwright.async_api import async_playwright
from helpers import boot
async def main():
    async with async_playwright() as p:
        for (W,H) in [(430,932),(1280,860),(375,667)]:
            b, ctx, pg, errs = await boot(p, W, H)
            await pg.locator('button:has-text("Players on a crowded board")').click() if False else None
            await pg.locator('button:has-text("Two teams of two")').click(); await pg.wait_for_timeout(300)
            await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2300)
            for i in range(6):
                cards = pg.locator("button.lu-card:not([disabled])")
                if await cards.count():
                    await cards.first.click(); await pg.wait_for_timeout(100)
                    sel = pg.locator('[role=gridcell][aria-label*="selected space"]')
                    if await sel.count(): await sel.click()
                await pg.wait_for_timeout(900)
            cards = pg.locator("button.lu-card:not([disabled])")
            for i in range(20):
                if await cards.count(): break
                await pg.wait_for_timeout(300)
            if await cards.count(): await cards.first.click()
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"shots/size-{W}x{H}.png")
            sh = await pg.evaluate("() => [document.scrollingElement.scrollHeight, innerHeight]")
            print(W,H,"scroll",sh, errs[:3])
            await b.close()
asyncio.run(main())
