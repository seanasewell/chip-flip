// Chip Flip logo. The welcome screen builds it from its pieces: the chips
// pop in left to right under the name, the pink and orange chips burst away
// and blue ones take their place, then all five flip over to crowns.
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

const LOGO = require('@/assets/images/logo.png');
const BLUE = require('@/assets/images/blue.png');
const PINK = require('@/assets/images/pink.png');
const ORANGE = require('@/assets/images/orange.png');
const CROWN = require('@/assets/images/crown.png');
const TEXT = require('@/assets/images/text.png');

export function Wordmark({ height = 40 }: { height?: number }) {
  return <Image source={LOGO} style={{ height, width: height * (823 / 312) }} resizeMode="contain" accessibilityLabel="Chip Flip" />;
}

const D = 2000; // the chips wait 2 s after the screen appears; the name is there from the start

function LogoChip({ i, size, x, start }: { i: number; size: number; x: number; start: number }) {
  const swaps = start !== BLUE;
  const swapAt = D + (i === 1 ? 1900 : 3900);
  const pop = useSharedValue(0);
  const out = useSharedValue(0);
  const inn = useSharedValue(swaps ? 0 : 1);
  const flip = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(D + i * 180, withSpring(1, { damping: 9, stiffness: 180 }));
    if (swaps) {
      out.value = withDelay(swapAt, withTiming(1, { duration: 900, easing: Easing.bezier(0.5, 0, 0.75, 0.4) }));
      inn.value = withDelay(swapAt + 1500, withSpring(1, { damping: 10, stiffness: 200 }));
    }
    flip.value = withDelay(D + 6300 + i * 140, withTiming(1, { duration: 900, easing: Easing.bezier(0.45, 0, 0.2, 1) }));
  }, [i, swaps, swapAt, pop, out, inn, flip]);

  const wrap = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [
      { translateY: interpolate(pop.value, [0, 1], [-size * 0.5, 0]) },
      { scale: pop.value },
      { scaleX: Math.abs(Math.cos(flip.value * Math.PI)) },
      { scale: interpolate(flip.value, [0, 0.5, 1], [1, 1.15, 1]) },
    ],
  }));
  const front = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0 }));
  // The dissolve: swells and spins away as it fades.
  const outStyle = useAnimatedStyle(() => ({
    opacity: interpolate(out.value, [0, 0.25, 1], [1, 1, 0]),
    transform: [{ scale: interpolate(out.value, [0, 0.25, 1], [1, 1.12, 1.7]) }, { rotate: `${interpolate(out.value, [0, 0.25, 1], [0, -6, 18])}deg` }],
  }));
  const inStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, inn.value * 1.5), transform: [{ scale: inn.value }] }));
  const img = { position: 'absolute' as const, width: size, height: size };

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: size, height: size }, wrap]}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, front]}>
        {swaps ? (
          <>
            <Animated.Image source={BLUE} style={[img, inStyle]} />
            <Animated.Image source={start} style={[img, outStyle]} />
          </>
        ) : (
          <Image source={BLUE} style={img} />
        )}
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, back]}>
        <Image source={CROWN} style={img} />
      </Animated.View>
    </Animated.View>
  );
}

export function WelcomeLogo({ width = 220 }: { width?: number }) {
  const k = width / 823;
  const xs = [0, 167, 333, 500, 667];
  const starts = [BLUE, PINK, BLUE, BLUE, ORANGE];
  const size = Math.round(155 * k);
  return (
    <View accessibilityRole="image" accessibilityLabel="Chip Flip" style={{ width, height: Math.round(312 * k) }}>
      {xs.map((x, i) => (
        <LogoChip key={i} i={i} x={Math.round(x * k)} size={size} start={starts[i]} />
      ))}
      <Image source={TEXT} style={{ position: 'absolute', left: 0, top: Math.round(192 * k), width: Math.round(822 * k), height: Math.round(120 * k) }} />
    </View>
  );
}
