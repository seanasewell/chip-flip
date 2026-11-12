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

- Tabs like the web prototype: Play, Ranks (live leaderboard from the server), Rewards (daily and weekly challenges, achievements) and Profile (level, XP, daily streak, stats), with Settings behind the gear.
- Guest accounts on Supabase (project `chip-flip`): ranked results, streaks and the hidden rating are kept on the server. Migrations are in `supabase/migrations/`.

- Sign in with Apple or Google (or play as a guest and save progress later from Settings); sign out for saved players.

Not yet: online play, friends, ads and purchases.

## Code

- `src/core/`: the rules engine, board and computer players (pure TypeScript, shared with the web version).
- `src/lib/`: the match controller, storage, the player's profile and the hidden ranked rating.
- `src/ui/`: screens and components.
- `tests/`: rules tests (`npm test`).

Before committing: `npx tsc --noEmit`, `npx expo lint` and `npm test`.
