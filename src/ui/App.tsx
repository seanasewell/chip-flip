import { BackHandler } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import type { GameModeId } from '@/core/types';
import { useGame } from '@/lib/game';
import { useProfile } from '@/lib/profile';
import { GameScreen } from './GameScreen';
import { Home } from './Home';
import { Setup } from './Setup';
import { Welcome } from './Welcome';

/** Screen flow: welcome on first launch, then home, setup and matches. */
export function ChipFlipApp() {
  const { profile } = useProfile();
  const g = useGame();
  const [setup, setSetup] = useState<GameModeId | null>(null);

  // Android back button: setup goes back to home.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (setup && g.view === 'none') {
        setSetup(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [setup, g.view]);

  let key: string;
  let screen: React.ReactNode;
  if (!profile) {
    key = 'welcome';
    screen = <Welcome />;
  } else if (g.view !== 'none' && g.match) {
    key = g.view === 'results' ? `results-${g.match.id}` : `game-${g.match.id}`;
    screen = <GameScreen />;
  } else if (setup) {
    key = `setup-${setup}`;
    screen = <Setup mode={setup} onBack={() => setSetup(null)} />;
  } else {
    key = 'home';
    screen = <Home onMode={setSetup} />;
  }
  return (
    <Animated.View key={key} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
      {screen}
    </Animated.View>
  );
}
