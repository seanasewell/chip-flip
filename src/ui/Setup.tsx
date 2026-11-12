import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODES } from '@/core/board';
import type { Difficulty, GameModeId } from '@/core/types';
import { game, type SeatSetup, type SetupConfig } from '@/lib/game';
import { useProfile } from '@/lib/profile';
import { ChipIcon } from './Chip';
import { Icon } from './icons';
import { Badge, Button, Card, Display, Label, Paper, Segmented, T } from './kit';
import { C, F, SIDE_COLORS, pickColor, validColors } from './theme';

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export const MODE_COPY: Record<GameModeId, string> = {
  h2h: 'You against one opponent. First to complete two chip flips wins.',
  ffa3: 'Every player for themselves. The first chip flip wins.',
  teams: 'Two teams of two. Teammates share a color and sit opposite of each other. Two chip flips win.',
  teams3v3: 'Two teams of three. Teammates share a color, alternating around the table. Two chip flips win.',
  teams3: 'Three teams of two. Teammates share a color, alternating around the table. First to complete a chip flip wins.',
};

export function defaultSetup(mode: GameModeId): SetupConfig {
  const n = MODES[mode].players;
  return { mode, seats: Array.from({ length: n }, (_, i) => ({ kind: i === 0 ? 'you' : 'bot', difficulty: 'medium', name: '' }) as SeatSetup) };
}

