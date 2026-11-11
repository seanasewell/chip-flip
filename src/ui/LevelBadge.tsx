import { Text, View } from 'react-native';

import { C, F } from './theme';

export function LevelBadge({ level, size = 36 }: { level: number; size?: number }) {
  return (
    <View accessibilityLabel={`Level ${level}`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.blue, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ fontFamily: F.display, fontSize: size * 0.44, lineHeight: size * 0.56, color: C.white }}>
        {level}
      </Text>
    </View>
  );
}
