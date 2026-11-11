// Chips: flat, with an even ink outline and the side's symbol. A chip in a
// completed sequence flips over to show a crown.
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { FLIP_MS } from '@/lib/game';
import { sideColor, type SideColor } from './theme';

function Shape({ kind, color }: { kind: string; color: string }) {
  if (kind === 'ring') return <Circle cx={10} cy={10} r={6.4} fill={color} />;
  if (kind === 'diamond') return <Path d="M10 2.6 17.4 10 10 17.4 2.6 10Z" fill={color} />;
  if (kind === 'triangle') return <Path d="M10 3.4 17.6 16.6H2.4Z" fill={color} />;
  return <Rect x={3.6} y={3.6} width={12.8} height={12.8} fill={color} />;
}

/** A chip drawn as one SVG so the symbol is always dead centre. */
export function ChipIcon({ color, size, mark = 0.42, stroke = 1.5 }: { color: SideColor; size: number; mark?: number; stroke?: number }) {
  const sw = (stroke * 20) / size;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={10 - sw / 2} fill={color.base} stroke="#111111" strokeWidth={sw} />
      <G transform={`translate(10 10) scale(${mark}) translate(-10 -10)`}>
        <Shape kind={color.marker} color={color.mark} />
      </G>
    </Svg>
  );
}

/** Crown chip (the back of a flipped chip). */
export function CrownChip({ color, size, stroke = 1.5 }: { color: string; size: number; stroke?: number }) {
  const sw = (stroke * 20) / size;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={10 - sw / 2} fill={color} stroke="#111111" strokeWidth={sw} />
      {/* Crown, 54% of the chip, centred (its artwork sits 1.25 units high). */}
      <G transform="translate(10 10) scale(0.45) translate(-12 -13.25)">
        <Path d="M3 18.5 2 7.5l5.5 4.5L12 4.5l4.5 7.5L22 7.5l-1 11Z" fill="#FFFFFF" />
        <Rect x={3} y={19.5} width={18} height={2.5} rx={1} fill="#FFFFFF" />
      </G>
    </Svg>
  );
}

/** A chip on the board. `locked` flips it to the crown, after `flipDelay`
 *  ms when it has just become part of a sequence. */
export const Chip = memo(function Chip({ side, size, locked = false, flipDelay = 0 }: { side: number; size: number; locked?: boolean; flipDelay?: number }) {
  const c = sideColor(side);
  const bw = Math.max(1.5, size * 0.07);
  // 0 = face up, 1 = crown. Chips that were already locked start flipped.
  const p = useSharedValue(locked ? 1 : 0);
  useEffect(() => {
    const to = locked ? 1 : 0;
    if (p.value === to) return;
    p.value = withDelay(flipDelay, withTiming(to, { duration: FLIP_MS, easing: Easing.bezier(0.45, 0, 0.2, 1) }));
  }, [locked, flipDelay, p]);
  // A flip drawn as a squash: the chip narrows to its edge, swaps faces, and
  // opens back up (with a little lift), so it works the same on every platform.
  const front = useAnimatedStyle(() => ({
    opacity: p.value < 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.abs(Math.cos(p.value * Math.PI)) }, { scale: interpolate(p.value, [0, 0.5, 1], [1, 1.18, 1]) }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: p.value >= 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.abs(Math.cos(p.value * Math.PI)) }, { scale: interpolate(p.value, [0, 0.5, 1], [1, 1.18, 1]) }],
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute' }, front]}>
        <ChipIcon color={c} size={size} mark={0.34} stroke={bw} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, back]}>
        <CrownChip color={c.base} size={size} stroke={bw} />
      </Animated.View>
    </View>
  );
});
