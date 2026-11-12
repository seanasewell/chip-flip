import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeIn } from './motion';

import type { GameModeId } from '@/core/types';
import { useGame } from '@/lib/game';
import { progress } from '@/lib/progress';
import { useProfile } from '@/lib/profile';
import { GameScreen } from './GameScreen';
import { Home } from './Home';
import { Profile, Settings } from './Profile';
import { Ranks } from './Ranks';
import { Rewards } from './Rewards';
import { Setup } from './Setup';
import { TabBar, type Tab } from './Tabs';
import { TutorialGate } from './Tutorial';
import { Welcome } from './Welcome';

type Page = { name: 'setup'; mode: GameModeId } | { name: 'settings' };

/** Screen flow: welcome on first launch, then the tabs, with setup and
 *  settings as pages on top, and matches full screen. */
export function ChipFlipApp() {
  const { profile } = useProfile();
  const g = useGame();
  const [tab, setTab] = useState<Tab>('play');
  const [page, setPage] = useState<Page | null>(null);

  // Whoever signs in (or starts as a guest) lands on the Play tab, never on
  // the tab the previous player left open.
  const uid = profile?.id ?? null;
  const [lastUid, setLastUid] = useState(uid);
  if (uid !== lastUid) {
    setLastUid(uid);
    setTab('play');
    setPage(null);
  }

  // Android back button closes a page.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page && g.view === 'none') {
        setPage(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [page, g.view]);

  const openTab = (t: Tab) => {
    progress.refresh();
    setTab(t);
  };

  let key: string;
  let screen: React.ReactNode;
  let tabs = false;
  if (!profile) {
    key = 'welcome';
    screen = <Welcome />;
  } else if (g.view !== 'none' && g.match) {
    key = g.view === 'results' ? `results-${g.match.id}` : `game-${g.match.id}`;
    screen = <GameScreen />;
  } else if (page?.name === 'setup') {
    key = `setup-${page.mode}`;
    screen = <Setup mode={page.mode} onBack={() => setPage(null)} />;
  } else if (page?.name === 'settings') {
    tabs = true;
    key = 'settings';
    screen = <Settings onBack={() => setPage(null)} />;
  } else {
    tabs = true;
    key = `tab-${tab}`;
    screen =
      tab === 'play' ? (
        <Home onMode={(mode) => setPage({ name: 'setup', mode })} onLevel={() => openTab('profile')} />
      ) : tab === 'ranks' ? (
        <Ranks />
      ) : tab === 'rewards' ? (
        <Rewards />
      ) : (
        <Profile onSettings={() => setPage({ name: 'settings' })} onAchievements={() => openTab('rewards')} />
      );
  }
  return (
    <View style={{ flex: 1 }}>
      <Animated.View key={key} entering={fadeIn()} style={{ flex: 1 }}>
        {screen}
      </Animated.View>
      {tabs && profile && <TutorialGate playerId={profile.id} onPlay={() => setPage({ name: 'setup', mode: 'h2h' })} />}
      {tabs && (
        <TabBar
          tab={tab}
          onTab={(t) => {
            setPage(null);
            openTab(t);
          }}
        />
      )}
    </View>
  );
}
