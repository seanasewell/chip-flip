import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Spins its child forever, one turn every 1.1 s (the web "lu-spin"). */
export function Spin({ children, ms = 1100 }: { children: React.ReactNode; ms?: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [ms, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
