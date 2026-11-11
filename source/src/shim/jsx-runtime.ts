/* eslint-disable @typescript-eslint/no-explicit-any */
const J = (): any => (globalThis as any).__LU_JSX;
export const Fragment = Symbol.for("react.fragment");
export function jsx(type: any, props: any, key?: any) {
  return J().jsx(type, props, key);
}
export function jsxs(type: any, props: any, key?: any) {
  return J().jsxs(type, props, key);
}
