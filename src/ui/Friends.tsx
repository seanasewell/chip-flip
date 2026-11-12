// Friends page: your friend code, adding players by name or code, and your
// friends, requests received and requests sent.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { friends, useFriends, type Friendship, type Player } from '@/lib/friends';
import { useProfile } from '@/lib/profile';
import { Icon } from './icons';
import { Button, Card, Display, Label, Paper, Segmented, Sheet, T } from './kit';
import { fadeIn, fadeUp } from './motion';
import { Avatar } from './Players';
import { C, F } from './theme';

const hueOf = (name: string) => (name.charCodeAt(0) * 47 + name.length * 13) % 360;
type Tab = 'friends' | 'incoming' | 'sent';

export function Friends({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { online } = useProfile();
  const f = useFriends();
  const [tab, setTab] = useState<Tab>('friends');
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Friendship | null>(null);

  useEffect(() => {
    if (online === 'on') void friends.refresh();
  }, [online]);

  const mine = f.list.filter((x) => x.kind === 'friend');
  const incoming = f.list.filter((x) => x.kind === 'incoming');
  const sent = f.list.filter((x) => x.kind === 'sent');
  const shown = (tab === 'friends' ? mine : tab === 'incoming' ? incoming : sent).filter((x) => !filter.trim() || x.other.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const invite = () =>
    Share.share({ message: `Play Chip Flip with me! Add me as a friend with my code ${f.myCode ?? ''}.` }).catch(() => {});

  return (
    <Paper>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Icon name="back" size={26} />
        </Pressable>
        <Display size={30}>Friends</Display>
      </View>

      {online !== 'on' && !f.ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          {online === 'connecting' ? <ActivityIndicator color={C.ink} /> : <T style={{ textAlign: 'center', color: C.muted }}>Friends need a connection to the Chip Flip server. Check your connection and try again.</T>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <Card accent={C.blue}>
            <View style={{ padding: 14, gap: 10 }}>
              <Display size={22}>Invite friends to play 👋</Display>
              <T style={{ fontSize: 14, lineHeight: 20, opacity: 0.85 }}>Share your friend code, or find players by name. Once they accept, they show up here.</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, height: 46 }}>
                <Label style={{ fontSize: 10, opacity: 0.7 }}>Your code</Label>
                <T selectable style={{ fontFamily: F.bodyBold, fontSize: 20, letterSpacing: 3 }}>
                  {f.myCode ?? '······'}
                </T>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Share code" variant="primary" onPress={invite} style={{ flex: 1 }} disabled={!f.myCode} />
                <Button title="Add a friend" variant="ghost" onPress={() => setAdding(true)} style={{ flex: 1 }} />
              </View>
            </View>
          </Card>

          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: 'friends', label: `Friends · ${mine.length}` },
              { id: 'incoming', label: incoming.length ? `Requests · ${incoming.length}` : 'Requests' },
              { id: 'sent', label: 'Sent' },
            ]}
          />
          {tab === 'friends' && mine.length > 0 && (
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Search friends"
              placeholderTextColor={C.faint}
              autoCorrect={false}
              style={{ height: 46, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.body, fontSize: 15, color: C.ink }}
            />
          )}

          {f.failed && !f.ready ? (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
              <T style={{ color: C.muted, textAlign: 'center' }}>Couldn’t load your friends.</T>
              <Button title="Try again" variant="ghost" onPress={() => friends.refresh()} style={{ width: 160 }} />
            </View>
          ) : !f.ready ? (
            <ActivityIndicator color={C.ink} style={{ marginTop: 20 }} />
          ) : shown.length === 0 ? (
            <T style={{ color: C.muted, textAlign: 'center', paddingVertical: 20 }}>
              {filter.trim() && tab === 'friends' ? 'No friends match that name.' : tab === 'friends' ? 'No friends yet. Share your code or add someone.' : tab === 'incoming' ? 'No requests right now.' : 'You have no requests waiting.'}
            </T>
          ) : (
            <View style={{ gap: 8 }}>
              {shown.map((x, i) => (
                <Animated.View key={x.id} entering={fadeUp(Math.min(i, 8) * 30, 300)}>
                  <FriendRow f={x} onPress={() => setOpen(x)} />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AddSheet open={adding} onClose={() => setAdding(false)} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.other.name}>
        {open && <FriendActions f={open} done={() => setOpen(null)} />}
      </Sheet>
    </Paper>
  );
}

function FriendRow({ f, onPress }: { f: Friendship; onPress: () => void }) {
  return (
    <Card offset={3} accent={C.blue}>
      <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Avatar glyph={(f.other.name[0] ?? '?').toUpperCase()} hue={hueOf(f.other.name)} size={36} />
        <T numberOfLines={1} style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 15 }}>
          {f.other.name}
        </T>
        {f.kind === 'incoming' ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <SmallButton label="Accept" color={C.green} onPress={() => friends.accept(f)} />
            <SmallButton label="Decline" onPress={() => friends.remove(f)} />
          </View>
        ) : f.kind === 'sent' ? (
          <Label style={{ fontSize: 9, opacity: 0.6 }}>Pending</Label>
        ) : (
          <T style={{ color: C.muted }}>›</T>
        )}
      </Pressable>
    </Card>
  );
}

