import { View } from 'react-native';

import { C } from './theme';

/** Solid progress bar with an ink outline. */
export function Bar({ pct, color = C.blue, height = 12 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white }}>
      <View style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** Level number in a blue circle. */
export { LevelBadge } from './LevelBadge';
