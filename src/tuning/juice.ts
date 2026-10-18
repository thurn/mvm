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

/** What each significance band does to a hit (H §2.4, §2.6). */
export const BAND_TUNING = {
  small: {
    sound: "light",
    gainDb: -6,
    thump: false,
    hitstopMs: 0,
    knockbackPx: 1,
    numberScale: 1,
    particleScale: 0.5,
    ring: false,
  },
  medium: {
    sound: "medium",
    gainDb: 0,
    thump: false,
    hitstopMs: 30,
    knockbackPx: 2,
    numberScale: 1,
    particleScale: 1,
    ring: false,
  },
  big: {
    sound: "heavy",
    gainDb: 0,
    thump: true,
    hitstopMs: 60,
    knockbackPx: 4,
    numberScale: 1.3,
    particleScale: 2,
    ring: true,
  },
} as const;

/** Damage numbers (H §2.5). Times in ms, sizes in logical px. */
export const NUMBER_TUNING = {
  cap: 48,
  popMs: 120,
  popFrom: 0.5,
  popPeak: 1.3,
  riseMs: 600,
  risePx: 14,
  jitterPx: 4,
  fadeMs: 200,
  critScale: 1.5,
  dotScale: 0.8,
  /** FX main colours by damage type (G §1.4); words have their own. */
  colors: {
    physical: "#E8E2D0",
    fire: "#FF6A1A",
    cold: "#7FD4FF",
    lightning: "#FFE14D",
    chaos: "#B44DFF",
  },
  words: { IMMUNE: "#9A9A9A", EVADE: "#FFFFFF", BLOCK: "#B8C4D0" },
  outline: "#1B1B1B",
} as const;

/** The hit squash and the crit flash (H §2.4). */
export const HIT_TUNING = {
  squash: { x: 1.06, y: 0.94, ms: 60 },
  knockbackRecoverMs: 120,
  ringMs: 220,
  ringRadius: [4, 16] as const,
};

/** Kills, deaths and gold (H §3.4, §3.5, §5.2, §7.2). Times in ms. */
export const KILL_TUNING = {
  /** The soul puff rises on the fall's last frame (6 hurt frames × 100 ms). */
  soulDelayMs: 600,
  heroTileFlashMs: 300,
  heroTileFlashAlpha: 0.45,
  killLadderWindowMs: 500,
  killLadderMaxSteps: 5,
  coins: {
    min: 3,
    max: 8,
    /** Gold per coin before clamping to min–max. */
    goldPerCoin: 3,
    rareShower: 15,
    sprayGravity: 300,
    spraySpeed: [40, 90] as const,
    magnetiseAfterMs: 600,
    flightMs: 350,
    staggerMs: 30,
    ladderWindowMs: 400,
    ladderMaxSemitones: 12,
    size: 3,
    color: "#F2C14E",
    shade: "#A87A1E",
  },
};

/** One loot class's presentation (H §3.2; beam and label colours from G §1.4). */
export interface LootClassSpec {
  arcPx: number;
  holdMs: number;
  motes: { count: number; color: string; rising: boolean };
  beam: { color: string; heightPx: number; whiteCore: boolean } | null;
  label: string;
  tier: Tier;
  stinger: string;
  /** Rank for the stagger: higher lands later (the best drop last). */
  rank: number;
}

