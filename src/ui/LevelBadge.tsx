import { Text, View } from 'react-native';

import { LEVEL_TITLES } from '@/lib/progress';
import { anton, C } from './theme';

// Each title tier has its own badge color (same as the web prototype).
const TIER: [number, string][] = [
  [100, '#C9A227'],
  [75, '#161A24'],
  [50, '#C08418'],
  [40, '#14B8C8'],
  [30, '#FF7A3D'],
  [20, '#E0479E'],
  [15, '#7B5CFF'],
  [10, '#22B573'],
  [5, '#E5383B'],
  [1, '#3355FF'],
];
export const tierColor = (level: number) => TIER.find(([n]) => level >= n)![1];
export const TIER_LEVELS = LEVEL_TITLES.map(([n]) => n).reverse();

export function LevelBadge({ level, size = 36 }: { level: number; size?: number }) {
  return (
    <View accessibilityLabel={`Level ${level}`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tierColor(level), borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ ...anton(size * 0.44), color: C.white }}>
        {level}
      </Text>
    </View>
  );
}
