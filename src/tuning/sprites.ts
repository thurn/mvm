/** Sprite animation timings and actor effects (Appendix G §1.3, H §5.2). Times in ms unless named. */
export const SPRITE_TUNING = {
  /** An attack row plays in at most this long (G §1.3). */
  attackMaxSeconds: 0.6,
  /** Extra frame slots held on the frame before release: the wind-up (H §5.2). */
  windupHoldSlots: 1,
  /** Walk frame time = walkFrameScale / speed in px/s, clamped (G §1.3). */
  walkFrameScale: 3000,
  walkFrameMs: [80, 250],
  deathFrameMs: 100,
  deathFadeMs: 400,
  bobPeriodMs: 600,
  flashMs: 80,
  jitterMs: 100,
  healthBarMs: 2000,
  lowLifeFraction: 0.3,
  /** G §1.1: a 64 px frame's top-left sits 6 px above its cell. */
  anchorLiftPx: 6,
  rareScale: 1.1,
  /** The Goblin Leaper's jump: the sim moves it at once; the sprite arcs there over this long (G §4.1). */
  leapMs: 450,
  leapArcPx: 26,
  /** The Helmed Skeleton's helm flies off at Fully Broken (H §7.1): up and back, under gravity. */
  helmDebris: { ms: 700, vx: 60, vy: -110, gravity: 380, spin: 9 },
  /** Rats in a swarm stand ±this many px off the lane line (G §4.1). */
  swarmJitterPx: 3,
  outline: { magic: "#8888FF", rare: "#FFFF77" },
} as const;
