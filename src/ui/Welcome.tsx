import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { profile } from '@/lib/profile';
import { Button, Display, Label, Paper, T } from './kit';
import { WelcomeLogo } from './Logo';
import { C, F } from './theme';

/** First launch: the animated logo, then the player's name. */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<'hello' | 'name'>('hello');
  const [name, setName] = useState('');
  const ok = name.trim().length >= 1;

  return (
    <Paper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 16, paddingHorizontal: 18 }}>
        {step === 'hello' ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <WelcomeLogo width={Math.min(240, width * 0.58)} />
              <T style={{ textAlign: 'center', marginTop: 16, fontSize: 15, lineHeight: 22, color: C.muted }}>
                Play a card. Claim its space.{'\n'}Five in a row. Flip your chips.
              </T>
            </View>
            <Button title="Get started" icon="arrow" onPress={() => setStep('name')} />
          </>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Animated.View entering={FadeInDown.duration(300)}>
                <Label>(1/1) Your name</Label>
                <Display size={44} style={{ marginTop: 14 }}>
                  What should{'\n'}we call you?
                </Display>
                <T style={{ marginTop: 8, color: C.muted, fontSize: 14 }}>Shown to the other players at the table. You can change it later in Settings.</T>
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
      </KeyboardAvoidingView>
    </Paper>
  );
}