export function Setup({ mode, onBack }: { mode: GameModeId; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [cfg, setCfg] = useState<SetupConfig>(() => {
    const c = game.lastSetup(mode) ?? defaultSetup(mode);
    return c.seats.some((s) => s.kind === 'local') ? { ...c, casual: true } : c;
  });
  const [casualNote, setCasualNote] = useState(false);
  const m = MODES[mode];
  const colors = validColors(cfg.colors, m.sides);
  const colorOf = (side: number) => SIDE_COLORS[colors[side]];
  const pick = (side: number, color: number) => setCfg((c) => ({ ...c, colors: pickColor(validColors(c.colors, m.sides), side, color) }));
  const swaps = m.sides >= SIDE_COLORS.length;
  const update = (i: number, p: Partial<SeatSetup>) => setCfg((c) => ({ ...c, seats: c.seats.map((s, k) => (k === i ? { ...s, ...p } : s)) }));
  const valid = cfg.seats.every((s) => s.kind !== 'local' || s.name.trim().length >= 1);
  const forfeitWarn = game.startWouldForfeit();
  const casual = !!cfg.casual;
  const groups = m.teams
    ? Array.from({ length: m.sides }, (_, side) => ({ side, idx: cfg.seats.map((_, i) => i).filter((i) => i % m.sides === side) }))
    : [{ side: -1, idx: cfg.seats.map((_, i) => i) }];

  const seatRow = (i: number) => {
    const s = cfg.seats[i];
    const side = i % m.sides;
    return (
      <Card key={i}>
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ChipIcon color={colorOf(side)} size={36} mark={0.39} stroke={2} />
            <View style={{ flex: 1 }}>
              <T numberOfLines={1} style={{ fontFamily: F.bodyBold }}>
                {s.kind === 'you' ? profile?.name || 'You' : s.kind === 'bot' ? 'Computer' : s.name || 'Player on this device'}
              </T>
              <T style={{ fontSize: 12, color: C.muted }}>{s.kind === 'you' ? 'You' : s.kind === 'bot' ? (casual ? DIFFS.find((x) => x.id === s.difficulty)!.label : 'Computer player') : 'Plays on this device'}</T>
            </View>
          </View>
          {!m.teams && <ColorPicker colors={colors} side={side} swaps={swaps} onPick={(c) => pick(side, c)} />}
          {s.kind !== 'you' && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Segmented
                value={s.kind}
                options={[
                  { id: 'bot', label: 'Computer' },
                  { id: 'local', label: 'On this device' },
                ]}
                onChange={(k) => {
                  if (k === 'local' && !casual) {
                    setCfg((c) => ({ ...c, casual: true }));
                    setCasualNote(true);
                  }
                  update(i, { kind: k as SeatSetup['kind'] });
                }}
              />
              {s.kind === 'bot' ? (
                casual ? <Segmented small value={s.difficulty} options={DIFFS} onChange={(v) => update(i, { difficulty: v })} /> : null
              ) : (
                <TextInput
                  value={s.name}
                  onChangeText={(t) => update(i, { name: t.slice(0, 14) })}
                  placeholder="Their name"
                  placeholderTextColor={C.faint}
                  accessibilityLabel={`Player ${i + 1} name`}
                  autoCapitalize="words"
                  style={{ height: 42, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.bodyBold, fontSize: 15, color: C.ink }}
                />
              )}
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Paper>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Icon name="back" size={26} />
        </Pressable>
        <Display size={26}>{m.name}</Display>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 24, maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Segmented
          value={casual ? 'casual' : 'ranked'}
          options={[
            { id: 'ranked', label: 'Ranked' },
            { id: 'casual', label: 'Casual' },
          ]}
          onChange={(v) => {
            setCasualNote(false);
            setCfg((c) => (v === 'casual' ? { ...c, casual: true } : { ...c, casual: false, seats: c.seats.map((s) => (s.kind === 'local' ? { ...s, kind: 'bot', name: '' } : s)) }));
          }}
        />
        <T style={{ marginTop: 8, marginBottom: 16, paddingHorizontal: 2, fontSize: 13, lineHeight: 18, color: C.muted }}>
          {casualNote
            ? 'Playing with someone on this device is always casual. Doesn’t count toward your record.'
            : casual
              ? 'Just for fun. Doesn’t count toward your record.'
              : 'Counts toward your wins and streak.'}
        </T>
        {swaps && <T style={{ marginBottom: 12, fontSize: 12, lineHeight: 17, color: C.muted }}>All three colors are in play, so picking one another {m.teams ? 'team' : 'player'} has swaps your colors.</T>}
        <View style={{ gap: 16 }}>
          {groups.map((g) => (
            <View key={g.side} style={{ gap: 10 }}>
              {g.side >= 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Display size={18}>Team {colorOf(g.side).name.toLowerCase()}</Display>
                  <ColorPicker colors={colors} side={g.side} swaps={swaps} onPick={(c) => pick(g.side, c)} compact />
                </View>
              )}
              {g.idx.map(seatRow)}
            </View>
          ))}
        </View>

        <Label style={{ marginTop: 24, marginBottom: 8 }}>Online</Label>
        <Card shadow={null}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, opacity: 0.85 }}>
            <T style={{ fontSize: 22 }}>🌐</T>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T style={{ fontFamily: F.bodyBold }}>Invite friends online</T>
                <Badge>Coming soon</Badge>
              </View>
              <T style={{ fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}>Online play needs a server, so it isn’t on yet. Play friends on this device instead.</T>
            </View>
          </View>
        </Card>

        {forfeitWarn && (
          <View style={{ marginTop: 18, borderWidth: 2, borderColor: C.red, backgroundColor: '#FDE7E9', padding: 12 }}>
            <T style={{ fontSize: 13, lineHeight: 18 }}>You have a match in progress. Starting a new one forfeits it, which counts as a loss.</T>
          </View>
        )}
        <Button title="Start match" icon="arrow" disabled={!valid} onPress={() => {
            game.start(cfg);
            onBack();
          }} style={{ marginTop: 20 }} />
      </ScrollView>
    </Paper>
  );
}

/** Chip color: tap a swatch. Colors other players have are faded out,
 *  unless every color is taken, in which case picking one swaps. */
function ColorPicker({ colors, side, swaps, onPick, compact = false }: { colors: number[]; side: number; swaps: boolean; onPick: (c: number) => void; compact?: boolean }) {
  const mine = colors[side];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: compact ? 0 : 12 }} accessibilityRole="radiogroup" accessibilityLabel="Chip color">
      {!compact && <Label style={{ fontSize: 9.5, opacity: 0.7, marginRight: 4 }}>Color</Label>}
      {SIDE_COLORS.map((c, i) => {
        const owner = colors.indexOf(i);
        const taken = owner !== -1 && owner !== side;
        const disabled = taken && !swaps;
        const on = i === mine;
        return (
          <Pressable
            key={c.name}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            accessibilityLabel={`${c.name}${taken ? (swaps ? ', swap' : ', taken') : ''}`}
            disabled={disabled}
            onPress={() => onPick(i)}
            style={{ padding: 3, borderRadius: 99, borderWidth: 2.5, borderColor: on ? C.ink : 'transparent', opacity: disabled ? 0.25 : on ? 1 : 0.55 }}
          >
            <ChipIcon color={c} size={compact ? 24 : 26} mark={0.42} stroke={2} />
          </Pressable>
        );
      })}
    </View>
  );
}
