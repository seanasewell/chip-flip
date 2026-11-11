import json, subprocess, sys
from brand import recolor, refont, ink_utilities
run = lambda c, cwd=".": subprocess.run(c, shell=True, check=True, cwd=cwd)
run("node build-lu.mjs", "src")
run("python3 patch.py && python3 patch2.py && python3 patch3.py && python3 patch4.py")
open("build/tw-in.css", "w").write("@tailwind utilities;\n")
run("npx tailwindcss -c tailwind.config.cjs -i ../build/tw-in.css -o ../build/extra.css --minify 2>/dev/null", "src")
lu = open("build/lu.js").read()
app = open("build/app.lineup.js").read()
open("build/all.js", "w").write(recolor(lu + "\n;\n" + app))
run(("npx esbuild ../build/all.js " + ("" if "--debug" in sys.argv else "--minify")) + " --target=es2019 --charset=utf8 --legal-comments=none --outfile=../build/all.min.js --log-level=warning", "src")
js = open("build/all.min.js").read()
blobs = json.load(open("blobs.json"))
for k, v in blobs.items():
    if k == "__BLOB1__":
        continue
    js = js.replace(k, v)
assert "__BLOB" not in js, "unreplaced blob"
orig = open("stripped.html").read()
css = ink_utilities(open("style.css").read()) + "\n" + open("src/ui/lineup.css").read() + "\n" + ink_utilities(open("build/extra.css").read()) + "\n" + open("src/ui/tokens.css").read() + "\n" + open("src/ui/retro.css").read()
head = orig[: orig.find("<style>")]
head = head.replace("<title>Last word (copy)</title>", '<title>Chip Flip</title>\n<meta name="description" content="Chip Flip: a quick strategy game. Play a card. Claim its space. Five in a row. Flip your chips.">\n<meta name="theme-color" content="#F3F1EA">')
assert "<title>Chip Flip</title>" in head
js = js.replace("</script", "<\\/script")
css = refont(recolor(css))
head = refont(head)
assert "Anton" in head
html = head + "<style>" + css + "</style></head>\n<body><div id=\"root\"></div><script>" + js + "</script></body></html>\n"
open("build/index.html", "w").write(html)
print("index.html", len(html))

# In-game music ships next to index.html (streamed, not inlined).
import shutil, os
os.makedirs("build/music", exist_ok=True)
shutil.copyfile("assets/game.mp3", "build/music/game.mp3")
