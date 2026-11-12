// The 10×10 board. Each space is memoized, so a move only redraws the
// spaces it changes.
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { cellLabel, isCorner } from '@/core/board';
import { BOARD_SIZE, type CellOwner, type Move, type Sequence } from '@/core/types';
import { FLIP_STAGGER, FLIP_START } from '@/lib/game';
import { Chip } from './Chip';
import { TileFace } from './Cards';
import { Icon } from './icons';
import { chipDrop, fadeIn } from './motion';
import { C, sideColor, tint } from './theme';

export interface BoardProps {
  board: CellOwner[];
  size: number;
  sequences: Sequence[];
  /** Sequences completed on the last move (they flip chip by chip). */
  fresh?: Sequence[];
  lastMove?: Move | null;
  targets: number[];
  targetKind: 'place' | 'remove';
  activeSide: number;
  onTap?: (cell: number) => void;
  sideNames?: string[];
  /** "View board": chips hidden, taken spaces outlined in their color. */
  reveal?: boolean;
}

interface CellProps {
  i: number;
  cell: number;
  owner: CellOwner;
  locked: boolean;
  flipDelay: number;
  target: 'place' | 'remove' | null;
  dim: boolean;
  isNew: boolean;
  removed: boolean;
  reveal: boolean;
  activeLight: string;
  label: string;
  onTap?: (cell: number) => void;
  /** Bumps when side colors change, so memoized cells repaint. */
  colorKey: string;
}

const Cell = memo(function Cell({ i, cell, owner, locked, flipDelay, target, dim, isNew, removed, reveal, activeLight, label, onTap }: CellProps) {
  const corner = isCorner(i);
  const ring = Math.max(2.5, Math.round(cell * 0.1));
  const bg = corner ? C.green : owner !== null ? (locked ? tint(sideColor(owner).base, 0.3) : C.paper) : target === 'place' ? activeLight : C.paper;
  return (
    <Pressable onPress={onTap ? () => onTap(i) : undefined} disabled={!onTap} accessibilityLabel={label} style={{ width: cell, height: cell }}>
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: target === 'place' ? 1.5 : 0,
          borderStyle: 'dashed',
          borderColor: C.ink,
        }}
      >
        {corner ? (
          <Icon name="smiley" size={cell * 0.68} stroke={2.4} />
        ) : owner === null || reveal ? (
          removed ? (
            <Animated.View entering={fadeIn(400)}>
              <TileFace cell={i} size={cell} dim={dim} />
            </Animated.View>
          ) : (
            <TileFace cell={i} size={cell} dim={dim} />
          )
        ) : (
          <Animated.View key={`${i}-${owner}`} entering={isNew ? chipDrop : undefined}>
            <Chip side={owner} size={cell * 0.84} locked={locked} flipDelay={flipDelay} />
          </Animated.View>
        )}
        {reveal && owner !== null && !corner && <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: ring, borderColor: sideColor(owner).base }} />}
        {target === 'remove' && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: C.pink, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={cell * 0.5} height={cell * 0.5} viewBox="0 0 20 20">
              {/* White X over the chip; ink when "View board" hides the chips. */}
              <Path d="M4 4l12 12M16 4L4 16" stroke={reveal ? C.ink : C.white} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </View>
        )}
      </View>
    </Pressable>
  );
});

export function Board({ board, size, sequences, fresh = [], lastMove = null, targets, targetKind, activeSide, onTap, sideNames = [], reveal = false }: BoardProps) {
  if (!size) return null;
  const pad = Math.max(4, Math.round(size * 0.016));
  const gap = Math.max(2, Math.round(size * 0.008));
  const cell = (size - pad * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const locked = new Set(sequences.flatMap((q) => q.cells));
  const lastCell = lastMove && lastMove.action.kind !== 'swap' ? lastMove.action.cell : -1;
  const lastKind = lastMove?.action.kind;
  const targetSet = new Set(targets);
  const flipDelay = new Map<number, number>();
  fresh.forEach((q) => q.cells.forEach((c, k) => flipDelay.set(c, FLIP_START + k * FLIP_STAGGER)));
  const activeLight = sideColor(activeSide).light;
  const colorKey = [0, 1, 2].map((s) => sideColor(s).name).join();

  const rows = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const cells = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const i = r * BOARD_SIZE + c;
      const owner = board[i];
      const isTarget = targetSet.has(i);
      const label = isCorner(i)
        ? 'Free corner'
        : owner === null
          ? `${cellLabel(i)}${isTarget ? ', available' : ''}`
          : `${cellLabel(i)}, ${sideNames[owner] ?? sideColor(owner).name}${locked.has(i) ? ', in a sequence' : ''}${isTarget ? ', tap to remove' : ''}`;
      cells.push(
        <Cell
          key={i}
          i={i}
          cell={cell}
          owner={owner}
          locked={locked.has(i)}
          flipDelay={flipDelay.get(i) ?? 0}
          target={isTarget ? targetKind : null}
          dim={targets.length > 0 && !isTarget}
          isNew={i === lastCell && lastKind === 'place'}
          removed={i === lastCell && lastKind === 'remove'}
          reveal={reveal}
          activeLight={activeLight}
          label={label}
          onTap={onTap}
          colorKey={colorKey}
        />,
      );
    }
    rows.push(
      <View key={r} style={{ flexDirection: 'row', gap }}>
        {cells}
      </View>,
    );
  }
  return (
    <View style={{ width: size + 5, height: size + 5 }} accessibilityLabel="Board">
      <View style={{ position: 'absolute', left: 5, top: 5, width: size, height: size, backgroundColor: C.blue }} />
      <View style={{ width: size, height: size, padding: pad, backgroundColor: C.ink, gap }}>{rows}</View>
    </View>
  );
}
