import { Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { LEVEL_TITLES } from '@/lib/progress';
import { anton, C } from './theme';

// Each title tier has its own badge color (same as the web prototype).
const TIER: [number, string][] = [
  [100, '#4FA8E8'],
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

// Level 100 wears a multicolor mesh: four soft color pools over sky blue
// (the same radial gradients as the web prototype).
const MESH: [number, number, number, string][] = [
  [0.22, 0.18, 0.62, '#FFD95A'],
  [0.85, 0.25, 0.57, '#4CD98A'],
  [0.78, 0.88, 0.71, '#3355FF'],
  [0.12, 0.85, 0.67, '#FF7AC0'],
];

function Mesh({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        {MESH.map(([cx, cy, r, c], i) => (
          <RadialGradient key={i} id={`mesh${i}`} cx={cx * 100} cy={cy * 100} r={r * 100} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={c} stopOpacity={1} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Circle cx={50} cy={50} r={50} fill="#4FA8E8" />
      {MESH.map((_, i) => (
        <Circle key={i} cx={50} cy={50} r={50} fill={`url(#mesh${i})`} />
      ))}
    </Svg>
  );
}

export function LevelBadge({ level, size = 36 }: { level: number; size?: number }) {
  const legend = level >= 100;
  return (
    <View accessibilityLabel={`Level ${level}`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tierColor(level), borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {legend && <Mesh size={size - 4} />}
      <Text allowFontScaling={false} style={{ ...anton(size * 0.44), color: C.white }}>
        {level}
      </Text>
    </View>
  );
}
