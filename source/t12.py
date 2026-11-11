import asyncio
from playwright.async_api import async_playwright
from helpers import boot
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p)
        await pg.screenshot(path="shots/b-play.png")
        for tab in ["Ranks","Rewards","Profile"]:
            await pg.get_by_role("button", name=tab).click(); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f"shots/b-{tab}.png")
        await pg.get_by_role("button", name="Settings").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/b-settings.png")
        await pg.get_by_role("button", name="Back").first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_text("8 friends").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/b-friends.png")
        print(errs[:5])
        await b.close()
asyncio.run(main())
