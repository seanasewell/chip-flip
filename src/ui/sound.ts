// Sound effects, in-game music and haptics. The effects are short WAVs
// rendered from the same notes as the web version's synthesized sounds.
// Music and sound effects have their own settings; both respect the
// iPhone silent switch and mix with whatever the player already has on.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

import { kv } from '@/lib/kv';

const SOURCES = {
  select: require('@/assets/sounds/select.wav'),
  turn: require('@/assets/sounds/turn.wav'),
  invalid: require('@/assets/sounds/invalid.wav'),
  remove: require('@/assets/sounds/remove.wav'),
  swap: require('@/assets/sounds/swap.wav'),
  place0: require('@/assets/sounds/place0.wav'),
  place1: require('@/assets/sounds/place1.wav'),
  place2: require('@/assets/sounds/place2.wav'),
  seqwin: require('@/assets/sounds/seqwin.wav'),
  seqloss: require('@/assets/sounds/seqloss.wav'),
  matchwin: require('@/assets/sounds/matchwin.wav'),
  matchloss: require('@/assets/sounds/matchloss.wav'),
} as const;
type Name = keyof typeof SOURCES;

// Relative loudness (the WAVs are all normalized), matching the web mix.
const VOLUME: Record<Name, number> = {
  select: 0.3, turn: 0.25, invalid: 0.45, remove: 0.5, swap: 0.25,
  place0: 0.6, place1: 0.6, place2: 0.6,
  seqwin: 0.6, seqloss: 0.45, matchwin: 0.6, matchloss: 0.5,
};

const SOUND_KEY = 'cf.sound';
const MUSIC_KEY = 'cf.music';
const MUSIC_VOLUME = 0.55;
const players = new Map<Name, AudioPlayer>();
const listeners = new Set<() => void>();
let music: AudioPlayer | null = null;
let musicKey: string | null = null;
let appActive = true;
// Results music: a short win or loss tune when the results screen opens.
const STINGS = { win: require('@/assets/sounds/win.mp3'), loss: require('@/assets/sounds/loss.mp3') } as const;
const stingPlayers = new Map<keyof typeof STINGS, AudioPlayer>();

function stopSting() {
  stingWanted = null;
  stingPlayers.forEach((p) => {
    try {
      p.pause();
    } catch {
      /* ignore */
    }
  });
}

export const soundEnabled = () => kv.get(SOUND_KEY) !== 'off';
export const musicEnabled = () => kv.get(MUSIC_KEY) !== 'off';

export function onSoundChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const emit = () => listeners.forEach((l) => l());

export function setSoundEnabled(on: boolean) {
  kv.set(SOUND_KEY, on ? 'on' : 'off');
  emit();
  if (on) play('select');
}

export function setMusicEnabled(on: boolean) {
  kv.set(MUSIC_KEY, on ? 'on' : 'off');
  emit();
  if (!on) {
    music?.pause();
    stopSting();
  }
  else if (musicKey && appActive) startMusic();
}

/** Loads every sound up front so the first play is instant. */
export function initSound() {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  (Object.keys(SOURCES) as Name[]).forEach((n) => player(n));
  (Object.keys(STINGS) as (keyof typeof STINGS)[]).forEach((k) => stingPlayer(k));
  AppState.addEventListener('change', (s) => {
    appActive = s === 'active';
    if (!appActive) {
      music?.pause();
      stopSting();
    }
    else if (musicKey && musicEnabled()) startMusic();
  });
}

function player(n: Name): AudioPlayer | null {
  try {
    let p = players.get(n);
    if (!p) {
      p = createAudioPlayer(SOURCES[n]);
      p.volume = VOLUME[n];
      players.set(n, p);
    }
    return p;
  } catch {
    return null;
  }
}

function play(n: Name) {
  if (!soundEnabled()) return;
  const p = player(n);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    /* audio unavailable */
  }
}

function startMusic() {
  try {
    if (!music) {
      music = createAudioPlayer(require('@/assets/sounds/game.mp3'), { keepAudioSessionActive: true });
      music.loop = true;
      music.volume = MUSIC_VOLUME;
    }
    music.play();
  } catch {
    /* audio unavailable */
  }
}

/** In-game music: starts from the top for each new match, keeps playing
 *  when the same match resumes. */
export const gameMusic = {
  play(key: string) {
    stopSting();
    const fresh = key !== musicKey;
    musicKey = key;
    if (!musicEnabled() || !appActive) return;
    if (fresh) {
      try {
        music?.seekTo(0);
      } catch {
        /* ignore */
      }
    }
    startMusic();
  },
  stop() {
    musicKey = null;
    music?.pause();
    stopSting();
  },
};

function stingPlayer(kind: keyof typeof STINGS): AudioPlayer | null {
  try {
    let p = stingPlayers.get(kind);
    if (!p) {
      p = createAudioPlayer(STINGS[kind], { keepAudioSessionActive: true });
      p.volume = MUSIC_VOLUME;
      stingPlayers.set(kind, p);
    }
    return p;
  } catch {
    return null;
  }
}

let stingWanted: keyof typeof STINGS | null = null;

/** The win or loss tune for the results screen (follows the music setting).
 *  Both are loaded at startup so they start the moment the screen opens. */
export function resultsMusic(kind: keyof typeof STINGS) {
  stopSting();
  stingWanted = null;
  if (!musicEnabled() || !appActive) return;
  const p = stingPlayer(kind);
  if (!p) return;
  stingWanted = kind;
  const start = () => {
    try {
      p.seekTo(0)?.catch?.(() => {});
    } catch {
      /* ignore */
    }
    try {
      p.play();
    } catch {
      /* audio unavailable */
    }
  };
  start();
  // If the player wasn't ready yet, try again once it has had a moment.
  setTimeout(() => {
    if (stingWanted === kind && !p.playing && p.currentTime < 0.2) start();
  }, 450);
}

export const sfx = {
  select: () => play('select'),
  place: (side: number) => play((['place0', 'place1', 'place2'] as const)[side % 3]),
  turn: () => play('turn'),
  invalid: () => play('invalid'),
  remove: () => play('remove'),
  swap: () => play('swap'),
  sequenceWin: () => play('seqwin'),
  sequenceLoss: () => play('seqloss'),
  matchWin: () => play('matchwin'),
  matchLoss: () => play('matchloss'),
};

export const haptic = {
  tap() {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  },
  place() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
