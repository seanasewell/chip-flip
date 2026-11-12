import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nextWeek, periodRecord, useProgress, weekStart } from '@/lib/progress';
import { profile, useProfile, type LeaderRow } from '@/lib/profile';
import { Card, Label, Paper, Segmented, T } from './kit';
import { Avatar } from './Players';
import { PageHeader } from './Tabs';
import { anton, C, F } from './theme';

type Metric = 'wins' | 'streak';
type Period = 'week' | 'month' | 'all';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

function subtitle(metric: Metric, period: Period) {
  if (metric === 'streak') return 'Longest current win streak';
  if (period === 'all') return 'Most match wins · All time';
  const now = new Date();
  if (period === 'month') return `Most match wins · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const a = weekStart(now);
  const b = new Date(a);
  b.setDate(b.getDate() + 6);
  return `Most match wins · ${fmt(a)} – ${fmt(b)}`;
}

function resetsIn() {
  const ms = nextWeek() - Date.now();
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return `${d}d ${h}h ${m}m left`;
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const MEDAL = ['🥇', '🥈', '🥉'];

export function Ranks() {
  const insets = useSafeAreaInsets();
  const { online, profile: me } = useProfile();
  const p = useProgress();
  const [metric, setMetric] = useState<Metric>('wins');
  const [period, setPeriod] = useState<Period>('week');
  const [rows, setRows] = useState<LeaderRow[] | null | undefined>(undefined);
  const key = `${metric}:${period}`;
  const [loadedKey, setLoadedKey] = useState('');

  useEffect(() => {
    let live = true;
    profile.leaderboard(metric, metric === 'streak' ? 'all' : period).then((r) => {
      if (!live) return;
      setRows(r);
      setLoadedKey(key);
    });
    return () => {
      live = false;
    };
  }, [metric, period, key, online]);

  const loading = rows === undefined || loadedKey !== key;
  const mine = rows?.find((r) => r.me);
  const myScore = metric === 'streak' ? p.stats.winStreak : periodRecord(p.stats, period).wins;
  const list = (rows ?? []).filter((r) => r.rank <= 50);

  return (
    <Paper>
      <PageHeader title="Ranks" top={insets.top} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <T style={{ color: C.muted, fontSize: 13, marginTop: -6 }}>{subtitle(metric, period)}</T>
        <Segmented value={metric} options={[{ id: 'wins', label: 'Wins' }, { id: 'streak', label: 'Streak' }]} onChange={setMetric} />
        {metric === 'wins' && (
          <Segmented small value={period} options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'all', label: 'All time' }]} onChange={setPeriod} />
        )}

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <Avatar glyph={(me?.name[0] ?? 'Y').toUpperCase()} hue={230} size={44} you />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 12, color: C.muted }}>Your rank</T>
              <Text allowFontScaling={false} style={{ ...anton(26), color: C.ink, textTransform: 'uppercase' }}>
                {mine ? ord(mine.rank) : '—'}
              </Text>
            </View>
            <Text allowFontScaling={false} style={{ ...anton(34), color: C.greenText }}>
              {mine?.score ?? myScore}
            </Text>
          </View>
        </Card>
        {metric === 'wins' && period === 'week' && <T style={{ textAlign: 'right', fontSize: 11.5, color: C.muted, marginTop: -4 }}>Resets Monday · {resetsIn()}</T>}

        {loading ? (
          <ActivityIndicator color={C.ink} style={{ marginVertical: 30 }} />
        ) : rows === null ? (
          <Card shadow={null}>
            <View style={{ padding: 14 }}>
              <T style={{ fontFamily: F.bodyBold }}>Can’t load the leaderboard</T>
              <T style={{ color: C.muted, fontSize: 13.5, marginTop: 2, lineHeight: 19 }}>Ranks need a connection to the Chip Flip server. Your results are saved and will count once you’re back online.</T>
            </View>
          </Card>
        ) : !list.length ? (
          <Card shadow={null}>
            <View style={{ padding: 14 }}>
              <T style={{ fontFamily: F.bodyBold }}>{metric === 'streak' ? 'No win streaks yet' : 'No ranked wins yet'}</T>
              <T style={{ color: C.muted, fontSize: 13.5, marginTop: 2 }}>Win a ranked match to take the top spot.</T>
            </View>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {list.map((r) => (
              <Card key={r.userId} offset={3} bg={r.me ? '#C9D2FF' : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <View style={{ width: 26, alignItems: 'center' }}>
                    {r.rank <= 3 ? <Text style={{ fontSize: 20 }}>{MEDAL[r.rank - 1]}</Text> : <Label style={{ fontSize: 13 }}>{r.rank}</Label>}
                  </View>
                  <Avatar glyph={(r.name[0] ?? '?').toUpperCase()} hue={r.me ? 230 : (r.name.charCodeAt(0) * 47) % 360} size={32} you={r.me} />
                  <T numberOfLines={1} style={{ flex: 1, fontFamily: F.bodyBold }}>
                    {r.me ? `${r.name} (you)` : r.name}
                  </T>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text allowFontScaling={false} style={{ ...anton(20), color: C.ink }}>{r.score}</Text>
                    <Label style={{ fontSize: 8, opacity: 0.6 }}>{metric === 'streak' ? 'in a row' : r.score === 1 ? 'win' : 'wins'}</Label>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
        <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>Ranked matches only</T>
      </ScrollView>
    </Paper>
  );
}
