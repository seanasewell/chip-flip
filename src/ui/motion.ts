// Motion, matched to the web prototype's keyframes: quick and light, with at
// most one small overshoot. No springs, so nothing wobbles.
import { Easing, Keyframe } from 'react-native-reanimated';

const out = Easing.out(Easing.cubic);
const snap = Easing.bezier(0.2, 0.9, 0.3, 1);

/** Pop in: 0.4 → 1.15 → 1 over 450 ms (dialogs, toasts, the winner). */
export const pop = (delay = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.4 }] },
    60: { opacity: 1, transform: [{ scale: 1.15 }], easing: out },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.inOut(Easing.quad) },
  })
    .duration(450)
    .delay(delay);

/** Fade up 12 px over 450 ms (rows and cards appearing). */
export const fadeUp = (delay = 0, duration = 450) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 12 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: out },
  })
    .duration(duration)
    .delay(delay);

/** Plain fade, 200 ms. */
export const fadeIn = (duration = 200, delay = 0) =>
  new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1, easing: out } }).duration(duration).delay(delay);

export const fadeOut = (duration = 180) => new Keyframe({ 0: { opacity: 1 }, 100: { opacity: 0 } }).duration(duration);

/** A chip landing on the board: drops in, settles once (380 ms). */
export const chipDrop = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -10 }, { scale: 1.35 }] },
  55: { opacity: 1, transform: [{ translateY: 1 }, { scale: 0.94 }], easing: out },
  78: { opacity: 1, transform: [{ translateY: -0.5 }, { scale: 1.03 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(380);

/** The card you just drew deals in (850 ms, after 250 ms). */
export const dealIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 80 }, { rotate: '-12deg' }, { scale: 0.8 }] },
  55: { opacity: 1, transform: [{ translateY: -20 }, { rotate: '3deg' }, { scale: 1.06 }], easing: snap },
  78: { opacity: 1, transform: [{ translateY: 4 }, { rotate: '-1deg' }, { scale: 1 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] },
})
  .duration(850)
  .delay(250);

/** The "New" tag pops on after the card lands. */
export const tagPop = new Keyframe({
  0: { transform: [{ scale: 0 }] },
  70: { transform: [{ scale: 1.2 }], easing: out },
  100: { transform: [{ scale: 1 }] },
})
  .duration(380)
  .delay(950);

/** Bottom sheets slide up in 280 ms. */
export const sheetUp = new Keyframe({
  0: { transform: [{ translateY: 600 }] },
  100: { transform: [{ translateY: 0 }], easing: snap },
}).duration(280);
export const sheetDown = new Keyframe({
  0: { transform: [{ translateY: 0 }] },
  100: { transform: [{ translateY: 600 }], easing: Easing.in(Easing.cubic) },
}).duration(200);

/** Selected card lift: 140 ms with a hint of overshoot. */
export const LIFT_MS = 140;
export const liftEasing = Easing.bezier(0.2, 0.9, 0.3, 1.2);
