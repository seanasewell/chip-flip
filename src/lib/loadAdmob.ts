// Loads Google Mobile Ads (native builds only; see loadAdmob.web.ts).
export function loadAdmob(): typeof import('react-native-google-mobile-ads') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}
