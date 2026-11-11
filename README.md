# Chip Flip

A mobile strategy game prototype. Play a card, claim its space, get five in a row and flip your chips.

## Play

Open `index.html` in a browser, or visit the GitHub Pages site once it's turned on (Settings → Pages → deploy from the `main` branch, root folder).

## What's here

- `index.html`: the complete, self-contained game.
- `music/game.mp3`: in-game music, loaded at runtime.
- `source/`: the TypeScript source (`source/src`) and the Python build scripts.

## Build from source

```
cd source/src && npm install
cd .. && python3 build.py   # writes build/index.html
```

Unit tests: `cd source/src && npx tsx --test tests/*.test.ts`
