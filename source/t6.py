import asyncio
from playwright.async_api import async_playwright
from helpers import boot
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p)
        pg.on("pageerror", lambda e: print("STACK", e.stack[:1500] if hasattr(e,'stack') else e))
        await pg.get_by_role("button", name="Profile").click(); await pg.wait_for_timeout(300)
        await pg.get_by_role("button", name="Settings").click(); await pg.wait_for_timeout(300)
        await pg.get_by_text("Privacy policy").click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path="shots/dbg.png")
        await b.close()
asyncio.run(main())
