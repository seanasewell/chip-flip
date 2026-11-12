// A chip that flips like a real coin: it lifts, turns in 3D showing its
// thick edge, catches the light at the turn, and drops back down.
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const EDGE_LAYERS = 6;

export function FlipCoin({ p, size, front, back, edge }: { p: SharedValue<number>; size: number; front: React.ReactNode; back: React.ReactNode; edge: string }) {
  const thick = Math.max(3, size * 0.13);

  // Lift and shadow: highest (and the shadow widest and softest) mid-flip.
  const lift = useAnimatedStyle(() => {
    const s = Math.max(0, Math.sin(p.value * Math.PI));
    return { transform: [{ translateY: -size * 0.12 * s }, { scale: 1 + 0.16 * s }] };
  });
  const shadow = useAnimatedStyle(() => {
    const s = Math.max(0, Math.sin(p.value * Math.PI));
    return { opacity: 0.22 * s, transform: [{ scaleX: 0.7 + 0.25 * Math.abs(Math.cos(p.value * Math.PI)) + 0.2 * s }] };
  });

  // Faces turn in perspective, each shifted to its side of the coin's thickness.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (thick / 2) * Math.sin(p.value * Math.PI) }, { perspective: size * 5 }, { rotateY: `${p.value * 180}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(thick / 2) * Math.sin(p.value * Math.PI) }, { perspective: size * 5 }, { rotateY: `${180 + p.value * 180}deg` }],
  }));

  // The edge: a solid band as wide as the coin is thick (seen side-on), with
  // the rims of each layer drawn as narrowing discs.
  const band = useAnimatedStyle(() => {
    const s = Math.abs(Math.sin(p.value * Math.PI));
    return { opacity: s > 0.02 ? 1 : 0, width: thick * s, left: size / 2 - (thick * s) / 2 };
  });
  const layers = Array.from({ length: EDGE_LAYERS }, (_, k) => k);

  // Light catches the face as it turns toward you.
  const sheen = useAnimatedStyle(() => ({ opacity: 0.35 * Math.max(0, Math.sin(p.value * Math.PI)) }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute', left: size * 0.08, right: size * 0.08, bottom: -size * 0.1, height: size * 0.16, borderRadius: size, backgroundColor: '#111111' }, shadow]} />
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, lift]}>
        {layers.map((k) => (
          <EdgeDisc key={k} k={k} p={p} size={size} thick={thick} color={edge} />
        ))}
        <Animated.View style={[{ position: 'absolute', top: size * 0.06, height: size * 0.88, backgroundColor: edge, borderRadius: 2 }, band]} />
        <Animated.View style={[{ position: 'absolute', width: size, height: size, backfaceVisibility: 'hidden' }, frontStyle]}>
          {front}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF' }, sheen]} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', width: size, height: size, backfaceVisibility: 'hidden' }, backStyle]}>
          {back}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF' }, sheen]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function EdgeDisc({ k, p, size, thick, color }: { k: number; p: SharedValue<number>; size: number; thick: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const a = p.value * Math.PI;
    const s = Math.sin(a);
    const offset = (k / (EDGE_LAYERS - 1) - 0.5) * thick * s;
    return {
      opacity: Math.abs(s) > 0.02 ? 1 : 0,
      transform: [{ translateX: offset }, { scaleX: Math.max(0.001, Math.abs(Math.cos(a))) }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1, borderColor: '#111111' }, style]} />;
}
