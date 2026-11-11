import { useEffect, useState, useSyncExternalStore } from "react";
import { game } from "../game";
import { shell } from "../shell";

export const useGame = () => useSyncExternalStore(game.subscribe, game.get, game.get);

export function useSoundSettings() {
  const d = shell();
  const [, force] = useState(0);
  useEffect(() => d.sound.subscribe(() => force((n) => n + 1)), [d]);
  return { sound: d.sound.on(), music: d.music.on(), setSound: d.sound.set, setMusic: d.music.set };
}

export function useNow(active: boolean, every = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [active, every]);
  return now;
}
