// A chip that flips like a thick poker chip. The turn is drawn in 2D with
// the chip's real geometry, so nothing depends on how a phone renders 3D:
// as it turns, the face narrows and slides to one side and the rim (the
// chip's thickness) comes into view, outlined in ink like the rest of the
// art. Lifts a little with a soft shadow at the middle of the turn.
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const SLICES = 10;
const INK = '#111111';

export function FlipCoin({ p, size, front, back, edge, outline = INK, shadow: showShadow = true }: { p: SharedValue<number>; size: number; front: React.ReactNode; back: React.ReactNode; edge: string; /** Soft shadow under the chip mid-flip (off for the logo). */ shadow?: boolean; /** Rim outline (ink for board chips; the logo's chips have none). */ outline?: string }) {
  const thick = Math.max(3, size * 0.15);
  const bw = Math.max(1.5, size * 0.06);

  const lift = useAnimatedStyle(() => {
    const s = Math.max(0, Math.sin(p.value * Math.PI));
    // Rises instead of growing: scaling a drawing up blurs it.
    return { transform: [{ translateY: -size * 0.16 * s }] };
  });
  const shadow = useAnimatedStyle(() => {
    const s = Math.max(0, Math.sin(p.value * Math.PI));
    return { opacity: 0.18 * s };
  });

  // Front face sits at +thick/2, back face at -thick/2; turning by angle a
  // moves them to x = ±(thick/2)·sin a and narrows them to |cos a|.
  const frontStyle = useAnimatedStyle(() => {
    const a = p.value * Math.PI;
    const c = Math.cos(a);
    return { opacity: c > 0 ? 1 : 0, transform: [{ translateX: (thick / 2) * Math.sin(a) }, { scaleX: Math.max(0.001, Math.abs(c)) }] };
  });
  const backStyle = useAnimatedStyle(() => {
    const a = p.value * Math.PI;
    const c = Math.cos(a);
    return { opacity: c <= 0 ? 1 : 0, transform: [{ translateX: -(thick / 2) * Math.sin(a) }, { scaleX: Math.max(0.001, Math.abs(c)) }] };
  });

  const slices = Array.from({ length: SLICES }, (_, k) => k / (SLICES - 1) - 0.5);
  return (
    <View style={{ width: size, height: size }}>
      {showShadow && <Animated.View style={[{ position: 'absolute', left: size * 0.1, right: size * 0.1, bottom: -size * 0.12, height: size * 0.14, borderRadius: size, backgroundColor: INK }, shadow]} />}
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, lift]}>
        {/* Ink silhouette first, then the rim color inset by the outline
            width: the whole chip, rim included, gets one clean outline the
            same size as the face's own. */}
        {slices.map((t, k) => (
          <Slice key={`o${k}`} t={t} p={p} size={size} thick={thick} grow={0} color={outline} />
        ))}
        <Band p={p} size={size} thick={thick} widen={bw} top={0} color={outline} />
        {slices.map((t, k) => (
          <Slice key={`e${k}`} t={t} p={p} size={size} thick={thick} grow={-bw} color={edge} />
        ))}
        <Band p={p} size={size} thick={thick} widen={0} top={bw} color={edge} />
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, backStyle]}>{back}</Animated.View>
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, frontStyle]}>{front}</Animated.View>
      </Animated.View>
    </View>
  );
}

/** One slice of the chip's thickness, as seen at the current angle. */
function Slice({ t, p, size, thick, grow, color }: { t: number; p: SharedValue<number>; size: number; thick: number; grow: number; color: string }) {
  const h = size + grow * 2;
  const style = useAnimatedStyle(() => {
    const a = p.value * Math.PI;
    const s = Math.sin(a);
    // A circle squeezed to the chip's current width (an ellipse, matching
    // the face exactly), slid to its place across the thickness. Hidden when
    // the chip lies flat (the face covers it).
    const w = Math.max(2, Math.abs(Math.cos(a)) * size + grow * 2);
    return {
      opacity: Math.min(1, Math.abs(s) / 0.08),
      transform: [{ translateX: t * thick * s }, { scaleX: w / h }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', top: -grow, left: -grow, width: h, height: h, borderRadius: h / 2, backgroundColor: color }, style]} />;
}

/** The straight part of the rim between the two faces (solid, so the rim
 *  reads as one surface rather than stacked slices). */
function Band({ p, size, thick, widen, top, color }: { p: SharedValue<number>; size: number; thick: number; widen: number; top: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const s = Math.abs(Math.sin(p.value * Math.PI));
    const w = thick * s + widen * 2;
    return { opacity: Math.min(1, s / 0.08), width: w, left: size / 2 - w / 2 };
  });
  return <Animated.View style={[{ position: 'absolute', top, height: size - top * 2, backgroundColor: color, borderRadius: Math.max(1, size * 0.05) }, style]} />;
}
