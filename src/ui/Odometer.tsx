// A number that rolls up from 0 like an odometer: each digit spins on its
// own wheel and lands on its value, the lower digits spinning further.
import { useEffect } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { anton } from './theme';

const DIGITS = Array.from({ length: 30 }, (_, i) => i % 10);

function Wheel({ digit, spins, size, color, delay, duration }: { digit: number; spins: number; size: number; color: string; delay: number; duration: number }) {
  const H = Math.round(size * 1.12);
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = 0;
    y.value = withDelay(delay, withTiming(-(spins * 10 + digit) * H, { duration, easing: Easing.out(Easing.cubic) }));
  }, [digit, spins, H, delay, duration, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: H, overflow: 'hidden' }}>
      <Animated.View style={style}>
        {DIGITS.map((d, i) => (
          <View key={i} style={{ height: H, justifyContent: 'center' }}>
            <Text allowFontScaling={false} style={{ ...anton(size), color, textAlign: 'center' }}>
              {d}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function Odometer({ value, size = 24, color, prefix = '', delay = 350, duration = 1300, style }: { value: number; size?: number; color: string; prefix?: string; delay?: number; duration?: number; style?: TextStyle }) {
  const digits = String(Math.max(0, Math.round(value))).split('').map(Number);
  return (
    <View accessibilityLabel={`${prefix}${value}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
      {prefix ? <Text allowFontScaling={false} style={[{ ...anton(size), color }, style]}>{prefix}</Text> : null}
      {digits.map((d, i) => (
        // The last digit spins twice before landing, the one before it once.
        <Wheel key={`${digits.length}-${i}`} digit={d} spins={Math.min(2, digits.length - 1 - i)} size={size} color={color} delay={delay} duration={duration} />
      ))}
    </View>
  );
}
