// Bottom tab bar: Play, Ranks, Rewards, Profile.
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/lib/profile';
import { Avatar } from './Players';
import { C, F } from './theme';

export type Tab = 'play' | 'ranks' | 'rewards' | 'profile';

const TABS: { id: Tab; label: string; emoji?: string }[] = [
  { id: 'play', label: 'Play', emoji: '🎮' },
  { id: 'ranks', label: 'Ranks', emoji: '🏆' },
  { id: 'rewards', label: 'Rewards', emoji: '🏅' },
  { id: 'profile', label: 'Profile' },
];

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 2, borderColor: C.ink, backgroundColor: C.paper, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), paddingHorizontal: 8, gap: 6 }} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} onPress={() => onTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} style={{ flex: 1 }}>
            <View style={{ height: 58, paddingRight: on ? 3 : 0, paddingBottom: on ? 3 : 0 }}>
              {on && <View style={{ position: 'absolute', left: 3, top: 3, right: 0, bottom: 0, backgroundColor: C.green }} />}
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: on ? C.ink : 'transparent' }}>
                {t.emoji ? (
                  <Text style={{ fontSize: 22, lineHeight: 26 }}>{t.emoji}</Text>
                ) : (
                  <Avatar glyph={(profile?.name[0] ?? 'Y').toUpperCase()} hue={230} size={24} you />
                )}
                <Text allowFontScaling={false} style={{ fontFamily: F.monoBold, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: on ? C.paper : C.muted }}>
                  {t.label}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Big page title used at the top of each tab. */
export function PageHeader({ title, right, top }: { title: string; right?: React.ReactNode; top: number }) {
  return (
    <View style={{ paddingTop: top + 6, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text allowFontScaling={false} style={{ fontFamily: F.display, fontSize: 32, lineHeight: 38, color: C.ink, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {right}
    </View>
  );
}
