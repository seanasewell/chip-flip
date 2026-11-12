import { ScrollView, Share, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODES } from '@/core/board';
import { seatById, sequenceCount, toWin } from '@/core/engine';
import type { Seat } from '@/core/types';
import { game, useGame } from '@/lib/game';
import { levelOf, progress } from '@/lib/progress';
import { useEffect, useState } from 'react';
import { LevelBadge } from './LevelBadge';
import { Odometer } from './Odometer';
import { WinConfetti } from './Confetti';
import { fadeIn, fadeUp, pop } from './motion';
import { Button, Card, Display, Label, Paper, T } from './kit';
import { Avatar, Pips, SeatAvatar } from './Players';
import { C, F, sideColor } from './theme';

const nameOf = (s: Seat) => (s.kind === 'you' ? 'You' : s.name);

export function Results() {
  const g = useGame();
  // What this match earned (ranked only), kept for this screen.
  const [earned] = useState(() => progress.get().last);
  useEffect(() => () => progress.clearLast(), []);
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const m = g.match!;
  const casual = !!g.config?.casual;
  const you = m.seats.find((s) => s.kind === 'you')!;
  const winSide = m.sides[m.winnerSide!];
  const won = winSide.index === you.side;
  const teams = MODES[m.mode].teams;
  const winners = winSide.seats.map((id) => seatById(m, id));
  const forfeited = m.forfeitedBy ? seatById(m, m.forfeitedBy) : null;
  const title =
    forfeited?.kind === 'you'
      ? `${teams ? winSide.name : winners[0].name} wins by forfeit`
      : won
        ? teams
          ? `${winSide.name} won the match!`
          : 'You won the match!'
        : teams
          ? `${winSide.name} won the match`
          : `${winners[0].name} won the match`;
  const seq = (i: number) => sequenceCount(m, i);
  const standings = m.sides.slice().sort((a, b) => (a.index === winSide.index ? -1 : b.index === winSide.index ? 1 : seq(b.index) - seq(a.index)));
  const two = m.sides.length === 2;

  return (
    <Paper>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 14, paddingBottom: 24, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Animated.View entering={pop()} style={{ flexDirection: 'row' }}>
            {winners.map((s, k) => (
              <View key={s.id} style={{ marginLeft: k ? -14 : 0 }}>
                <Avatar glyph={s.glyph} hue={s.hue} size={teams ? 76 : 96} you={s.kind === 'you'} />
              </View>
            ))}
          </Animated.View>
          <Animated.Text entering={fadeIn(250, 200)} style={{ position: 'absolute', top: -34, fontSize: 40 }}>
            👑
          </Animated.Text>
          <Display size={30} style={{ textAlign: 'center', marginTop: 18 }}>
            {title}
          </Display>
          {forfeited && <T style={{ marginTop: 4, color: C.muted, fontSize: 14 }}>{casual ? 'You forfeited this casual match.' : 'You forfeited this match. It counts as a loss.'}</T>}
          {m.ending === 'stalemate' && <T style={{ marginTop: 4, color: C.muted, fontSize: 14, textAlign: 'center' }}>No one could play, so the most chip flips (then the longest line) took it.</T>}
          {two && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Display size={54} style={{ color: sideColor(you.side).base }}>
                {seq(you.side)}
              </Display>
              <View style={{ width: 20, height: 5, backgroundColor: C.ink }} />
              <Display size={54} style={{ color: sideColor(1 - you.side).base }}>
                {seq(1 - you.side)}
              </Display>
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <Card>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
              {casual ? (
                <>
                  <Label style={{ fontSize: 9.5, opacity: 0.7 }}>Casual match</Label>
                  <T style={{ fontSize: 13, marginTop: 2 }}>Not counted toward your record</T>
                </>
              ) : (
                <>
                  <Label style={{ fontSize: 9.5, opacity: 0.7 }}>XP earned</Label>
                  <View style={{ marginTop: 2 }}>
                    <Odometer value={earned ? earned.xpTo - earned.xpFrom : 0} prefix="+" size={24} color={C.blue} delay={450} />
                  </View>
                </>
              )}
            </View>
          </Card>
        </View>

        {!casual && earned && levelOf(earned.xpFrom).level !== levelOf(earned.xpTo).level && (
          <Animated.View entering={pop(500)} style={{ marginTop: 16 }}>
            <Card shadow={C.green}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <LevelBadge level={levelOf(earned.xpTo).level} size={46} />
                <View style={{ flex: 1 }}>
                  <Display size={22}>Level up!</Display>
                  <T style={{ color: C.muted, fontSize: 13 }}>You’re now level {levelOf(earned.xpTo).level} · {levelOf(earned.xpTo).title}</T>
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        <View style={{ marginTop: 20, gap: 8 }}>
          {standings.map((s, i) => {
            const seats = s.seats.map((id) => seatById(m, id));
            return (
              <Animated.View key={s.index} entering={fadeUp(200 + i * 70)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {seats.map((x, k) => (
                      <View key={x.id} style={{ marginLeft: k ? -8 : 0 }}>
                        <SeatAvatar seat={x} size={26} />
                      </View>
                    ))}
                  </View>
                  <T numberOfLines={1} style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 14 }}>
                    {teams ? `${s.name} · ${seats.map(nameOf).join(' & ')}` : nameOf(seats[0])}
                  </T>
                  {s.index === winSide.index && <T style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.greenText }}>Winner</T>}
                  <Pips count={seq(s.index)} total={toWin(m)} side={s.index} size={7} />
                </View>
              </Animated.View>
            );
          })}
        </View>
        {!casual && earned && earned.achievements.length + earned.challenges.length > 0 && (
          <View style={{ marginTop: 20, gap: 8 }}>
            <Label>Unlocked</Label>
            {[...earned.achievements, ...earned.challenges].map((a, i) => (
              <Animated.View key={`${a.name}-${i}`} entering={fadeUp(400 + i * 90)}>
                <Card offset={3}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <T style={{ fontSize: 22 }}>{a.emoji}</T>
                    <T numberOfLines={1} style={{ flex: 1, fontFamily: F.bodyBold }}>{a.name}</T>
                    <T style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.pink }}>+{a.xp} XP</T>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={{ borderTopWidth: 2, borderColor: C.ink, backgroundColor: C.paper, paddingHorizontal: 14, paddingTop: 14, paddingBottom: insets.bottom + 12, gap: 10 }}>
        <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center', gap: 10 }}>
          {won && !m.forfeitedBy && (
            <Button
              title="Share your win"
              variant="blue"
              onPress={() => Share.share({ message: `I just won a ${MODES[m.mode].name.toLowerCase()} match of Chip Flip${two ? ` ${seq(you.side)}–${seq(1 - you.side)}` : ''} 🏆 Think you can flip more chips than me?` }).catch(() => {})}
            />
          )}
          <Button title="Play again" icon="arrow" onPress={() => game.playAgain()} />
          <Button title="Back to Play" variant="ghost" onPress={() => game.exit()} />
        </View>
      </View>
      {/* Only when you (or your team) won, not after a forfeit. */}
      {won && !m.forfeitedBy && <WinConfetti width={dims.width} height={dims.height} />}
    </Paper>
  );
}
