// The Lineup modules run inside the existing app bundle and must share its
// single React instance. The shell assigns it to globalThis.__LU_REACT
// before anything renders; these wrappers resolve it at call time.
/* eslint-disable @typescript-eslint/no-explicit-any */
const R = (): any => (globalThis as any).__LU_REACT;
export const useState: typeof import("react").useState = ((...a: any[]) => R().useState(...a)) as any;
export const useEffect: typeof import("react").useEffect = ((...a: any[]) => R().useEffect(...a)) as any;
export const useLayoutEffect: typeof import("react").useLayoutEffect = ((...a: any[]) => R().useLayoutEffect(...a)) as any;
export const useRef: typeof import("react").useRef = ((...a: any[]) => R().useRef(...a)) as any;
export const useMemo: typeof import("react").useMemo = ((...a: any[]) => R().useMemo(...a)) as any;
export const useCallback: typeof import("react").useCallback = ((...a: any[]) => R().useCallback(...a)) as any;
export const useSyncExternalStore: typeof import("react").useSyncExternalStore = ((...a: any[]) =>
  R().useSyncExternalStore(...a)) as any;
export const memo: typeof import("react").memo = ((...a: any[]) => R().memo(...a)) as any;
export default new Proxy({}, { get: (_t, k) => R()[k] }) as typeof import("react");
