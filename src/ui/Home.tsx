import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODES } from '@/core/board';
import type { GameModeId } from '@/core/types';
import { game, useGame } from '@/lib/game';
import { profile, useProfile } from '@/lib/profile';
import { ChipIcon } from './Chip';
import { useSoundSettings } from './GameScreen';
import { Icon } from './icons';
import { Badge, Button, Card, Display, IconButton, Label, Paper, Row, Sheet, T, Toggle } from './kit';
import { Wordmark } from './Logo';
import { Marquee } from './Marquee';
import { Avatar } from './Players';
import { RulesList } from './Rules';
import { MODE_COPY } from './Setup';
import { C, F, applySideColors, sideColor } from './theme';

const ORDER: GameModeId[] = ['h2h', 'ffa3', 'teams', 'teams3v3', 'teams3'];

export function Home({ onMode }: { onMode: (m: GameModeId) => void }) {
  useGame(); // re-render when a match is saved or cleared
  applySideColors();
  const insets = useSafeAreaInsets();
  const { profile: me, record } = useProfile();
  const [sheet, setSheet] = useState<null | 'settings' | 'rules'>(null);
  const resume = game.resumable();

  return (
    <Paper>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Avatar glyph={(me?.name[0] ?? 'Y').toUpperCase()} hue={230} size={36} you />
        <Wordmark height={40} />
        <IconButton name="settings" onPress={() => setSheet('settings')} label="Settings" size={38} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <View style={{ height: 130, overflow: 'hidden', marginBottom: 8 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 70 }}>
            <Marquee items={['One-eyed jacks remove', 'Two-eyed jacks are wild', 'Corners are free spaces']} color={C.pink} tilt={3.5} reverse />
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 18 }}>
            <Marquee items={['Play a card', 'Claim its space', 'Five in a row', 'Flip your chips']} tilt={-3} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 14, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {resume && (
            <Card shadow={C.green}>
              <Pressable onPress={() => game.resume()} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 44, height: 44, borderWidth: 2, borderColor: C.ink, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="floppy" size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Display size={20}>Resume match</Display>
                  <T numberOfLines={1} style={{ fontSize: 12, color: C.muted }}>
                    {MODES[resume.mode].name} · Sequences {resume.score.length === 2 ? `${resume.score[resume.youSide]}–${resume.score[1 - resume.youSide]}` : resume.score.join('–')}
                  </T>
                </View>
                <View style={{ backgroundColor: C.green, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 12, height: 38, justifyContent: 'center' }}>
                  <T style={{ fontFamily: F.bodyBold, fontSize: 13 }}>Resume</T>
                </View>
              </Pressable>
            </Card>
          )}

          <Card>
            {ORDER.map((id, i) => (
              <Animated.View key={id} entering={FadeInDown.delay(i * 50)} style={{ borderTopWidth: i ? 2 : 0, borderColor: C.ink }}>
                <ModeRow id={id} badge={id === 'h2h' ? 'Most popular' : undefined} onPress={() => onMode(id)} />
              </Animated.View>
            ))}
          </Card>

          <Card shadow={C.green}>
            <View style={{ flexDirection: 'row' }}>
              {[
                ['Wins', record.wins],
                ['Streak', record.streak],
                ['Best streak', record.bestStreak],
              ].map(([k, v], i) => (
                <View key={k} style={{ flex: 1, padding: 12, alignItems: 'center', borderLeftWidth: i ? 2 : 0, borderColor: C.ink }}>
                  <Display size={26}>{v}</Display>
                  <Label style={{ fontSize: 9, opacity: 0.7 }}>{k}</Label>
                </View>
              ))}
            </View>
          </Card>
          <T style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: -6 }}>Ranked matches only</T>
        </View>
      </ScrollView>

      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} onRules={() => setSheet('rules')} />
      <Sheet open={sheet === 'rules'} onClose={() => setSheet(null)} title="How to play">
        <RulesList />
      </Sheet>
    </Paper>
  );
}

function ModeRow({ id, badge, onPress }: { id: GameModeId; badge?: string; onPress: () => void }) {
  const m = MODES[id];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${m.name}. ${MODE_COPY[id]}`}>
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: pressed ? C.white : 'transparent' }}>
          <View style={{ flex: 1 }}>
            {badge && <Badge style={{ marginBottom: 6 }}>{badge}</Badge>}
            <Display size={19}>{m.name}</Display>
            <T style={{ fontSize: 13.5, lineHeight: 19, color: C.muted, marginTop: 2 }}>{MODE_COPY[id]}</T>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
              {Array.from({ length: m.players }, (_, i) => (
                <ChipIcon key={i} color={sideColor(i % m.sides)} size={20} mark={0.45} />
              ))}
            </View>
          </View>
          <View style={{ width: 37, height: 37 }}>
            <View style={{ position: 'absolute', left: 3, top: 3, width: 34, height: 34, backgroundColor: C.green }} />
            <View style={{ width: 34, height: 34, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow" size={16} />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function SettingsSheet({ open, onClose, onRules }: { open: boolean; onClose: () => void; onRules: () => void }) {
  const s = useSoundSettings();
  const { profile: me } = useProfile();
  const [name, setName] = useState(me?.name ?? '');
  const changed = name.trim().length > 0 && name.trim() !== me?.name;
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <Label style={{ marginBottom: 8 }}>Your name</Label>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        <TextInput
          value={name}
          onChangeText={(t) => setName(t.slice(0, 14))}
          placeholder="Your name"
          placeholderTextColor={C.faint}
          style={{ flex: 1, height: 46, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.bodyBold, fontSize: 15, color: C.ink }}
        />
        <Button title="Save" height={42} disabled={!changed} onPress={() => profile.rename(name)} style={{ width: 90 }} />
      </View>
      <Row icon="sound" title="Sound effects" right={<Toggle on={s.sound} onChange={s.setSound} label="Sound effects" />} />
      <Row icon="music" title="Music" sub="Plays during matches" right={<Toggle on={s.music} onChange={s.setMusic} label="Music" />} />
      <Row icon="book" title="How to play" onPress={onRules} right={<Icon name="arrow" size={16} />} />
    </Sheet>
  );
}
