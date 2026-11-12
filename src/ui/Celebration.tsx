// After a ranked match: a pop-up for a level-up and/or newly unlocked
// achievements (as on the web build). Achievements page sideways when
// there's more than one.
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { levelOf, type Earned } from '@/lib/progress';
import { Button, Card, Display, Label, T } from './kit';
import { LevelBadge } from './LevelBadge';
import { fadeIn, fadeOut, pop } from './motion';
import { haptic } from './sound';
import { C, F } from './theme';

export function Celebration({ earned, delay = 1300 }: { earned: Earned; delay?: number }) {
  const from = levelOf(earned.xpFrom);
  const to = levelOf(earned.xpTo);
  const leveled = to.level > from.level;
  const items = earned.achievements;
  const worth = leveled || items.length > 0;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!worth) return;
    const t = setTimeout(() => {
      setOpen(true);
      haptic.success();
    }, delay);
    return () => clearTimeout(t);
  }, [worth, delay]);

  if (!worth) return null;
  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
      {open && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Animated.View entering={fadeIn(200)} exiting={fadeOut(150)} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,17,17,0.6)' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={pop(0)} style={{ width: '100%', maxWidth: 400 }} accessibilityViewIsModal>
            <Card shadow={C.green} offset={5}>
              <View style={{ paddingTop: 24, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center' }}>
                <Display size={28} style={{ textAlign: 'center' }}>
                  {leveled ? 'Level up! 🎉' : 'Achievements unlocked! 🏅'}
                </Display>

                {leveled && (
                  <>
                    <Animated.View entering={pop(150)} style={{ marginTop: 16 }}>
                      <LevelBadge level={to.level} size={84} />
                    </Animated.View>
                    <Display size={20} style={{ marginTop: 12 }}>
                      Level {to.level} reached!
                    </Display>
                    <T style={{ color: C.muted, fontSize: 14 }}>{to.title}</T>
                  </>
                )}

                {items.length > 0 && (
                  <View style={{ alignSelf: 'stretch', marginTop: leveled ? 20 : 8 }}>
                    <Label style={{ textAlign: 'center', fontSize: 9.5, opacity: 0.7, marginBottom: 6 }}>
                      {leveled ? (items.length === 1 ? 'Achievement unlocked' : `${items.length} achievements unlocked`) : items.length === 1 ? '1 new achievement earned' : `${items.length} new achievements earned`}
                    </Label>
                    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
                      {w > 0 && (
                        <ScrollView
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          onScroll={(e) => setPage(Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / w))))}
                          scrollEventThrottle={32}
                        >
                          {items.map((a, i) => (
                            <View key={`${a.name}-${i}`} style={{ width: w, alignItems: 'center', paddingVertical: 8, gap: 4 }}>
                              <Animated.View entering={pop(leveled ? 300 : 120)} style={{ width: 76, height: 76, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                                <T style={{ fontSize: 36, lineHeight: 44 }}>{a.emoji}</T>
                              </Animated.View>
                              <T style={{ fontFamily: F.bodyBold, fontSize: 16, marginTop: 6 }}>{a.name}</T>
                              <T style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{a.desc}</T>
                              <T style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.pink }}>+{a.xp} XP</T>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                    {items.length > 1 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 6 }} accessibilityLabel={`Achievement ${page + 1} of ${items.length}`}>
                        {items.map((_, i) => (
                          <View key={i} style={{ width: i === page ? 14 : 6, height: 6, borderRadius: 3, backgroundColor: C.ink, opacity: i === page ? 1 : 0.25 }} />
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <Button title="Continue" onPress={() => setOpen(false)} style={{ alignSelf: 'stretch', marginTop: 18 }} />
              </View>
            </Card>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}
