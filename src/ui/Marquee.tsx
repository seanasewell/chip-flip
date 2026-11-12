// A tilted ticker band that scrolls forever.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { anton, C } from './theme';

function Star() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill={C.white} />
    </Svg>
  );
}

export function Marquee({ items, color = C.blue, tilt = -3, reverse = false, speed = 40 }: { items: string[]; color?: string; tilt?: number; reverse?: boolean; speed?: number }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!w) return;
    x.value = 0;
    x.value = withRepeat(withTiming(1, { duration: (w / speed) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [w, speed, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: reverse ? -w + x.value * w : -x.value * w }] }));
  const run = (key: string, measure: boolean) => (
    <View key={key} onLayout={measure ? (e) => setW(e.nativeEvent.layout.width) : undefined} style={{ flexDirection: 'row', alignItems: 'center' }}>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text allowFontScaling={false} style={{ ...anton(22), color: C.white, textTransform: 'uppercase', paddingHorizontal: 12 }}>
            {t}
          </Text>
          <Star />
        </View>
      ))}
    </View>
  );
  return (
    <View style={{ transform: [{ rotate: `${tilt}deg` }], marginHorizontal: -30 }} accessibilityLabel={items.join('. ')}>
      <View style={{ backgroundColor: color, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.ink, height: 44, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.View style={[{ flexDirection: 'row' }, style]}>
          {run('a', true)}
          {run('b', false)}
          {run('c', false)}
        </Animated.View>
      </View>
    </View>
  );
}
