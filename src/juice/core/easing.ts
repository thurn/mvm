/** Appendix H §2.1's named easings, and nothing else, so motion feels consistent. */
const OVERSHOOT = 1.70158;

export const EASINGS = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  outBack: (t: number) => 1 + (OVERSHOOT + 1) * (t - 1) ** 3 + OVERSHOOT * (t - 1) ** 2,
  inBack: (t: number) => (OVERSHOOT + 1) * t ** 3 - OVERSHOOT * t ** 2,
  /** A light elastic, for the counter bump only. */
  outElastic: (t: number) =>
    t === 0 || t === 1
      ? t
      : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) * 0.5 + 1,
} as const;
