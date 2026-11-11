// Key-value storage: a synchronous in-memory cache over AsyncStorage.
// `hydrate()` loads every "cf." key once at startup; after that reads are
// instant and writes are saved in the background, so the game controller can
// keep simple synchronous calls (as it does with localStorage on the web).
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cf.';
const cache = new Map<string, string>();
let ready = false;

export async function hydrate(): Promise<void> {
  if (ready) return;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, v] of pairs) if (v != null) cache.set(k, v);
  } catch {
    // Storage unavailable: run with an empty cache.
  }
  ready = true;
}

export const kv = {
  get(key: string): string | null {
    return cache.has(key) ? cache.get(key)! : null;
  },
  set(key: string, value: string) {
    cache.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  remove(key: string) {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
  json<T>(key: string, fallback: T): T {
    const v = cache.get(key);
    if (!v) return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  },
};
