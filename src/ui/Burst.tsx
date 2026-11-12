// The chip burst from the welcome logo, shared by the board: a quick punch
// and flash, then the chip shatters into dust that flies out and falls.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { ChipIcon } from './Chip';
import { sideColor } from './theme';

// Chip dust: a fixed scatter of pieces flying out from the chip's center.
export type Piece = { angle: number; dist: number; size: number; spin: number; light: boolean; lift: number };
export const PARTICLES: Piece[] = Array.from({ length: 18 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { angle: (i / 18) * Math.PI * 2 + r(1) * 0.5, dist: 0.55 + r(2) * 0.75, size: 0.07 + r(3) * 0.09, spin: (r(4) - 0.5) * 540, light: i % 3 === 0, lift: 0.2 + r(5) * 0.3 };
});

export function Particle({ p, t, size, color }: { p: Piece; t: SharedValue<number>; size: number; color: string }) {
  const s = Math.max(2, Math.round(size * p.size));
  const style = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, (t.value - 0.12) / 0.75));
    const e = 1 - (1 - k) * (1 - k) * (1 - k); // fast out, then drifting
    const dx = Math.cos(p.angle) * p.dist * size * e;
    const dy = Math.sin(p.angle) * p.dist * size * e - p.lift * size * e + 0.6 * size * k * k; // up, then falling
    return {
      opacity: t.value < 0.12 ? 0 : interpolate(k, [0, 0.55, 1], [1, 0.9, 0], Extrapolation.CLAMP),
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${p.spin * k}deg` }, { scale: interpolate(k, [0, 1], [1, 0.35]) }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: size / 2 - s / 2, top: size / 2 - s / 2, width: s, height: s, backgroundColor: p.light ? '#FFFFFF' : color, borderRadius: p.light ? s / 2 : 1 }, style]} />;
}


/** A board chip bursting into dust (one-eyed jack removals). */
export function ChipBurst({ side, size }: { side: number; size: number }) {
  const c = sideColor(side);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 900, easing: Easing.linear });
  }, [t]);
  const chip = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.14, 0.3], [1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(t.value, [0, 0.12, 0.3], [1, 1.22, 0.25], Extrapolation.CLAMP) },
      { rotate: `${interpolate(t.value, [0, 0.12, 0.3], [0, -8, 25], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const flash = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.45], [0, 0.55, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [0, 0.1, 0.45], [0.9, 1.4, 2.1], Extrapolation.CLAMP) }],
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2, zIndex: 5 }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c.light }, flash]} />
      <Animated.View style={[{ position: 'absolute' }, chip]}>
        <ChipIcon color={c} size={size} mark={0.34} stroke={Math.max(1.5, size * 0.07)} />
      </Animated.View>
      {PARTICLES.map((pt, k) => (
        <Particle key={k} p={pt} t={t} size={size} color={c.base} />
      ))}
    </View>
  );
}
