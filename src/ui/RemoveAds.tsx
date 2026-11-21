// Remove ads: the Play tab offer, the Settings section, the purchase sheet
// and its confirmation, plus the simulated ad used in Expo Go and test builds.
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { registerSimulatedAdHost } from '@/lib/ads';
import { purchases, useAdFree } from '@/lib/purchases';
import { Button, Card, Display, Label, Paper, Sheet, T } from './kit';
import { fadeIn } from './motion';
import { C, F } from './theme';

/** The purchase sheet plus its "You're ad-free!" confirmation. `open()` starts the flow. */
function useRemoveAdsFlow() {
  const [sheet, setSheet] = useState<'buy' | 'done' | null>(null);
  const [doneTitle, setDoneTitle] = useState("You're ad-free!");
  const sheets = (
    <>
      <PurchaseSheet
        open={sheet === 'buy'}
        onClose={() => setSheet(null)}
        onSuccess={(restored) => {
          setDoneTitle(restored ? 'Purchase restored' : "You're ad-free!");
          setSheet('done');
        }}
      />
      <Sheet open={sheet === 'done'} onClose={() => setSheet(null)}>
        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <T style={{ fontSize: 44, lineHeight: 54 }}>🎉</T>
          <Display size={24} style={{ marginTop: 6, textAlign: 'center' }}>
            {doneTitle}
          </Display>
          <T style={{ textAlign: 'center', marginTop: 6, color: C.muted, fontSize: 14, lineHeight: 20 }}>All advertisements have been removed. Enjoy uninterrupted chip flipping.</T>
        </View>
        <Button title="Continue" onPress={() => setSheet(null)} style={{ marginTop: 18 }} />
      </Sheet>
    </>
  );
  return { open: () => setSheet('buy'), sheets };
}

const Check = () => <T style={{ fontSize: 18, lineHeight: 22 }}>✅</T>;