/** The drop timeline and per-class table (H §3.1–§3.4). Times in ms. */
export const LOOT_JUICE = {
  arcMs: 350,
  bounces: [
    [6, 80],
    [2, 80],
  ] as [number, number][],
  beamRiseMs: 150,
  collectMs: 400,
  beamCollapseMs: 120,
  staggerMs: 70,
  /** The landing spot is within this many tiles of the corpse, in its lane band. */
  scatterTiles: 0.5,
  laneBandPx: 20,
  ladderWindowMs: 1500,
  ladderMaxSteps: 5,
  uniqueDim: 0.15,
  uniquePulseMs: 1200,
  tickerLines: 4,
  tickerShimmerMs: 8000,
  classes: {
    normal: {
      arcPx: 10,
      holdMs: 1200,
      motes: { count: 0, color: "#C8C8C8", rising: false },
      beam: { color: "rgba(200, 200, 200, 0.3)", heightPx: 32, whiteCore: false },
      label: "#C8C8C8",
      tier: 1,
      stinger: "drop_normal",
      rank: 0,
    },
    magic: {
      arcPx: 14,
      holdMs: 1600,
      motes: { count: 4, color: "#8888FF", rising: false },
      beam: { color: "#8888FF", heightPx: 48, whiteCore: false },
      label: "#8888FF",
      tier: 2,
      stinger: "drop_magic",
      rank: 2,
    },
    rare: {
      arcPx: 22,
      holdMs: 2500,
      motes: { count: 10, color: "#FFFF77", rising: true },
      beam: { color: "#FFFF77", heightPx: 96, whiteCore: true },
      label: "#FFFF77",
      tier: 3,
      stinger: "drop_rare",
      rank: 4,
    },
    unique: {
      arcPx: 36,
      holdMs: 4000,
      motes: { count: 24, color: "#E0782F", rising: true },
      beam: { color: "#E0782F", heightPx: 160, whiteCore: true },
      label: "#AF6025",
      tier: 5,
      stinger: "drop_unique",
      rank: 8,
    },
    currencyLow: {
      arcPx: 12,
      holdMs: 1400,
      motes: { count: 4, color: "#D9B95B", rising: false },
      beam: { color: "#D9B95B", heightPx: 64, whiteCore: false },
      label: "#AA9E82",
      tier: 2,
      stinger: "drop_currency",
      rank: 1,
    },
    currencyMid: {
      arcPx: 18,
      holdMs: 2000,
      motes: { count: 8, color: "#D9B95B", rising: false },
      beam: { color: "#D9B95B", heightPx: 64, whiteCore: false },
      label: "#AA9E82",
      tier: 3,
      stinger: "drop_currency",
      rank: 3,
    },
    currencyTop: {
      arcPx: 28,
      holdMs: 3000,
      motes: { count: 16, color: "#D9B95B", rising: false },
      beam: { color: "#D9B95B", heightPx: 160, whiteCore: true },
      label: "#AA9E82",
      tier: 4,
      stinger: "drop_currency",
      rank: 6,
    },
    hero: {
      arcPx: 24,
      holdMs: 3000,
      motes: { count: 12, color: "#1BA29B", rising: false },
      beam: { color: "#1BA29B", heightPx: 96, whiteCore: false },
      label: "#1BA29B",
      tier: 4,
      stinger: "drop_hero",
      rank: 5,
    },
    spell: {
      arcPx: 24,
      holdMs: 3000,
      motes: { count: 12, color: "#5FD3C8", rising: false },
      beam: { color: "#5FD3C8", heightPx: 96, whiteCore: false },
      label: "#1BA29B",
      tier: 4,
      stinger: "drop_spell",
      rank: 5,
    },
  } satisfies Record<string, LootClassSpec>,
  /** Currency tiers by PoE2 id suffix (H §3.2). */
  currencyTier: {
    CurrencyUpgradeToMagic: "currencyLow",
    CurrencyAddModToMagic: "currencyLow",
    CurrencyUpgradeToMagicShard: "currencyLow",
    CurrencyUpgradeMagicToRareShard: "currencyLow",
    CurrencyUpgradeMagicToRare: "currencyMid",
    CurrencyAddModToRare: "currencyMid",
    CurrencyRerollRare: "currencyMid",
    CurrencyUpgradeToRare: "currencyMid",
    CurrencyAddSkillGemSocket3: "currencyMid",
    CurrencyAddSkillGemSocket4: "currencyMid",
    CurrencyAddSkillGemSocket5: "currencyMid",
    CurrencyGemQuality: "currencyMid",
    CurrencyRemoveMod: "currencyTop",
    CurrencyModValues: "currencyTop",
    CurrencyCorrupt: "currencyTop",
  } as Record<string, "currencyLow" | "currencyMid" | "currencyTop">,
};
export type LootClass = keyof typeof LOOT_JUICE.classes;
