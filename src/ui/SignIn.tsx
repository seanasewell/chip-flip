// Continue with Apple / Continue with Google, in Chip Flip's button style.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { profile } from '@/lib/profile';
import { canUseApple, type Provider, type SocialResult } from '@/lib/social';
import { Button, Sheet, T } from './kit';
import { C, F } from './theme';

export const PROVIDER_NAME: Record<Provider, string> = { apple: 'Apple', google: 'Google' };
const GOOGLE_G = require('@/assets/images/google-g.png');

function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={C.ink}
        d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43Zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C4.04 18.38 3 15.57 3 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.62 0 2.89.06 4.38 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.95 4.45Z"
      />
    </Svg>
  );
}

function ProviderButton({ p, onPress, busy }: { p: Provider; onPress: () => void; busy: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={`Continue with ${PROVIDER_NAME[p]}`}>
      {({ pressed }) => (
        <View style={{ height: 56, paddingRight: 4, opacity: busy ? 0.6 : 1 }}>
          <View style={{ position: 'absolute', left: 4, top: 4, right: 0, bottom: 0, backgroundColor: C.ink }} />
          <View style={{ height: 52, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [] }}>
            {p === 'apple' ? <AppleLogo /> : <Image source={GOOGLE_G} style={{ width: 20, height: 20 }} />}
            <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.ink }}>Continue with {PROVIDER_NAME[p]}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function useAppleAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    void canUseApple().then((v) => live && setOk(v));
    return () => {
      live = false;
    };
  }, []);
  return ok;
}

/**
 * Apple and Google buttons. `mode` "link" saves the current guest's
 * progress to that account; "signin" signs in to a saved player.
 * If the account already has a player when linking, offers to switch to it.
 */
export function ProviderButtons({ mode, onDone }: { mode: 'link' | 'signin'; onDone?: () => void }) {
  const apple = useAppleAvailable();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Provider | null>(null);

  const after = (r: SocialResult, p: Provider) => {
    if (r.kind === 'ok') onDone?.();
    else if (r.kind === 'conflict') setConflict(p);
    else if (r.kind === 'error') setError(r.message);
  };
  const go = async (p: Provider) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    after(mode === 'link' ? await profile.link(p) : await profile.signIn(p), p);
    setBusy(false);
  };
  const switchTo = async () => {
    const p = conflict!;
    setConflict(null);
    setBusy(true);
    after(await profile.signIn(p), p);
    setBusy(false);
  };

  return (
    <View style={{ gap: 10 }}>
      {apple && <ProviderButton p="apple" busy={busy} onPress={() => go('apple')} />}
      <ProviderButton p="google" busy={busy} onPress={() => go('google')} />
      {busy && <ActivityIndicator color={C.ink} />}
      {error && <T style={{ color: C.red, fontSize: 13, textAlign: 'center' }}>{error}</T>}
      <Sheet open={!!conflict} onClose={() => setConflict(null)} title="Switch players?">
        <T style={{ fontSize: 14, lineHeight: 20, color: C.muted }}>
          That {conflict ? PROVIDER_NAME[conflict] : ''} account already has a Chip Flip player. Switch to it? The guest progress on this phone won’t carry over.
        </T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button title="Stay a guest" variant="ghost" onPress={() => setConflict(null)} style={{ flex: 1 }} />
          <Button title="Switch" onPress={switchTo} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}
