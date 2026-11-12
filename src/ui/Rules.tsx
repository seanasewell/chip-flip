import { View } from 'react-native';

import { T } from './kit';
import { C, F } from './theme';

const RULES: [string, string][] = [
  ['Play a card', 'Every card appears twice on the board. Play one from your hand to put a chip on either of its spaces.'],
  ['Five in a row', 'Five of your chips in a straight line, across, down or diagonal, make a chip flip. Its chips flip over to crowns and can no longer be removed.'],
  ['Corners are free', 'The four corner spaces count for everyone.'],
  ['Two-eyed jacks are wild', 'Put a chip on any open space.'],
  ['One-eyed jacks remove', "Take an opponent's chip off the board, as long as it isn't in a chip flip."],
  ['Dead cards', 'When both of a card’s spaces are taken, swap it for a new card. Once per turn.'],
  ['Win', 'Two chip flips win head to head and team games of two sides. With three players or three teams, one chip flip wins.'],
];

export function RulesList() {
  return (
    <View style={{ gap: 12 }}>
      {RULES.map(([h, b]) => (
        <View key={h} style={{ borderLeftWidth: 4, borderColor: C.blue, paddingLeft: 10 }}>
          <T style={{ fontFamily: F.bodyBold }}>{h}</T>
          <T style={{ fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 2 }}>{b}</T>
        </View>
      ))}
    </View>
  );
}
