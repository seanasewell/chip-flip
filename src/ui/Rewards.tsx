import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACHIEVEMENTS, ACHIEVEMENT_SERIES, DAILY, DAILY_BONUS, WEEKLY, WEEKLY_BONUS, achievementState, nextDay, nextWeek, useProgress, type AchievementDef, type ChallengeDef, type ChallengeSet } from '@/lib/progress';
import { Bar } from './Bar';
import { Card, Display, Label, Paper, Segmented, Sheet, T } from './kit';
import { PageHeader } from './Tabs';
import { C, F } from './theme';

function left(until: number) {
  const ms = Math.max(0, until - Date.now());
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return d ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function ChallengeCard({ def, set }: { def: ChallengeDef; set: ChallengeSet }) {
  const done = !!set.done[def.id];
  const cur = Math.min(def.goal, set.progress[def.id] ?? 0);
  return (
    <Card shadow={done ? C.green : C.ink}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{done ? '✅' : def.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <T style={{ fontFamily: F.bodyBold, flexShrink: 1 }}>{def.name}</T>
            <T style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.pink }}>+{def.xp} XP</T>
          </View>
          <T style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{def.desc}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Bar pct={cur / def.goal} color={done ? C.green : C.pink} height={11} />
            </View>
            <Label style={{ fontSize: 10, opacity: 0.75 }}>
              {cur} / {def.goal}
            </Label>
          </View>
        </View>
      </View>
    </Card>
  );
}

/** A challenge list (daily or weekly) with its bonus and reset time. */
export function ChallengeSection({ title, set, defs, bonus, resets }: { title: string; set: ChallengeSet; defs: ChallengeDef[]; bonus: number; resets: number }) {
  const items = set.ids.map((id) => defs.find((d) => d.id === id)!).filter(Boolean);
  const done = items.filter((d) => set.done[d.id]).length;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Display size={20}>{title}</Display>
        <T style={{ fontSize: 12, color: C.muted }}>
          {done} of {items.length} completed
        </T>
      </View>
      {items.map((d) => (
        <ChallengeCard key={d.id} def={d} set={set} />
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T style={{ fontSize: 12, color: C.muted }}>
          {set.bonus ? 'Bonus earned ' : `Complete all ${items.length} for `}
          <T style={{ fontSize: 12, color: C.pink, fontFamily: F.bodyBold }}>+{bonus} bonus XP</T>
        </T>
        <T style={{ fontSize: 12, color: C.muted }}>Resets in {left(resets)}</T>
      </View>
    </View>
  );
}

export function Rewards() {
  const insets = useSafeAreaInsets();
  const p = useProgress();
  const [tab, setTab] = useState<'challenges' | 'achievements'>('challenges');
  return (
    <Paper>
      <PageHeader title="Rewards" top={insets.top} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Segmented value={tab} options={[{ id: 'challenges', label: 'Challenges' }, { id: 'achievements', label: 'Achievements' }]} onChange={setTab} />
        {tab === 'challenges' ? (
          <>
            <ChallengeSection title="Daily challenges" set={p.daily} defs={DAILY} bonus={DAILY_BONUS} resets={nextDay()} />
            <ChallengeSection title="Weekly challenges" set={p.weekly} defs={WEEKLY} bonus={WEEKLY_BONUS} resets={nextWeek()} />
            <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>Ranked matches count toward challenges</T>
          </>
        ) : (
          <Achievements />
        )}
      </ScrollView>
    </Paper>
  );
}

type Filter = 'all' | string;

/** Achievements: category chips that scroll sideways, then a grid of
 *  badges. Tap one for its details and progress. */
function Achievements() {
  const p = useProgress();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<AchievementDef | null>(null);
  const earned = ACHIEVEMENTS.filter((a) => p.unlocked[a.id]).length;
  const list = ACHIEVEMENTS.filter((a) => filter === 'all' || a.series === filter);
  const colW = (Math.min(width, 560) - 32 - 12) / 2;
  const chips = [{ key: 'all', label: 'All' }, ...ACHIEVEMENT_SERIES];
  const st = open ? achievementState(p, open) : null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Display size={20}>Your achievements</Display>
        <T style={{ fontSize: 12.5, color: C.muted }}>
          {earned} / {ACHIEVEMENTS.length} earned
        </T>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {chips.map((c) => {
          const on = filter === c.key;
          return (
            <Pressable key={c.key} onPress={() => setFilter(c.key)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 2, borderColor: on ? C.blue : C.ink, backgroundColor: on ? C.blue : C.paper, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.bodyMed, fontSize: 14.5, color: on ? C.white : C.ink }}>{c.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {list.map((a) => {
          const s = achievementState(p, a);
          return (
            <Pressable key={a.id} onPress={() => setOpen(a)} accessibilityRole="button" accessibilityLabel={`${a.name}, ${s.unlocked ? 'earned' : `${Math.min(s.value, a.goal)} of ${a.goal}`}`} style={{ width: colW }}>
              <Card shadow={s.unlocked ? C.green : C.ink}>
                <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 14, paddingHorizontal: 12, minHeight: 150, justifyContent: 'center' }}>
                  {s.unlocked && <Text style={{ position: 'absolute', top: 6, right: 7, fontSize: 16 }}>✅</Text>}
                  <Text style={{ fontSize: 30, opacity: s.unlocked ? 1 : 0.28 }}>{a.emoji}</Text>
                  <T numberOfLines={2} style={{ fontFamily: F.bodyMed, fontSize: 14.5, textAlign: 'center', marginTop: 10, color: s.unlocked ? C.ink : C.muted }}>{a.name}</T>
                  <View style={{ alignSelf: 'stretch', marginTop: 8, gap: 4 }}>
                    <Bar pct={s.pct} color={s.unlocked ? C.green : C.blue} height={9} />
                    <Label style={{ fontSize: 9, opacity: 0.7, textAlign: 'center' }}>
                      {Math.min(s.value, a.goal)} / {a.goal}
                    </Label>
                  </View>
                  <T style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.pink, marginTop: 4 }}>{a.xp} XP</T>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && st && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 54, opacity: st.unlocked ? 1 : 0.35 }}>{open.emoji}</Text>
            <T style={{ fontSize: 15, textAlign: 'center' }}>{open.desc}</T>
            <T style={{ fontFamily: F.bodyBold, color: C.pink }}>{st.unlocked ? `✅ +${open.xp} XP` : `+${open.xp} XP`}</T>
            {!st.unlocked && (
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Bar pct={st.pct} color={C.blue} />
                </View>
                <Label>
                  {Math.min(st.value, open.goal)} / {open.goal}
                </Label>
              </View>
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
