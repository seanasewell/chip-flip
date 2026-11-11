import asyncio, sys
from playwright.async_api import async_playwright
from helpers import boot
W=int(sys.argv[1]) if len(sys.argv)>1 else 390; H=int(sys.argv[2]) if len(sys.argv)>2 else 844
MOVE = """() => { const s=LU.game.get(); const m=s.match; if(!m||s.view!=='play'||s.busy) return 'wait';
  if(m.phase!=='playing') return m.phase; const id=m.order[m.turn]; if(id!==s.viewer) return 'bot';
  const c=LU.chooseMove(m,id,'medium'); LU.game.selectCard(c); LU.game.tapCell(c); return 'moved'; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        await pg.goto("file:///home/claude/lw/build/index.html"); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=f"shots/d-{W}-01-welcome.png")
        await pg.get_by_text("Play as a guest").click()
        await pg.fill('input[aria-label="Display name"]', "Sean")
        await pg.get_by_text("Continue").click(); await pg.get_by_text("Skip for now").click()
        await pg.wait_for_timeout(300); await pg.get_by_role("button", name="Skip").click(); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f"shots/d-{W}-02-play.png")
        await pg.evaluate("() => document.querySelector('main').scrollTo(0, 2000)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"shots/d-{W}-03-play-bottom.png")
        await pg.evaluate("() => document.querySelector('main').scrollTo(0, 0)")
        await pg.locator('button:has-text("You against one opponent")').click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"shots/d-{W}-04-setup.png")
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2300)
        n=0
        for i in range(200):
            r = await pg.evaluate(MOVE)
            if r=='moved': n+=1
            if n>=4 and r=='moved': break
            await pg.wait_for_timeout(150)
        for i in range(30):
            if await pg.locator("button.lu-card:not([disabled])").count(): break
            await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"shots/d-{W}-05-turn.png")
        await pg.locator("button.lu-card:not([disabled])").first.click(); await pg.wait_for_timeout(350)
        await pg.screenshot(path=f"shots/d-{W}-06-selected.png")
        # play until a round card
        for i in range(400):
            if await pg.get_by_role("button", name="Next round").count(): break
            await pg.evaluate(MOVE); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"shots/d-{W}-07-round.png")
        await b.close()
asyncio.run(main())
