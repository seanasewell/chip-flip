// Board spaces and playing cards.
import { memo, useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { LAYOUT, cardFace, faceLabel, isRemoveJack, isWildJack } from '@/core/board';
import type { CardId, Suit } from '@/core/types';
import { LIFT_MS, liftEasing, tagPop } from './motion';
import { anton, C, F, SUIT_COLOR } from './theme';

const SUIT_PATH: Record<Suit, string> = {
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  diamond: 'M12 1.8 20.2 12 12 22.2 3.8 12Z',
  spade: 'M12 1.8C9 6 3 9.6 3 14.2a4.6 4.6 0 0 0 7.7 3.3c-.3 1.8-1 3.3-2.2 4.7h7c-1.2-1.4-1.9-2.9-2.2-4.7A4.6 4.6 0 0 0 21 14.2C21 9.6 15 6 12 1.8Z',
  club: 'M12 2.3a4.5 4.5 0 0 1 3.9 6.8 4.5 4.5 0 1 1-2.6 7.6c.3 2 1.1 3.7 2.4 5.5H8.3c1.3-1.8 2.1-3.5 2.4-5.5a4.5 4.5 0 1 1-2.6-7.6A4.5 4.5 0 0 1 12 2.3Z',
  star: 'M12 1.9l3.1 6.4 7 .9-5.1 4.9 1.3 7L12 17.7l-6.3 3.4 1.3-7L1.9 9.2l7-.9z',
};

export const SuitIcon = memo(function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={SUIT_PATH[suit]} fill={color} />
    </Svg>
  );
});

/** The card printed on a board space. */
export const TileFace = memo(function TileFace({ cell, size, dim = false }: { cell: number; size: number; dim?: boolean }) {
  const k = LAYOUT[cell];
  if (!k) return null;
  const ten = k.rank === '10';
  return (
    <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.35 : 1 }}>
      <Text style={{ ...anton(size * (ten ? 0.3 : 0.34)), color: C.ink, letterSpacing: ten ? -0.8 : 0 }} allowFontScaling={false}>
        {k.rank}
      </Text>
      <View style={{ marginTop: size * 0.02 }}>
        <SuitIcon suit={k.suit} size={size * 0.28} color={SUIT_COLOR[k.suit]} />
      </View>
    </View>
  );
});

export type CardState = 'available' | 'selected' | 'disabled' | 'dead';

/** A playing card in the hand. Jacks say what they do. */
export function HandCard({ card, width, state, onPress, fresh = false, dead: deadCard = false }: { card: CardId; width: number; state: CardState; onPress?: () => void; fresh?: boolean; dead?: boolean }) {
  const k = cardFace(card);
  const color = SUIT_COLOR[k.suit];
  const h = Math.round(width * 1.4);
  const sel = state === 'selected';
  const wild = isWildJack(card);
  const remove = isRemoveJack(card);
  // Stays marked dead while selected (for the swap).
  const dead = state === 'dead' || deadCard;
  const pad = Math.max(3, Math.round(width * 0.07));
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withTiming(sel ? -Math.round(h * 0.14) : 0, { duration: LIFT_MS, easing: liftEasing });
  }, [sel, h, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const label = `${faceLabel(k)}${wild ? ', wild: place anywhere' : remove ? ", removes an opponent's chip" : ''}${dead ? ', dead card' : ''}${sel ? ', selected' : ''}`;
  return (
    <Animated.View style={style}>
      {fresh && (
        <View pointerEvents="none" style={{ position: 'absolute', top: -12, left: 0, right: 0, alignItems: 'center', zIndex: 2 }}>
          <Animated.View entering={tagPop} style={{ backgroundColor: C.green, borderWidth: 1.5, borderColor: C.ink, paddingHorizontal: 5 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 8.5, color: C.ink, textTransform: 'uppercase' }}>New</Text>
          </Animated.View>
        </View>
      )}
      <Pressable onPress={onPress} disabled={state === 'disabled'} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: sel, disabled: state === 'disabled' }}>
        <View style={{ width: width + 3, height: h + 3, opacity: state === 'disabled' ? 0.5 : 1 }}>
          <View style={{ position: 'absolute', left: 3, top: 3, width, height: h, backgroundColor: C.ink }} />
          <View style={{ width, height: h, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, overflow: 'hidden' }}>
            {(wild || remove) && (
              <Image
                source={wild ? require('@/assets/images/jack_two_eyed.png') : require('@/assets/images/jack_one_eyed.png')}
                style={{ position: 'absolute', right: 3, top: 3, width: Math.max(16, Math.round(width * 0.38)), height: Math.max(16, Math.round(width * 0.38)) * (120 / 138) }}
                resizeMode="contain"
              />
            )}
            <View style={{ position: 'absolute', left: 4, top: 2, alignItems: 'center' }}>
              <Text allowFontScaling={false} style={{ ...anton(width * 0.3), color, letterSpacing: k.rank === '10' ? -1 : 0 }}>
                {k.rank}
              </Text>
              <SuitIcon suit={k.suit} size={width * 0.22} color={color} />
            </View>
            {wild || remove || dead ? (
              // Jacks say what they do; a dead card says it's dead, in the same spot.
              <View style={{ position: 'absolute', left: pad, right: pad, bottom: pad, backgroundColor: dead ? C.orange : C.green, borderWidth: 1.5, borderColor: C.ink, paddingVertical: 2, alignItems: 'center' }}>
                <Text allowFontScaling={false} style={{ fontFamily: F.monoBold, fontSize: Math.max(7.5, width * 0.13), color: C.ink, textTransform: 'uppercase' }}>
                  {wild ? 'Wild' : remove ? 'Remove' : 'Dead'}
                </Text>
              </View>
            ) : (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: '10%', alignItems: 'center' }}>
                <SuitIcon suit={k.suit} size={width * 0.5} color={color} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Face-down card, for hidden hands. */
export function CardBack({ width }: { width: number }) {
  const h = Math.round(width * 1.4);
  return (
    <View style={{ width: width + 3, height: h + 3 }}>
      <View style={{ position: 'absolute', left: 3, top: 3, width, height: h, backgroundColor: C.ink }} />
      <View style={{ width, height: h, backgroundColor: C.blue, borderWidth: 2, borderColor: C.ink, padding: 3 }}>
        <View style={{ flex: 1, borderWidth: 1.5, borderColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={width * 0.42} height={width * 0.42} viewBox="0 0 24 24">
            <Path d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill={C.orange} stroke={C.ink} strokeWidth={1.5} />
          </Svg>
        </View>
      </View>
    </View>
  );
}
