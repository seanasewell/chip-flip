// Chip Flip logo. The welcome screen builds it from its pieces: the chips
// pop in left to right under the name, the pink and orange chips burst away
// and blue ones take their place, then all five flip over to crowns.
import { useEffect } from 'react';

import { PARTICLES, Particle } from './Burst';
import { FlipCoin } from './Coin';
import { Image, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const LOGO = require('@/assets/images/logo.png');
const BLUE = require('@/assets/images/blue.png');
const PINK = require('@/assets/images/pink.png');
const ORANGE = require('@/assets/images/orange.png');
const CROWN = require('@/assets/images/crown.png');
const TEXT = require('@/assets/images/text.png');
const PINK_BLUR = require('@/assets/images/pink_blur.png');
const ORANGE_BLUR = require('@/assets/images/orange_blur.png');

export function Wordmark({ height = 40 }: { height?: number }) {
  return <Image source={LOGO} style={{ height, width: height * (823 / 312) }} resizeMode="contain" accessibilityLabel="Chip Flip" />;
}

// Same timeline and keyframes as the web prototype's welcome logo.
const PINK_HEX = '#FF2E93';
const ORANGE_HEX = '#EA5B0C';

const D = 1000; // the chips wait 1 s after the screen appears; the name is there from the start
const POP = Easing.bezier(0.2, 0.9, 0.3, 1);
const FLIP = Easing.bezier(0.45, 0, 0.25, 1);

function LogoChip({ i, size, x, start, blur }: { i: number; size: number; x: number; start: number; blur?: number }) {
  const swaps = start !== BLUE;
  const swapAt = D + (i === 1 ? 1900 : 3900);
  const pop = useSharedValue(0);
  const out = useSharedValue(0);
  const inn = useSharedValue(swaps ? 0 : 1);
  const flip = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(D + i * 180, withTiming(1, { duration: 520, easing: POP }));
    if (swaps) {
      out.value = withDelay(swapAt, withTiming(1, { duration: 900, easing: Easing.linear }));
      // A pause after the burst, then the blue chip pops into the empty spot.
      inn.value = withDelay(swapAt + 1500, withTiming(1, { duration: 520, easing: POP }));
    }
    flip.value = withDelay(D + 6300 + i * 140, withTiming(1, { duration: 900, easing: FLIP }));
  }, [i, swaps, swapAt, pop, out, inn, flip]);

  // Pop in: 0.3 → 1.1 → 1 while fading in.
  const popStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.7, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pop.value, [0, 0.7, 1], [0.3, 1.1, 1], Extrapolation.CLAMP) }],
  }));
  // The dissolve is abrupt: a quick punch, then the chip bursts into
  // particles with a flash of light, gone in about a quarter second.
  const burst = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(out.value, [0, 0.12, 0.3], [1, 1.22, 0.25], Extrapolation.CLAMP) },
      { rotate: `${interpolate(out.value, [0, 0.12, 0.3], [0, -8, 25], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const sharp = useAnimatedStyle(() => ({ opacity: interpolate(out.value, [0, 0.14, 0.3], [1, 1, 0], Extrapolation.CLAMP) }));
  const soft = useAnimatedStyle(() => ({
    opacity: interpolate(out.value, [0, 0.1, 0.45], [0, 0.85, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(out.value, [0, 0.1, 0.45], [0.9, 1.3, 1.9], Extrapolation.CLAMP) }],
  }));
  const inStyle = useAnimatedStyle(() => ({
    opacity: interpolate(inn.value, [0, 0.7, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(inn.value, [0, 0.7, 1], [0.6, 1.08, 1], Extrapolation.CLAMP) }],
  }));
  const img = { position: 'absolute' as const, width: size, height: size };
  const big = size * (355 / 155);

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: size, height: size, zIndex: swaps ? 2 : 1 }, popStyle]}>
      <FlipCoin
        p={flip}
        size={size}
        edge="#1F3AD6"
        outline="#1F3AD6"
        front={
          <>
        {swaps ? (
          <>
            <Animated.Image source={BLUE} style={[img, inStyle]} />
            <Animated.Image source={blur} style={[{ position: 'absolute', width: big, height: big, left: (size - big) / 2, top: (size - big) / 2 }, soft]} />
            <Animated.View style={[{ position: 'absolute', width: size, height: size }, burst]}>
              <Animated.Image source={start} style={[img, sharp]} />
            </Animated.View>
            {PARTICLES.map((pt, k) => (
              <Particle key={k} p={pt} t={out} size={size} color={start === PINK ? PINK_HEX : ORANGE_HEX} />
            ))}
          </>
        ) : (
          <Image source={BLUE} style={img} />
        )}
          </>
        }
        back={<Image source={CROWN} style={img} />}
      />
    </Animated.View>
  );
}

export function WelcomeLogo({ width = 220 }: { width?: number }) {
  const k = width / 823;
  const xs = [0, 167, 333, 500, 667];
  const starts = [BLUE, PINK, BLUE, BLUE, ORANGE];
  const blurs = [undefined, PINK_BLUR, undefined, undefined, ORANGE_BLUR];
  const size = Math.round(155 * k);
  return (
    <View accessibilityRole="image" accessibilityLabel="Chip Flip" style={{ width, height: Math.round(312 * k) }}>
      {xs.map((x, i) => (
        <LogoChip key={i} i={i} x={Math.round(x * k)} size={size} start={starts[i]} blur={blurs[i]} />
      ))}
      <Image source={TEXT} style={{ position: 'absolute', left: 0, top: Math.round(192 * k), width: Math.round(822 * k), height: Math.round(120 * k) }} />
    </View>
  );
}
