/** Appendix H's juice tables (§1.3, §2.2–§2.7), read by src/juice/. */

export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

export interface ParticlePreset {
  count: number;
  speed: [number, number];
  angle: [number, number];
  life: [number, number];
  size: [number, number];
  color: string | readonly string[];
  gravity?: number;
  drag?: number;
  blend?: "lighter";
}

export const JUICE_TUNING = {
  /** Per tier: trauma added, global hitstop ms, slow-mo, music duck, particle burst range (H §1.3). */
  tiers: {
    0: { trauma: 0, globalHitstopMs: 0, slowmo: null, duckDb: 0, particles: [0, 3] },
    1: { trauma: 0, globalHitstopMs: 0, slowmo: null, duckDb: 0, particles: [3, 6] },
    2: { trauma: 0, globalHitstopMs: 0, slowmo: null, duckDb: 0, particles: [6, 12] },
    3: { trauma: 0.2, globalHitstopMs: 0, slowmo: null, duckDb: 0, particles: [12, 24] },
    4: { trauma: 0.4, globalHitstopMs: 60, slowmo: null, duckDb: -4, particles: [24, 48] },
    5: {
      trauma: 0.6,
      globalHitstopMs: 120,
      slowmo: { scale: 0.35, ms: 600 },
      duckDb: -8,
      particles: [48, 96],
    },
  },
  /** Actor hitstop by tier, plus a bonus for big-significance hits (H §2.3). */
  actorHitstopMs: { 0: 0, 1: 0, 2: 30, 3: 50, 4: 50, 5: 50 } as Record<Tier, number>,
  bigHitstopBonusMs: 30,
  globalHitstopCooldownMs: 1000,
  slowmoCooldownMs: 4000,
  /** Full-screen effects by tier (H §1.3, §1.4 layer 11); alphas before "reduce flashing". */
  screen: {
    4: { vignette: { alpha: 0.35, ms: 300 } },
    5: { flash: { alpha: 0.6, ms: 150 }, vignette: { alpha: 0.5, ms: 600 } },
  } as Partial<
    Record<
      Tier,
      { flash?: { alpha: number; ms: number }; vignette?: { alpha: number; ms: number } }
    >
  >,
  /** "Reduce flashing" caps white flashes at this alpha (H §13 accessibility). */
  reduceFlashingMaxAlpha: 0.4,
  /** The sfx bus also ducks at T5 (H §10.2). */
  sfxDuckT5: { db: -6, seconds: 1 },
  traumaDecayPerSecond: 1.6,
  /** Shake noise frequency: two out-of-phase sines sampled at t × 30 (H §2.2). */
  shakeFrequency: 30,
  shakeLowScale: 0.5,
  particleCapacity: 2000,
  /** Over this share of the pool, presets emit half their count; loot is exempt (H §2.7). */
  particleBudget: 0.8,
  bossSignificanceMultiplier: 10,
  presets: {
    dust: {
      count: 6,
      speed: [20, 50],
      angle: [150, 390],
      life: [250, 450],
      size: [1, 2],
      color: "#C8B89A",
      gravity: 60,
      drag: 3,
    },
    embers: {
      count: 8,
      speed: [10, 40],
      angle: [240, 300],
      life: [400, 800],
      size: [1, 1],
      color: ["#FF6A1A", "#FFD27A"],
      gravity: -30,
      blend: "lighter",
    },
    frost: {
      count: 8,
      speed: [30, 70],
      angle: [0, 360],
      life: [200, 400],
      size: [1, 2],
      color: ["#7FD4FF", "#E6FAFF"],
      drag: 4,
      blend: "lighter",
    },
    sparks: {
      count: 6,
      speed: [60, 120],
      angle: [0, 360],
      life: [80, 180],
      size: [1, 1],
      color: ["#FFE14D", "#FFFFFF"],
      drag: 6,
      blend: "lighter",
    },
    bubbles: {
      count: 4,
      speed: [5, 15],
      angle: [250, 290],
      life: [500, 900],
      size: [1, 2],
      color: "#7CFF4D",
      gravity: -10,
    },
    blood: {
      count: 5,
      speed: [30, 60],
      angle: [200, 340],
      life: [300, 500],
      size: [1, 2],
      color: "#9A1B1B",
      gravity: 200,
    },
    soul: {
      count: 6,
      speed: [8, 20],
      angle: [250, 290],
      life: [500, 900],
      size: [1, 2],
      color: "#3A3550",
      gravity: -20,
    },
  } satisfies Record<string, ParticlePreset>,
} as const;

export type PresetName = keyof typeof JUICE_TUNING.presets;
