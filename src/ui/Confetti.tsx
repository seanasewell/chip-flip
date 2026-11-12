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
