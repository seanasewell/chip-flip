import { Anton_400Regular } from '@expo-google-fonts/anton';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { game } from '@/lib/game';
import { hydrate } from '@/lib/kv';
import { profile } from '@/lib/profile';
import { initSound } from '@/ui/sound';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const [stored, setStored] = useState(false);

  useEffect(() => {
    hydrate()
      .then(() => {
        profile.load();
        game.load();
        initSound();
      })
      .finally(() => setStored(true));
  }, []);

  const ready = (fontsLoaded || !!fontError) && stored;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="dark" />
        {ready && <Slot />}
      </View>
    </SafeAreaProvider>
  );
}