function SmallButton({ label, onPress, color = C.paper, disabled = false }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ height: 32, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 2, borderColor: C.ink, backgroundColor: color, opacity: disabled ? 0.5 : 1, transform: pressed ? [{ translateY: 1 }] : [] })}>
      <T style={{ fontFamily: F.bodyBold, fontSize: 12.5 }}>{label}</T>
    </Pressable>
  );
}

function FriendActions({ f, done }: { f: Friendship; done: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar glyph={(f.other.name[0] ?? '?').toUpperCase()} hue={hueOf(f.other.name)} size={52} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.bodyBold, fontSize: 17 }}>{f.other.name}</T>
          <T style={{ color: C.muted, fontSize: 13 }}>
            {f.kind === 'friend' ? `Friends since ${new Date(f.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : f.kind === 'sent' ? 'Request sent' : 'Wants to be friends'} · Code {f.other.code}
          </T>
        </View>
      </View>
      {f.kind === 'friend' && <T style={{ color: C.muted, fontSize: 13 }}>Playing friends online is coming soon. For now you can play together on one device.</T>}
      {f.kind === 'incoming' && (
        <Button
          title="Accept"
          onPress={async () => {
            done();
            await friends.accept(f);
          }}
        />
      )}
      {f.kind === 'friend' && !sure ? (
        <Button title="Remove friend" variant="ghost" onPress={() => setSure(true)} />
      ) : (
        <Button
          title={f.kind === 'friend' ? `Yes, remove ${f.other.name}` : f.kind === 'sent' ? 'Cancel request' : 'Decline'}
          variant={f.kind === 'friend' ? 'danger' : 'ghost'}
          onPress={async () => {
            done();
            await friends.remove(f);
          }}
        />
      )}
    </View>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const f = useFriends();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Player[] | null>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const text = q.trim();
    const n = ++seq.current;
    const t = setTimeout(
      async () => {
        if (text.length < 2) {
          setResults([]);
          setBusy(false);
          return;
        }
        setBusy(true);
        const r = await friends.search(text);
        if (n !== seq.current) return;
        setResults(r);
        setBusy(false);
      },
      text.length < 2 ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [q]);

  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Add a friend">
      <View style={{ gap: 10 }}>
        <T style={{ color: C.muted, fontSize: 13 }}>Type their friend code or the start of their name.</T>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Name or code"
          placeholderTextColor={C.faint}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ height: 46, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, paddingHorizontal: 12, fontFamily: F.bodyBold, fontSize: 15, color: C.ink }}
        />
        <View style={{ minHeight: 120, gap: 8 }}>
          {busy ? (
            <ActivityIndicator color={C.ink} style={{ marginTop: 16 }} />
          ) : results === null ? (
            <T style={{ color: C.muted, textAlign: 'center', marginTop: 16 }}>Couldn’t search right now. Try again.</T>
          ) : q.trim().length >= 2 && results.length === 0 ? (
            <T style={{ color: C.muted, textAlign: 'center', marginTop: 16 }}>No players found.</T>
          ) : (
            results.slice(0, 8).map((p) => {
              const rel = f.list.find((x) => x.other.id === p.id);
              const label = rel?.kind === 'friend' ? 'Friends' : rel?.kind === 'sent' ? 'Sent' : rel?.kind === 'incoming' ? 'Accept' : 'Add';
              return (
                <Animated.View key={p.id} entering={fadeIn(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
                  <Avatar glyph={(p.name[0] ?? '?').toUpperCase()} hue={hueOf(p.name)} size={36} />
                  <View style={{ flex: 1 }}>
                    <T numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 15 }}>
                      {p.name}
                    </T>
                    <T style={{ color: C.muted, fontSize: 12 }}>Code {p.code}</T>
                  </View>
                  <SmallButton
                    label={pending === p.id ? '…' : label}
                    color={label === 'Add' || label === 'Accept' ? C.green : C.paper}
                    disabled={label === 'Friends' || label === 'Sent' || pending === p.id}
                    onPress={async () => {
                      setPending(p.id);
                      await friends.add(p);
                      setPending(null);
                    }}
                  />
                </Animated.View>
              );
            })
          )}
        </View>
      </View>
    </Sheet>
  );
}
