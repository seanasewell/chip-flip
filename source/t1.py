import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"PAGEERROR {e}"))
        await pg.goto("file:///home/claude/lw/build/index.html")
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path="shots/01-welcome.png")
        await pg.get_by_text("Play as a guest").click()
        await pg.wait_for_timeout(600)
        await pg.fill('input[aria-label="Display name"]', "Sean")
        await pg.get_by_text("Continue").click()
        await pg.wait_for_timeout(500)
        await pg.get_by_text("Skip for now").click()
        await pg.wait_for_timeout(900)
        await pg.screenshot(path="shots/02-tutorial.png")
        print("\n".join(errs[:20]))
        await b.close()
asyncio.run(main())
