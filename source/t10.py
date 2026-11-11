import asyncio, sys, json
from playwright.async_api import async_playwright
from helpers import boot
W=int(sys.argv[1]) if len(sys.argv)>1 else 390; H=int(sys.argv[2]) if len(sys.argv)>2 else 844
MODE=sys.argv[3] if len(sys.argv)>3 else "h2h"
MOVE = """() => { const s=LU.game.get(); const m=s.match; if(!m||s.view!=='play'||s.busy) return 'wait';
  if(s.handoff){ LU.game.reveal(); return 'reveal'; }
  if(m.phase!=='playing') return m.phase; const id=m.order[m.turn]; if(id!==s.viewer) return 'bot';
  const a=LU.chooseAction(m,id,'hard'); if(!a) return 'none';
  LU.game.selectCard(a.card);
  if(a.kind==='swap') LU.game.swapDead(); else LU.game.tapCell(a.cell);
  return 'moved'; }"""
NAMES={"h2h":"You against one opponent","ffa3":"Every player for themselves","teams":"Two teams of two","teams3v3":"Two teams of three","teams3":"Three teams of two"}
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p, W, H)
        await pg.screenshot(path=f"shots/q-{W}-home.png")
        await pg.locator(f'button:has-text("{NAMES[MODE]}")').click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/q-{W}-{MODE}-setup.png", full_page=True)
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(4000)
        moved=0
        for i in range(60):
            r=await pg.evaluate(MOVE)
            if r=='moved': moved+=1
            if moved>=8: break
            await pg.wait_for_timeout(200)
        for i in range(30):
            if await pg.locator("button.lu-card:not([disabled])").count(): break
            await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/q-{W}-{MODE}-turn.png")
        await pg.locator("button.lu-card:not([disabled])").first.click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"shots/q-{W}-{MODE}-selected.png")
        await pg.locator("button.lu-card:not([disabled])").first.click(); await pg.wait_for_timeout(100)
        seqshot=False
        for i in range(1500):
            if await pg.get_by_text("Back to Play").count(): break
            r=await pg.evaluate(MOVE)
            if not seqshot:
                n = await pg.evaluate("() => LU.game.get().match?.sequences.length||0")
                if n>0:
                    await pg.wait_for_timeout(2400); await pg.screenshot(path=f"shots/q-{W}-{MODE}-seq.png"); seqshot=True
            await pg.wait_for_timeout(120)
        await pg.wait_for_timeout(1500)
        c = pg.get_by_role("button", name="Continue")
        if await c.count(): await c.click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"shots/q-{W}-{MODE}-results.png")
        st = await pg.evaluate("() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.progress.')); return JSON.parse(localStorage.getItem(k)) }")
        print(MODE, "done", await pg.get_by_text("Back to Play").count(), {k:st['stats'][k] for k in ['matchesPlayed','matchWins','sequences','wildJacks','removals']}, list(st['unlocked']))
        print("\n".join(errs[:10]))
        await b.close()
asyncio.run(main())
