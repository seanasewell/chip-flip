// Confetti that bursts out of a finished five-in-a-row once its chips have
// flipped: pieces launch up from along the line, spin, then fall and fade.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming, Extrapolation, type SharedValue } from 'react-native-reanimated';

import { C } from './theme';

const COLORS = [C.blue, C.pink, C.orange, C.green, '#FFFFFF', '#FFD95A'];
const N = 64;

type Piece = { from: number; vx: number; vy: number; spin: number; w: number; h: number; color: string; round: boolean; delay: number };

const rand = (i: number, n: number) => ((Math.sin(i * 91.17 + n * 12.345) * 43758.5453) % 1 + 1) % 1;
const PIECES: Piece[] = Array.from({ length: N }, (_, i) => {
  const angle = -Math.PI / 2 + (rand(i, 1) - 0.5) * 2.3; // mostly upward
  const speed = 0.6 + rand(i, 2) * 1.0;
  return {
    from: rand(i, 3), // where along the line it starts (0..1)
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    spin: (rand(i, 4) - 0.5) * 1080,
    w: 0.24 + rand(i, 5) * 0.18,
    h: 0.11 + rand(i, 6) * 0.1,
    color: COLORS[i % COLORS.length],
    round: i % 5 === 0,
    delay: rand(i, 7) * 0.12,
  };
});

function Bit({ p, t, a, b, cell }: { p: Piece; t: SharedValue<number>; a: { x: number; y: number }; b: { x: number; y: number }; cell: number }) {
  const w = Math.max(3, cell * p.w);
  const h = p.round ? w : Math.max(2, cell * p.h);
  const sx = a.x + (b.x - a.x) * p.from;
  const sy = a.y + (b.y - a.y) * p.from;
  const reach = cell * 4.6;
  const style = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, (t.value - p.delay) / (1 - p.delay)));
    const e = 1 - (1 - k) * (1 - k);
    return {
      opacity: t.value <= p.delay ? 0 : interpolate(k, [0, 0.7, 1], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: sx + p.vx * reach * e },
        { translateY: sy + p.vy * reach * e + cell * 4.2 * k * k },
        { rotate: `${p.spin * k}deg` },
        { scaleY: 0.4 + 0.6 * Math.abs(Math.cos(k * 9 + p.from * 6)) }, // fluttering
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, backgroundColor: p.color, borderRadius: p.round ? w / 2 : 1, borderWidth: p.color === '#FFFFFF' ? 0.5 : 0, borderColor: C.ink }, style]} />;
}

/** `a` and `b` are the centers of the line's two end cells, in board pixels. */
export function SequenceConfetti({ a, b, cell, delay }: { a: { x: number; y: number }; b: { x: number; y: number }; cell: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.linear }));
  }, [delay, t]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, zIndex: 20 }}>
      {PIECES.map((p, i) => (
        <Bit key={i} p={p} t={t} a={a} b={b} cell={cell} />
      ))}
    </View>
  );
}

// Full-screen confetti for a match win: pops out from the top edge, then
// rains down the whole screen, swaying and spinning.
const RAIN = 180;
type Drop = { x: number; vx: number; up: number; spin: number; w: number; h: number; color: string; round: boolean; delay: number; sway: number; fall: number };
const DROPS: Drop[] = Array.from({ length: RAIN }, (_, i) => ({
  x: rand(i, 11),
  vx: (rand(i, 12) - 0.5) * 0.5,
  up: 0.08 + rand(i, 13) * 0.18,
  spin: (rand(i, 14) - 0.5) * 1440,
  w: 7 + rand(i, 15) * 6,
  h: 4 + rand(i, 16) * 4,
  color: COLORS[i % COLORS.length],
  round: i % 6 === 0,
  delay: rand(i, 17) * 0.4, // keeps coming for a while
  sway: 8 + rand(i, 18) * 18,
  fall: 0.85 + rand(i, 19) * 0.35,
}));

function DropBit({ d, t, W, H }: { d: Drop; t: SharedValue<number>; W: number; H: number }) {
  const h = d.round ? d.w : d.h;
  const style = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, (t.value - d.delay) / (1 - d.delay)));
    // Pop up a little from the top edge, then fall the full height.
    const y = -20 - d.up * H * Math.sin(Math.min(1, k * 4) * Math.PI * 0.5) * (1 - k) + d.fall * (H + 60) * k * k;
    const x = d.x * W + d.vx * W * k + Math.sin(k * 10 + d.x * 7) * d.sway;
    return {
      opacity: t.value <= d.delay ? 0 : interpolate(k, [0, 0.85, 1], [1, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${d.spin * k}deg` }, { scaleY: 0.35 + 0.65 * Math.abs(Math.cos(k * 12 + d.x * 5)) }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -d.w / 2, top: -h / 2, width: d.w, height: h, backgroundColor: d.color, borderRadius: d.round ? d.w / 2 : 1, borderWidth: d.color === '#FFFFFF' ? 0.5 : 0, borderColor: C.ink }, style]} />;
}

export function WinConfetti({ width, height, delay = 250 }: { width: number; height: number; delay?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 4600, easing: Easing.linear }));
  }, [delay, t]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, zIndex: 50 }}>
      {DROPS.map((d, i) => (
        <DropBit key={i} d={d} t={t} W={width} H={height} />
      ))}
    </View>
  );
}
