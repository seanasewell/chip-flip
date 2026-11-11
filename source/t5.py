import asyncio, sys, json
from playwright.async_api import async_playwright
from helpers import boot, my_move
W,H=390,844
async def main():
    async with async_playwright() as p:
        b, ctx, pg, errs = await boot(p, W, H)
        # start h2h vs easy bot, make two moves, then reload
        await pg.get_by_text("Head to head").first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role("tab", name="Easy").click()
        await pg.get_by_role("button", name="Start match").click(); await pg.wait_for_timeout(2200)
        moved=0
        for i in range(40):
            if await my_move(pg): moved+=1
            await pg.wait_for_timeout(300)
            if moved>=2: break
        await pg.wait_for_timeout(1500)
        board_before = await pg.evaluate("() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.match.')); return JSON.parse(localStorage.getItem(k)).match.board }")
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path="shots/r-01-after-reload.png")
        ok = await pg.get_by_text("Resume match").count()
        print("resume card after reload:", ok)
        await pg.get_by_role("button", name="Resume").click() if False else await pg.get_by_text("Resume match").click()
        await pg.wait_for_timeout(800)
        board_after = await pg.evaluate("() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.match.')); return JSON.parse(localStorage.getItem(k)).match.board }")
        print("board preserved:", board_before == board_after, sum(x is not None for x in board_after))
        await pg.screenshot(path="shots/r-02-resumed.png")
        # menu -> leave
        await pg.get_by_role("button", name="Match menu").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path="shots/r-03-menu.png")
        await pg.get_by_text("Leave match").click(); await pg.wait_for_timeout(600)
        print("resume after leave:", await pg.get_by_text("Resume match").count())
        # start new match -> should warn about forfeit
        await pg.locator('button:has-text("You against one opponent")').click(); await pg.wait_for_timeout(300)
        print("forfeit warning:", await pg.get_by_text("Starting a new one forfeits it").count())
        await pg.get_by_role("button", name="Back").first.click(); await pg.wait_for_timeout(300)
        # resume and forfeit via menu
        await pg.get_by_text("Resume match").click(); await pg.wait_for_timeout(800)
        await pg.get_by_role("button", name="Match menu").click(); await pg.wait_for_timeout(300)
        await pg.get_by_text("Forfeit match").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="shots/r-04-forfeit-confirm.png")
        await pg.get_by_role("button", name="Forfeit", exact=True).click(); await pg.wait_for_timeout(2000)
        c = pg.get_by_role("button", name="Continue")
        if await c.count(): await c.click()
        await pg.wait_for_timeout(300)
        await pg.screenshot(path="shots/r-05-forfeit-results.png")
        st = await pg.evaluate("() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.progress.')); return JSON.parse(localStorage.getItem(k)).stats }")
        print("after forfeit:", {k:st[k] for k in ['matchesPlayed','matchLosses','forfeits']})
        await pg.get_by_role("button", name="Back to Play").click(); await pg.wait_for_timeout(800)
        # reload again: stats must persist, no double count
        await pg.reload(); await pg.wait_for_timeout(1200)
        st2 = await pg.evaluate("() => { const k=Object.keys(localStorage).find(k=>k.startsWith('lu.progress.')); return JSON.parse(localStorage.getItem(k)).stats }")
        print("after reload:", {k:st2[k] for k in ['matchesPlayed','matchLosses','forfeits']}, "resume card:", await pg.get_by_text("Resume match").count())
        # tabs
        await pg.get_by_role("button", name="Ranks").click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path="shots/r-06-ranks.png", full_page=True)
        await pg.get_by_role("tab", name="Win %").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="shots/r-06b-ranks-pct.png")
        await pg.get_by_role("tab", name="Level").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="shots/r-06c-ranks-level.png")
        await pg.get_by_role("tab", name="Wins").click(); await pg.wait_for_timeout(300)
        # open a player profile
        await pg.locator("div[role=button]").nth(0).click(); await pg.wait_for_timeout(600)
        await pg.screenshot(path="shots/r-07-player.png", full_page=True)
        await pg.get_by_role("button", name="Back").first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role("button", name="Rewards").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/r-08-rewards.png")
        await pg.get_by_role("tab", name="Achievements").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path="shots/r-09-achievements.png", full_page=True)
        await pg.get_by_role("button", name="Profile").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/r-10-profile.png", full_page=True)
        await pg.get_by_role("button", name="Settings").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/r-11-settings.png", full_page=True)
        await pg.get_by_text("How stats work").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/r-12-stats-sheet.png")
        await pg.get_by_role("button", name="Close").click(); await pg.wait_for_timeout(400)
        await pg.get_by_text("How to play").first.click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="shots/r-13-rules.png")
        await pg.get_by_role("button", name="Got it").click(); await pg.wait_for_timeout(400)
        await pg.get_by_text("Privacy policy").click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path="shots/r-14-privacy.png")
        print("\n".join(errs[:20]))
        await b.close()
asyncio.run(main())
