import asyncio, json
from playwright.async_api import async_playwright
from helpers import boot
MOVE = """() => { const s=LU.game.get(); const m=s.match; if(!m||s.view!=='play'||s.busy) return 'wait';
  if(s.handoff){ LU.game.reveal(); return 'reveal'; }
  if(m.phase==='roundOver'){ if(s.roundCard){ LU.game.continueRound(); return 'next'; } return 'wait'; }
  if(m.phase!=='playing') return m.phase;
  const id=m.order[m.turn]; if(id!==s.viewer) return 'bot';
  const c=LU.chooseMove(m,id,'hard'); LU.game.selectCard(c); LU.game.tapCell(c); return 'moved'; }"""
STATS = "() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.progress.')); const p=JSON.parse(localStorage.getItem(k)); return {xp:p.xp, stats:p.stats, unlocked:Object.keys(p.unlocked), daily:p.daily} }"
async def run_match(pg):
    for i in range(800):
        r = await pg.evaluate(MOVE)
        if await pg.get_by_text("Back to Play").count(): return True
        await pg.wait_for_timeout(120)
    return False
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p)
        await pg.locator('button:has-text("You against one opponent")').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role("tab", name="Easy").click()
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2200)
        print("match1 done:", await run_match(pg))
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path="shots/v-01-celebrate.png")
        c = pg.get_by_role("button", name="Continue")
        if await c.count(): await c.click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-02-results.png")
        s = await pg.evaluate(STATS)
        print("after match1:", s["xp"], {k:s["stats"][k] for k in ["matchesPlayed","matchWins","roundsWon","roundsPlayed","linesCompleted","diagonalWins","perfectMatches","winStreak","bestWinStreak"]}, s["unlocked"])
        await pg.get_by_role("button", name="Back to Play").click(); await pg.wait_for_timeout(1200)
        # Friends: open, play together with a friend on this device
        await pg.get_by_role("button", name="Profile").click(); await pg.wait_for_timeout(300)
        await pg.get_by_text("8 friends").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-03-friends.png")
        await pg.locator("div[role=button]").first.click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-04-friend-profile.png")
        await pg.get_by_role("button", name="Play together").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-05-setup-friend.png")
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2200)
        await pg.screenshot(path="shots/v-06-handoff-or-turn.png")
        print("match2 done:", await run_match(pg))
        await pg.wait_for_timeout(1600)
        c = pg.get_by_role("button", name="Continue")
        if await c.count(): await c.click(); await pg.wait_for_timeout(400)
        s = await pg.evaluate(STATS)
        print("after match2:", s["xp"], {k:s["stats"][k] for k in ["matchesPlayed","matchWins","friendMatches","winStreak"]}, s["unlocked"])
        await pg.get_by_role("button", name="Back to Play").click(); await pg.wait_for_timeout(1000)
        await pg.get_by_role("button", name="Ranks").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-07-ranks.png")
        await pg.get_by_role("tab", name="Streak").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="shots/v-08-ranks-streak.png")
        await pg.get_by_role("button", name="Profile").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/v-09-profile.png", full_page=True)
        await pg.reload(); await pg.wait_for_timeout(1200)
        s2 = await pg.evaluate(STATS)
        print("after reload same:", s2["stats"]["matchesPlayed"]==s["stats"]["matchesPlayed"], s2["xp"]==s["xp"])
        print("\n".join(errs[:20]))
        await b.close()
asyncio.run(main())
