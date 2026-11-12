// Bold line icons on a 24px grid, drawn in one color.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { C } from './theme';

export type IconName = 'menu' | 'sound' | 'mute' | 'arrow' | 'back' | 'eye' | 'floppy' | 'hourglass' | 'smiley' | 'settings' | 'close' | 'book' | 'door' | 'flag' | 'music' | 'check' | 'trophy' | 'wrench';

export function Icon({ name, size = 22, color = C.ink, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const };
  let body: React.ReactNode;
  switch (name) {
    case 'menu': body = <Path d="M3 6.5h18M3 12h18M3 17.5h18" {...p} />; break;
    case 'sound': body = <Path d="M4 9h4l5-4v14l-5-4H4ZM16.5 9q2 3 0 6M19 6.5q4 5.5 0 11" {...p} />; break;
    case 'mute': body = <Path d="M4 9h4l5-4v14l-5-4H4ZM16 9.5l5 5M21 9.5l-5 5" {...p} />; break;
    case 'arrow': body = <Path d="M7 17 17 7M8.5 7H17v8.5" {...p} />; break;
    case 'back': body = <Path d="M20 12H5M11 5.5 4.5 12l6.5 6.5" {...p} />; break;
    case 'close': body = <Path d="M5 5l14 14M19 5 5 19" {...p} />; break;
    case 'check': body = <Path d="M4 12.5 9.5 18 20 6.5" {...p} />; break;
    case 'eye':
      body = (
        <>
          <Path d="M1.5 12C5 6 8.5 4.5 12 4.5S19 6 22.5 12C19 18 15.5 19.5 12 19.5S5 18 1.5 12Z" {...p} />
          <Circle cx={12} cy={12} r={3.2} fill={color} />
        </>
      );
      break;
    case 'floppy':
      body = (
        <>
          <Path d="M4 3h13l3 3v15H4Z" {...p} />
          <Path d="M8 3v5h7V3M7 21v-7h10v7" {...p} />
        </>
      );
      break;
    case 'hourglass': body = <Path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" {...p} />; break;
    case 'smiley':
      body = (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M8 10.2q1-1.2 2 0M14 10.2q1-1.2 2 0M7.8 14q4.2 4 8.4 0" {...p} />
        </>
      );
      break;
    case 'settings':
      // Gear (Feather icon set, MIT).
      body = (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path
            {...p}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </>
      );
      break;
    case 'book': body = <Path d="M3 5h7q2 0 2 2v13q0-2-2-2H3ZM21 5h-7q-2 0-2 2v13q0-2 2-2h7Z" {...p} />; break;
    case 'door':
      body = (
        <>
          <Path d="M5 21V3h11v18M3 21h18" {...p} />
          <Rect x={12} y={11} width={1.6} height={1.6} fill={color} />
        </>
      );
      break;
    case 'flag': body = <Path d="M5 21V3M5 4h12l-2.5 4L17 12H5" {...p} />; break;
    case 'trophy': body = <Path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6" {...p} />; break;
    case 'wrench': body = <Path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 2l1.7 1.7-2 2 2 2 2-2Z M3 21l6-6" {...p} strokeLinejoin="round" />; break;
    case 'music': body = <Path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" {...p} />; break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
