import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { game } from '@/lib/game';
import { ACHIEVEMENTS, XP_WAYS, dayKey, levelOf, levelTitle, progress, useProgress, weekStart, winPct, xpForLevel } from '@/lib/progress';
import { friends, useFriends } from '@/lib/friends';
import { profile, useProfile } from '@/lib/profile';
import { Bar } from './Bar';
import { useSoundSettings } from './GameScreen';
import { Icon } from './icons';
import { Button, Card, Display, IconButton, Label, Paper, Row, Segmented, Sheet, T, Toggle } from './kit';
import { LevelBadge, TIER_LEVELS, tierColor } from './LevelBadge';
import { Avatar } from './Players';
import { RulesList } from './Rules';
import { PROVIDER_NAME, ProviderButtons } from './SignIn';
import { PageHeader } from './Tabs';
import { tutorial } from './Tutorial';
import { anton, C, F } from './theme';

/** "N friends ›" under your name; a dot when someone wants to be friends. */
function FriendsPill({ onPress }: { onPress: () => void }) {
  const { online } = useProfile();
  const f = useFriends();
  useEffect(() => {
    if (online === 'on') void friends.refresh();
  }, [online]);
  const n = f.list.filter((x) => x.kind === 'friend').length;
  const asks = f.list.filter((x) => x.kind === 'incoming').length;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${n} friends${asks ? `, ${asks} requests` : ''}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: 'rgba(17,17,17,0.08)', opacity: pressed ? 0.7 : 1 })}>
      <T style={{ fontSize: 13.5 }}>{f.ready ? `${n} ${n === 1 ? 'friend' : 'friends'}` : 'Friends'}</T>
      {asks > 0 && (
        <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ color: C.white, fontSize: 11, fontFamily: F.bodyBold }}>{asks}</T>
        </View>
      )}
      <T style={{ fontSize: 13.5, color: C.muted }}>›</T>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <Label style={{ fontSize: 9.5, opacity: 0.75 }}>{label}</Label>
        <Text allowFontScaling={false} style={{ ...anton(26), color: C.ink, marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </Card>
  );
}

function XpTable() {
  return (
    <View style={{ borderWidth: 2, borderColor: C.ink }}>
      {XP_WAYS.map(([k, v], i) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, padding: 12, borderTopWidth: i ? 2 : 0, borderColor: C.ink, backgroundColor: C.paper }}>
          <T style={{ flex: 1, fontSize: 14 }}>{k}</T>
          <T style={{ fontFamily: F.bodyBold, fontSize: 13.5, color: C.pink }}>{v}</T>
        </View>
      ))}
    </View>
  );
}

export function XpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="How XP works">
      <XpTable />
      <T style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 18 }}>Only ranked matches earn XP. Forfeited matches earn none.</T>
    </Sheet>
  );
}

