// Entry point. Exposes the Lineup modules to the app shell as `LU`.
export { setDeps } from "./shell";
export { game, summarize } from "./game";
export { tutorial, TutorialGate } from "./ui/Tutorial";
export { GameScreen } from "./ui/GameScreen";
export { HomeModes } from "./ui/Home";
export { Setup } from "./ui/Setup";
export { Ranks } from "./ui/Ranks";
export { ProfileStats, AchievementSummary } from "./ui/ProfileStats";
export { RulesSheet, StatsRulesSheet } from "./ui/Rules";
export { Wordmark, WelcomeLogo, LogoMark } from "./ui/Logo";
export { MODES } from "./core/board";
export { samplePlayer } from "./samples";
export {
  ACHIEVEMENTS,
  ACHIEVEMENT_SERIES,
  DAILY,
  WEEKLY,
  DAILY_BONUS,
  WEEKLY_BONUS,
  XP_WAYS,
  LEVEL_TITLES,
  applyMatch,
  blankStats,
  mergeStats,
} from "./progress";
export { sfx } from "./sfx";

// Exposed for automated play-testing in the browser.
export { chooseAction } from "./core/ai";
export { PixelIcon, RetroWindow } from "./ui/retro";
