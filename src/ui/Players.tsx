import { Text, View } from 'react-native';

import { MODES } from '@/core/board';
import { sequenceCount, toWin } from '@/core/engine';
import type { MatchState, Seat } from '@/core/types';
import { ChipIcon } from './Chip';
import { Badge } from './kit';
import { C, F, sideColor } from './theme';

/** Letter avatar in the player's color. */
export function Avatar({ glyph, hue, size, you = false }: { glyph: string; hue: number; size: number; you?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: C.ink, backgroundColor: you ? C.blue : `hsl(${hue}, 85%, 58%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ fontFamily: F.display, color: C.white, fontSize: size * 0.48, lineHeight: size * 0.62 }}>
        {glyph}
      </Text>
    </View>
  );
}

export function SeatAvatar({ seat, size, badge = true }: { seat: Seat; size: number; badge?: boolean }) {
  const c = sideColor(seat.side);
  return (
    <View style={{ width: badge ? size + 6 : size, height: badge ? size + 6 : size }}>
      <Avatar glyph={seat.glyph} hue={seat.hue} size={size} you={seat.kind === 'you'} />
      {badge && (
        <View style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <ChipIcon color={c} size={Math.round(size * 0.46)} mark={0.55} />
        </View>
      )}
    </View>
  );
}

/** Sequence progress: one pip per sequence needed to win. */
export function Pips({ count, total, side, size = 7 }: { count: number; total: number; side: number; size?: number }) {
  const c = sideColor(side);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${count} of ${total} sequences`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: size * 1.8, height: size + 2, backgroundColor: i < count ? c.base : C.white, borderWidth: 1.5, borderColor: C.ink }} />
      ))}
    </View>
  );
}

const nameOf = (s: Seat) => (s.kind === 'you' ? 'You' : s.name);

/** Every side, whose turn it is and sequence progress. */
export function PlayerStrip({ m, activeId }: { m: MatchState; activeId: string | null }) {
  const mode = MODES[m.mode];
  const need = toWin(m);
  const three = m.sides.length > 2;
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {m.sides.map((side) => {
        const c = sideColor(side.index);
        const seats = side.seats.map((id) => m.seats.find((s) => s.id === id)!);
        const on = seats.some((s) => s.id === activeId);
        const label = mode.teams ? (three ? c.name : side.name) : nameOf(seats[0]);
        const av = three ? (seats.length > 1 ? 20 : 24) : seats.length > 2 ? 22 : seats.length > 1 ? 26 : 30;
        return (
          <View key={side.index} style={{ flex: 1, minWidth: 0, transform: on ? [{ translateX: -2 }, { translateY: -2 }] : [] }}>
            {on && <View style={{ position: 'absolute', left: 4, top: 4, right: -4, bottom: -4, backgroundColor: C.ink }} />}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderWidth: 2, borderColor: C.ink, backgroundColor: on ? c.light : C.paper }}>
              <View style={{ flexDirection: 'row' }}>
                {seats.map((s, k) => (
                  <View key={s.id} style={{ marginLeft: k ? -av * 0.4 : 0 }}>
                    <Avatar glyph={s.glyph} hue={s.hue} size={av} you={s.kind === 'you'} />
                  </View>
                ))}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <ChipIcon color={c} size={13} mark={0.5} />
                  <Text numberOfLines={1} allowFontScaling={false} style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: on ? C.ink : C.muted, textTransform: 'uppercase' }}>
                    {label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Pips count={sequenceCount(m, side.index)} total={need} side={side.index} size={6} />
                  {!mode.teams && seats[0].kind === 'bot' && !three && <Badge>CPU</Badge>}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
