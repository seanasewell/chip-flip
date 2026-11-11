# Chip Flip (React Native)

The native app for Chip Flip, built with Expo (SDK 58) and Expo Router. The web prototype lives on the `main` branch and is playable at https://seanasewell.github.io/chip-flip/.

## Run it on your iPhone with Expo Go

```bash
git clone -b native-app https://github.com/seanasewell/chip-flip.git ~/chip-flip
cd ~/chip-flip
npm install
npx expo start
```

Scan the QR code with the iPhone camera to open the app in Expo Go. To pick up later changes: `git pull` and restart `npx expo start`.

## What's in this version

- Welcome screen with the animated logo, then a name step.
- Play: all five modes (head to head, three players, 2v2, 3v3, three teams).
- Setup: Ranked or Casual, computer or on-this-device players, chip colors.
- The full game: 10×10 board, jacks, dead-card swaps, sequences flipping to crowns, pass-and-play hand-offs, View board.
- Results, a local record (wins and streaks for ranked matches) and a saved match you can resume.
- Music, sound effects and haptics, each with its own setting.

Not yet: accounts and sign-in, online play, profile, ranks, achievements, ads and purchases.

## Code

- `src/core/`: the rules engine, board and computer players (pure TypeScript, shared with the web version).
- `src/lib/`: the match controller, storage, the player's profile and the hidden ranked rating.
- `src/ui/`: screens and components.
- `tests/`: rules tests (`npm test`).

Before committing: `npx tsc --noEmit`, `npx expo lint` and `npm test`.