/** Play tab: an offer card that opens the purchase sheet. Gone once ad-free. */
export function RemoveAdsCard() {
  const st = useAdFree();
  const flow = useRemoveAdsFlow();
  if (st.adFree || st.provider === 'none') return <>{flow.sheets}</>;
  return (
    <>
      <Card accent={C.orange}>
        <Pressable
          onPress={flow.open}
          accessibilityRole="button"
          accessibilityLabel={`Remove ads${st.price ? `, ${st.price}` : ''}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, opacity: pressed ? 0.8 : 1 })}
        >
          <T style={{ fontSize: 26, lineHeight: 32 }}>🚫</T>
          <View style={{ flex: 1 }}>
            <Display size={19}>Remove ads</Display>
            <T style={{ fontSize: 13, color: C.muted, marginTop: 1 }}>One-time purchase. No subscription.</T>
          </View>
          <View style={{ borderWidth: 2, borderColor: C.ink, backgroundColor: C.orange, paddingHorizontal: 12, paddingVertical: 7 }}>
            <T style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.white }}>{st.price ?? 'Go ad-free'}</T>
          </View>
        </Pressable>
      </Card>
      {flow.sheets}
    </>
  );
}

/** Settings → Advertisements. Hidden where purchases aren't available at all. */
export function AdvertisementsSection() {
  const st = useAdFree();
  const flow = useRemoveAdsFlow();
  if (st.provider === 'none' && !st.adFree) return null;
  return (
    <View style={{ gap: 8 }}>
      <Label style={{ fontSize: 10 }}>Advertisements</Label>
      <Card accent={st.adFree ? C.green : C.orange}>
        {st.adFree ? (
          <View accessibilityLabel="Ad-free experience. Ads are permanently disabled." style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <T style={{ fontSize: 24, lineHeight: 30 }}>🚫</T>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.bodyBold, fontSize: 15 }}>Ad-free experience</T>
              <T style={{ fontSize: 13, color: C.muted, marginTop: 1 }}>Ads are permanently disabled.</T>
            </View>
            <Check />
          </View>
        ) : (
          <Pressable onPress={flow.open} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, opacity: pressed ? 0.8 : 1 })}>
            <T style={{ fontSize: 24, lineHeight: 30 }}>🚫</T>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.bodyBold, fontSize: 15 }}>Remove ads</T>
              <T style={{ fontSize: 13, color: C.muted, marginTop: 1 }}>Enjoy Chip Flip without interruptions.</T>
            </View>
            <T style={{ fontSize: 20, color: C.muted }}>›</T>
          </Pressable>
        )}
      </Card>
      {flow.sheets}
    </View>
  );
}

function PurchaseSheet({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (restored: boolean) => void }) {
  const st = useAdFree();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setNote(null);
    onClose();
  };
  const buy = async () => {
    setError(null);
    setNote(null);
    const r = await purchases.buy();
    if (r.kind === 'ok') {
      close();
      setTimeout(() => onSuccess(false), 350);
    } else if (r.kind === 'error') setError(r.message);
  };
  const restore = async () => {
    setError(null);
    setNote(null);
    const r = await purchases.restore();
    if (r.kind === 'error') setError(r.message);
    else if (r.adFree) {
      close();
      setTimeout(() => onSuccess(true), 350);
    } else setNote('No previous Remove ads purchase was found for this account.');
  };

  return (
    <Sheet open={open} onClose={close}>
      <View style={{ alignItems: 'center' }}>
        <T style={{ fontSize: 46, lineHeight: 56 }}>🚫</T>
        <Display size={26} style={{ marginTop: 4, textAlign: 'center' }}>
          Play without ads
        </Display>
        <T style={{ textAlign: 'center', marginTop: 6, color: C.muted, fontSize: 14, lineHeight: 20 }}>Remove all advertisements from Chip Flip with a one-time purchase.</T>
      </View>
      <View style={{ gap: 8, marginTop: 16, alignSelf: 'center' }}>
        {['No more ads between matches', 'One-time payment', 'No subscription', 'Permanent access'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Check />
            <T style={{ fontFamily: F.bodyMed, fontSize: 15 }}>{t}</T>
          </View>
        ))}
      </View>
      {st.provider === 'simulated' && <T style={{ marginTop: 14, textAlign: 'center', fontFamily: F.bodyBold, fontSize: 12, color: C.orange }}>Test purchase: nothing is charged. Real purchases need a store build.</T>}
      {error && <T style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.red }}>{error}</T>}
      {note && <T style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.muted }}>{note}</T>}
      <View style={{ gap: 10, marginTop: 18 }}>
        <Button title={st.busy ? 'Please wait…' : st.price ? `Remove ads · ${st.price}` : 'Remove ads'} disabled={st.busy} onPress={() => void buy()} />
        <Button title="Not now" variant="ghost" disabled={st.busy} onPress={close} />
      </View>
      <Pressable onPress={() => void restore()} disabled={st.busy} hitSlop={10} style={{ alignSelf: 'center', marginTop: 14 }}>
        <T style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.muted, textDecorationLine: 'underline' }}>Restore purchases</T>
      </Pressable>
    </Sheet>
  );
}

/** Development stand-in for an interstitial (Expo Go and test builds only). */
export function SimulatedAdHost() {
  const [done, setDone] = useState<(() => void) | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    registerSimulatedAdHost((d) => {
      setLeft(3);
      setDone(() => d);
    });
    return () => registerSimulatedAdHost(null);
  }, []);
  useEffect(() => {
    if (!done || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [done, left]);
  const close = () => {
    const d = done;
    setDone(null);
    d?.();
  };
  return (
    <Modal visible={!!done} animationType="fade" onRequestClose={() => {
      if (left <= 0) close();
    }}>
      <Paper dark>
        <Animated.View entering={fadeIn(250)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ position: 'absolute', top: 60, right: 20 }}>
            {left > 0 ? (
              <T style={{ fontFamily: F.bodyMed, fontSize: 14, color: 'rgba(255,253,246,0.6)' }}>Close in {left}</T>
            ) : (
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close ad" hitSlop={12} style={{ width: 38, height: 38, borderWidth: 2, borderColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontSize: 18, color: C.paper }}>✕</T>
              </Pressable>
            )}
          </View>
          <Label style={{ color: 'rgba(255,253,246,0.5)', fontSize: 11 }}>Advertisement</Label>
          <Card style={{ marginTop: 12 }} shadow={C.blue}>
            <View style={{ paddingHorizontal: 30, paddingVertical: 20 }}>
              <Display size={34}>Test ad</Display>
            </View>
          </Card>
          <T style={{ marginTop: 12, fontSize: 15, color: 'rgba(255,253,246,0.7)', textAlign: 'center', maxWidth: 300 }}>Simulated for development. Real ads from Google AdMob appear only in app builds.</T>
        </Animated.View>
      </Paper>
    </Modal>
  );
}
