// Chip Flip building blocks: paper background, ink-outlined cards with hard
// shadows, buttons, labels, segmented controls, toggles and bottom sheets.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Icon, type IconName } from './icons';
import { fadeIn, fadeOut, sheetDown, sheetUp } from './motion';
import { C, F, anton } from './theme';

/** Cream paper with a faint grid, behind every screen. */
export function Paper({ children, style, dark = false }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return (
    <View style={[{ flex: 1, backgroundColor: dark ? C.ink : C.bg }, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="grid" width={28} height={28} patternUnits="userSpaceOnUse">
            <Path d="M28 0H0V28" stroke={dark ? 'rgba(255,253,246,0.06)' : C.grid} strokeWidth={1} fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>
      {children}
    </View>
  );
}

export function T({ style, ...p }: TextProps & { style?: StyleProp<TextStyle> }) {
  return <Text {...p} style={[{ fontFamily: F.body, color: C.ink, fontSize: 15 }, style]} />;
}

/** Tall condensed display type (Anton), always upper case. */
export function Display({ size = 22, style, children, ...p }: TextProps & { size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text {...p} style={[{ ...anton(size), color: C.ink, textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

/** Small monospaced uppercase label. */
export function Label({ style, children, ...p }: TextProps & { style?: StyleProp<TextStyle> }) {
  return (
    <Text {...p} style={[{ fontFamily: F.monoBold, color: C.ink, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

/** Ink-outlined box with a hard offset shadow. */
export function Card({ children, style, shadow = C.ink, offset = 4, bg = C.paper, border = 2 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; shadow?: string | null; offset?: number; bg?: string; border?: number }) {
  return (
    <View style={[{ marginRight: shadow ? offset : 0, marginBottom: shadow ? offset : 0 }, style]}>
      {shadow && <View style={{ position: 'absolute', left: offset, top: offset, right: -offset, bottom: -offset, backgroundColor: shadow }} />}
      <View style={{ backgroundColor: bg, borderWidth: border, borderColor: C.ink }}>{children}</View>
    </View>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'dark';

export function Button({ title, onPress, variant = 'primary', disabled = false, icon, style, height = 52 }: { title: string; onPress?: () => void; variant?: ButtonVariant; disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>; height?: number }) {
  const bg = variant === 'primary' ? C.green : variant === 'danger' ? C.red : variant === 'dark' ? C.ink : C.paper;
  const fg = variant === 'danger' || variant === 'dark' ? C.paper : C.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      {({ pressed }) => (
        <View style={{ height: height + 4, paddingRight: 4 }}>
          <View style={{ position: 'absolute', left: 4, top: 4, right: 0, bottom: 0, backgroundColor: C.ink }} />
          <View
            style={{
              height,
              backgroundColor: bg,
              borderWidth: 2,
              borderColor: C.ink,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [],
            }}
          >
            <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: fg }}>{title}</Text>
            {icon && <Icon name={icon} size={16} color={fg} />}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, size = 40 }: { name: IconName; onPress: () => void; label: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      {({ pressed }) => (
        <View style={{ width: size + 3, height: size + 3 }}>
          <View style={{ position: 'absolute', left: 3, top: 3, width: size, height: size, backgroundColor: C.ink }} />
          <View
            style={{
              width: size,
              height: size,
              borderWidth: 2,
              borderColor: C.ink,
              backgroundColor: C.paper,
              alignItems: 'center',
              justifyContent: 'center',
              transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
            }}
          >
            <Icon name={name} size={size * 0.45} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Neon green pill badge. */
export function Badge({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: C.green, borderWidth: 1.5, borderColor: C.ink, paddingHorizontal: 5, paddingVertical: 1.5 }, style]}>
      <Text style={{ fontFamily: F.monoBold, fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', color: C.ink }}>{children}</Text>
    </View>
  );
}

export function Segmented<V extends string>({ value, options, onChange, small = false }: { value: V; options: { id: V; label: string }[]; onChange: (v: V) => void; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, padding: 3, gap: 3 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={{ flex: 1, height: small ? 32 : 38, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.blue : 'transparent' }}
          >
            <Text style={{ fontFamily: F.bodyBold, fontSize: small ? 12.5 : 13.5, color: on ? C.white : C.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={8}>
      <View style={{ width: 50, height: 28, borderWidth: 2, borderColor: C.ink, backgroundColor: on ? C.green : C.paper, padding: 2, alignItems: on ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 20, height: 20, backgroundColor: C.ink }} />
      </View>
    </Pressable>
  );
}

/** Bottom sheet over a dimmed screen. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {open && (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={fadeIn(160)} exiting={fadeOut(140)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.45)' }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={sheetUp} exiting={sheetDown} style={{ backgroundColor: C.bg, borderTopWidth: 2, borderColor: C.ink, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
              <Display size={22} style={{ flex: 1 }}>
                {title}
              </Display>
              <IconButton name="close" onPress={onClose} label="Close" size={34} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 18 }} bounces={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

/** A tappable row inside a sheet or settings list. */
export function Row({ icon, title, sub, right, onPress, danger = false }: { icon?: IconName; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: pressed ? C.white : C.paper }}>
      {icon && <Icon name={icon} size={20} color={danger ? C.red : C.ink} />}
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: F.bodyBold, color: danger ? C.red : C.ink }}>{title}</T>
        {sub ? <T style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
  return (
    <View style={{ borderWidth: 2, borderColor: C.ink, marginBottom: 8 }}>
      {onPress ? (
        <Pressable onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} accessibilityRole="button">
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}
