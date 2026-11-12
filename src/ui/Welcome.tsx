import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn, fadeUp } from './motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { profile, useProfile } from '@/lib/profile';
import { ProviderButtons } from './SignIn';
import { Button, Display, Label, Paper, T } from './kit';
import { WelcomeLogo } from './Logo';
import { C, F } from './theme';

/** First launch: the animated logo, then the player's name. */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { needsName } = useProfile();
  const [step, setStep] = useState<'hello' | 'name'>('hello');
  const [name, setName] = useState('');
  // Signed in with Apple or Google as a new player: straight to the name.
  const naming = step === 'name' || needsName !== null;
  const [prefilled, setPrefilled] = useState(false);
  if (needsName && !prefilled) {
    setPrefilled(true);
    setName(needsName);
  }
  const ok = name.trim().length >= 1;

  return (
    <Paper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Padding lives on an inner view: the keyboard view replaces its own bottom padding. */}
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingHorizontal: 18 }}>
        {!naming ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <WelcomeLogo width={Math.min(240, width * 0.58)} />
              <T style={{ textAlign: 'center', marginTop: 16, fontSize: 15, lineHeight: 22, color: C.muted }}>
                Play a card. Claim its space.{'\n'}Five in a row. Flip your chips.
              </T>
            </View>
            <View style={{ gap: 10 }}>
              <ProviderButtons mode="signin" />
              <Button title="Play as a guest" variant="ghost" onPress={() => setStep('name')} />
              <T style={{ textAlign: 'center', fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 4 }}>Guests can save their progress to Apple or Google later in Settings.</T>
            </View>
          </>
        ) : (
          <Animated.View entering={fadeIn()} style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Animated.View entering={fadeUp()}>
                <Label>(1/1) Your name</Label>
                <Display size={44} style={{ marginTop: 14 }}>
                  What should{'\n'}we call you?
                </Display>
                <T style={{ marginTop: 14, color: C.muted, fontSize: 14 }}>Shown to the other players at the table. You can change it later in Settings.</T>
                <TextInput
                  value={name}
                  onChangeText={(t) => setName(t.slice(0, 14))}
                  placeholder="Your name"
                  placeholderTextColor={C.faint}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => ok && profile.create(name)}
                  style={{ marginTop: 18, height: 54, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.bodyBold, fontSize: 18, color: C.ink }}
                />
              </Animated.View>
            </View>
            <Button title="Let's play" icon="arrow" disabled={!ok} onPress={() => profile.create(name)} />
          </Animated.View>
        )}
        </View>
      </KeyboardAvoidingView>
    </Paper>
  );
}
