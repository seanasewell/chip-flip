import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACHIEVEMENTS, ACHIEVEMENT_SERIES, DAILY, DAILY_BONUS, WEEKLY, WEEKLY_BONUS, achievementState, nextDay, nextWeek, useProgress, type ChallengeDef, type ChallengeSet } from '@/lib/progress';
import { Bar } from './Bar';
import { Card, Display, Label, Paper, Segmented, T } from './kit';
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

function Section({ title, set, defs, bonus, resets }: { title: string; set: ChallengeSet; defs: ChallengeDef[]; bonus: number; resets: number }) {
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
  const unlocked = ACHIEVEMENTS.filter((a) => p.unlocked[a.id]).length;
  return (
    <Paper>
      <PageHeader title="Rewards" top={insets.top} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Segmented value={tab} options={[{ id: 'challenges', label: 'Challenges' }, { id: 'achievements', label: 'Achievements' }]} onChange={setTab} />
        {tab === 'challenges' ? (
          <>
            <Section title="Daily challenges" set={p.daily} defs={DAILY} bonus={DAILY_BONUS} resets={nextDay()} />
            <Section title="Weekly challenges" set={p.weekly} defs={WEEKLY} bonus={WEEKLY_BONUS} resets={nextWeek()} />
            <T style={{ textAlign: 'center', color: C.muted, fontSize: 12 }}>Ranked matches count toward challenges</T>
          </>
        ) : (
          <>
            <T style={{ color: C.muted, fontSize: 13, marginTop: -6 }}>
              {unlocked} of {ACHIEVEMENTS.length} unlocked
            </T>
            {ACHIEVEMENT_SERIES.map((s) => (
              <View key={s.key} style={{ gap: 10 }}>
                <Label>{s.label}</Label>
                {ACHIEVEMENTS.filter((a) => a.series === s.key).map((a) => {
                  const st = achievementState(p, a);
                  return (
                    <Card key={a.id} shadow={st.unlocked ? C.green : C.ink}>
                      <View style={{ flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center', opacity: st.unlocked ? 1 : 0.92 }}>
                        <Text style={{ fontSize: 24, width: 32, textAlign: 'center', opacity: st.unlocked ? 1 : 0.45 }}>{a.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                            <T style={{ fontFamily: F.bodyBold, flexShrink: 1 }}>{a.name}</T>
                            <T style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.pink }}>{st.unlocked ? '✅' : `+${a.xp} XP`}</T>
                          </View>
                          <T style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{a.desc}</T>
                          {!st.unlocked && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Bar pct={st.pct} color={C.blue} height={10} />
                              </View>
                              <Label style={{ fontSize: 10, opacity: 0.75 }}>
                                {Math.min(st.value, a.goal)} / {a.goal}
                              </Label>
                            </View>
                          )}
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Paper>
  );
}