export function Profile({ onSettings, onAchievements, onFriends }: { onSettings: () => void; onAchievements: () => void; onFriends: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile: me } = useProfile();
  const p = useProgress();
  const [xpOpen, setXpOpen] = useState(false);
  const lvl = levelOf(p.xp);
  const streak = progress.currentStreak();
  const s = p.stats;
  const start = weekStart();
  const today = dayKey();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
  const unlocked = ACHIEVEMENTS.filter((a) => p.unlocked[a.id]);

  return (
    <Paper>
      <PageHeader title="Profile" top={insets.top} right={<IconButton name="settings" onPress={onSettings} label="Settings" size={38} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar glyph={(me?.name[0] ?? 'Y').toUpperCase()} hue={230} size={92} you />
          <Display size={26}>{me?.name ?? 'You'}</Display>
          <FriendsPill onPress={onFriends} />
        </View>

        <Card accent={C.blue}>
          <Pressable onPress={() => setXpOpen(true)} accessibilityRole="button" accessibilityLabel={`Level ${lvl.level}, ${lvl.title}. See all levels`}>
            <LevelCard xp={p.xp} />
          </Pressable>
        </Card>

        <Card>
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Label style={{ fontSize: 9.5, opacity: 0.75 }}>Current streak</Label>
                <Text allowFontScaling={false} style={{ ...anton(24), color: C.ink, textTransform: 'uppercase' }}>
                  🔥 {streak} {streak === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Label style={{ fontSize: 9.5, opacity: 0.75 }}>Personal best</Label>
                <Text allowFontScaling={false} style={{ ...anton(24), color: C.pink, textTransform: 'uppercase' }}>
                  {p.streak.best} {p.streak.best === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              {week.map((k, i) => {
                const played = p.days.includes(k);
                const isToday = k === today;
                return (
                  <View key={k} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: isToday ? 2.5 : 1.5, borderColor: isToday ? C.ink : 'rgba(17,17,17,0.25)', backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                      {played && <Text style={{ fontSize: 17, lineHeight: 22 }}>🔥</Text>}
                    </View>
                    <Label style={{ fontSize: 9.5, opacity: isToday ? 1 : 0.6 }}>{'MTWTFSS'[i]}</Label>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Match wins" value={s.matchWins} />
          <Stat label="Win rate" value={s.matchesPlayed ? `${winPct(s)}%` : '—'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Matches played" value={s.matchesPlayed} />
          <Stat label="Best win streak" value={s.bestWinStreak} />
        </View>

        <Card accent={C.blue}>
          <Pressable onPress={onAchievements} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View style={{ flex: 1 }}>
              <Label style={{ fontSize: 9.5, opacity: 0.75 }}>Achievements</Label>
              <Text allowFontScaling={false} style={{ ...anton(24), color: C.ink }}>
                {unlocked.length} / {ACHIEVEMENTS.length}
              </Text>
            </View>
            <T style={{ fontSize: 20 }}>{unlocked.slice(-4).map((a) => a.emoji).join(' ')}</T>
            <T style={{ color: C.muted, fontSize: 13 }}>{unlocked.length ? '' : 'None yet'} ›</T>
          </Pressable>
        </Card>
        <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>Stats count ranked matches only</T>
      </ScrollView>
      <LevelSheet open={xpOpen} onClose={() => setXpOpen(false)} xp={p.xp} />
    </Paper>
  );
}

function LevelCard({ xp }: { xp: number }) {
  const lvl = levelOf(xp);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
      <LevelBadge level={lvl.level} size={58} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Display size={20}>{lvl.title}</Display>
          <Label style={{ fontSize: 10, opacity: 0.7 }}>
            {lvl.into.toLocaleString()} / {lvl.need.toLocaleString()} XP
          </Label>
        </View>
        <View style={{ marginTop: 6 }}>
          <Bar pct={lvl.need ? lvl.into / lvl.need : 1} color={tierColor(lvl.level)} />
        </View>
        <T style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>{lvl.level >= 100 ? `Max level · ${xp.toLocaleString()} XP` : `${lvl.toNext.toLocaleString()} XP to level ${lvl.level + 1}`}</T>
      </View>
    </View>
  );
}

/** Your level, then How to earn XP and Levels on a segmented control. */
export function LevelSheet({ open, onClose, xp }: { open: boolean; onClose: () => void; xp: number }) {
  const lvl = levelOf(xp);
  const current = [...TIER_LEVELS].reverse().find((n) => lvl.level >= n)!;
  const [tab, setTab] = useState<'earn' | 'levels'>('earn');
  return (
    <Sheet open={open} onClose={onClose} title="Level">
      <Card>
        <LevelCard xp={xp} />
      </Card>
      <View style={{ marginTop: 16, marginBottom: 14 }}>
        <Segmented
          value={tab}
          options={[
            { id: 'earn', label: 'How to earn XP' },
            { id: 'levels', label: 'Levels' },
          ]}
          onChange={setTab}
        />
      </View>
      {tab === 'earn' ? (
        <>
          <XpTable />
          <T style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 18 }}>Only ranked matches earn XP. Forfeited matches earn none.</T>
        </>
      ) : (
        <View style={{ gap: 8 }}>
          {TIER_LEVELS.map((n) => {
            const isCur = n === current;
            const reached = n < current;
            return (
              <Card key={n} offset={3}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderLeftWidth: isCur ? 6 : 0, borderColor: C.blue }}>
                  <LevelBadge level={n} size={44} />
                  <View style={{ flex: 1 }}>
                    <Display size={17}>{levelTitle(n)}</Display>
                    <T style={{ fontSize: 12.5, color: isCur ? C.ink : C.muted }}>Level {n}</T>
                  </View>
                  {isCur ? (
                    <T style={{ fontFamily: F.bodyBold, fontSize: 14 }}>Current</T>
                  ) : reached ? (
                    <T style={{ fontSize: 18 }}>✅</T>
                  ) : (
                    <View style={{ alignItems: 'flex-end' }}>
                      <T style={{ fontFamily: F.bodyBold, fontSize: 14 }}>{xpForLevel(n).toLocaleString()} XP</T>
                      <T style={{ fontSize: 11.5, color: C.muted }}>total</T>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

export function Settings({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const s = useSoundSettings();
  const { profile: me, provider, email } = useProfile();
  const [name, setName] = useState(me?.name ?? '');
  const [sheet, setSheet] = useState<null | 'rules' | 'xp'>(null);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const changed = name.trim().length > 0 && name.trim() !== me?.name;

  return (
    <Paper>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Icon name="back" size={26} />
        </Pressable>
        <Display size={30}>Settings</Display>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {provider ? null : (
          <Card>
            <View style={{ padding: 14, gap: 12 }}>
              <View>
                <Display size={20}>Save your progress</Display>
                <T style={{ fontSize: 13.5, lineHeight: 19, color: C.muted, marginTop: 4 }}>You’re playing as a guest. Sign in to keep your level, wins and achievements if you change or lose your phone.</T>
              </View>
              <ProviderButtons mode="link" />
            </View>
          </Card>
        )}

        <Label style={{ marginTop: 14 }}>Account</Label>
        <Card shadow={null}>
          <View style={{ padding: 14 }}>
            {provider && (
              <T style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                ✅ Progress saved with {PROVIDER_NAME[provider]}
                {email ? ` (${email})` : ''}
              </T>
            )}
            <T style={{ fontSize: 12.5, color: C.muted, marginBottom: 6 }}>Display name</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={name}
                onChangeText={(t) => setName(t.slice(0, 14))}
                placeholder="Your name"
                placeholderTextColor={C.faint}
                autoCapitalize="words"
                style={{ flex: 1, height: 46, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.bodyBold, fontSize: 15, color: C.ink }}
              />
              <Button title="Save" height={42} disabled={!changed} onPress={() => profile.rename(name)} style={{ width: 90 }} />
            </View>
          </View>
        </Card>

        <Label style={{ marginTop: 14 }}>Settings</Label>
        <Row icon="sound" title="Sound effects" right={<Toggle on={s.sound} onChange={s.setSound} label="Sound effects" />} />
        <Row icon="music" title="Music" sub="Plays during matches" right={<Toggle on={s.music} onChange={s.setMusic} label="Music" />} />

        <Label style={{ marginTop: 14 }}>Help</Label>
        <Row icon="book" title="How to play" onPress={() => setSheet('rules')} right={<Icon name="arrow" size={16} />} />
        <Row icon="smiley" title="Replay the tutorial" onPress={() => tutorial.open()} right={<Icon name="arrow" size={16} />} />
        <Row icon="check" title="How XP works" onPress={() => setSheet('xp')} right={<Icon name="arrow" size={16} />} />

        <Label style={{ marginTop: 14 }}>Data</Label>
        {provider && (
          <Row
            icon="door"
            title="Sign out"
            sub={`Signed in with ${PROVIDER_NAME[provider]}${email ? ` · ${email}` : ''}`}
            onPress={async () => {
              game.exit();
              await profile.signOut();
              onBack();
            }}
          />
        )}
        {confirm ? (
          <View style={{ borderWidth: 2, borderColor: C.red, padding: 12, backgroundColor: C.paper }}>
            <T style={{ fontSize: 14, lineHeight: 20 }}>This deletes your name, level, record, achievements and saved match from this phone and from the Chip Flip server. It can’t be undone.</T>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button title="Cancel" variant="ghost" height={44} onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button
                title="Delete"
                variant="danger"
                height={44}
                onPress={async () => {
                  const ok = await profile.deleteAccount();
                  if (ok) {
                    game.exit();
                    onBack();
                  } else setFailed(true);
                }}
                style={{ flex: 1 }}
              />
            </View>
            {failed && <T style={{ color: C.red, fontSize: 13, marginTop: 8 }}>Couldn’t reach the server. Check your connection and try again.</T>}
          </View>
        ) : (
          <Row icon="flag" title="Delete my data" danger onPress={() => setConfirm(true)} />
        )}
      </ScrollView>
      <Sheet open={sheet === 'rules'} onClose={() => setSheet(null)} title="How to play">
        <RulesList />
      </Sheet>
      <XpSheet open={sheet === 'xp'} onClose={() => setSheet(null)} />
    </Paper>
  );
}
