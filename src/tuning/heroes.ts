/** Hero model tunables (Appendix B §1). */
export const HERO_TUNING = {
  /** Hero level required for each PoE2 gem level 1…10 (§1.5); values interpolate between rows. */
  gemLevelRequirements: [1, 3, 6, 10, 14, 18, 22, 26, 31, 36],
  /** Attr = base + weightBonus·w + perLevel·(level − 1)·w, floored (§1.4). */
  attributeBase: 7,
  attributeWeightBonus: 8,
  attributePerLevel: 2,
  /** Life = (lifeBase + lifePerLevel·level + lifePerStrength·Str + flat) × … (§1.4, A §2.1). */
  lifeBase: 16,
  lifePerLevel: 12,
  lifePerStrength: 2,
  accuracyPerDexterity: 8,
  /** Int gives 1% increased maximum ES per this many points (MvM). */
  intelligencePerEnergyShieldPercent: 5,
  /** Every sceptre has this base Spirit (Appendix C §C.1.8). */
  sceptreBaseSpirit: 100,
  /** Card cost rounds to the nearest step, never below the minimum (§1.11). */
  costStep: 25,
  minimumCost: 25,
  /** Recharge seconds per tier (§1.11, PvZ). */
  rechargeSeconds: { fast: 7.5, slow: 30, verySlow: 50 },
  /** A missing per-level damage_multiplier means this (§1.5). */
  defaultDamageMultiplier: 100,
  /** PoE2 units per tile: 1.2 m per tile at 10 units per metre (Appendix A §1.1). */
  poeUnitsPerTile: 12,
} as const;

/** Board behavior tunables for heroes (Appendix A §3, Appendix B §2). */
export const HERO_BOARD_TUNING = {
  /** Projectiles fly about 8 tiles/s; speed is cosmetic (A §3.3). */
  projectileSpeed: 8,
  /** A lane projectile without a range crosses the whole board. */
  laneProjectileRange: 10,
  /** Chain redirects to the nearest unhit monster within this many tiles (A §3.4, adapted). */
  chainRange: 2,
  /** +3 projectiles stagger by this much (A §3.4). */
  extraProjectileStaggerSeconds: 0.1,
  /** A projectile hits a monster within this many tiles of it, in its lane. */
  projectileHitReach: 0.5,
  /** Melee strikes reach the hero's own tile plus this many tiles ahead (B §1.2). */
  meleeReach: 1,
  acolyte: {
    orbBase: 25,
    spiritDivisor: 200,
    orbSeconds: 24,
    firstOrbMinSeconds: 3,
    firstOrbMaxSeconds: 12.5,
    /** MvM custom: +2 Spirit per hero level above 1 (B H01). */
    spiritPerLevel: 2,
  },
  lightningArrow: { beamRadius: 2.67 },
  spark: { range: 6, laneReach: 1 },
  rollingSlam: { reach: 2, firstOffset: 1, secondOffset: 2 },
  fallingThunder: {
    reach: 3,
    /** Own lane from +1 tile; adjacent lanes from +2 tiles; both to +3 (B H10). */
    ownLaneFrom: 1,
    adjacentLaneFrom: 2,
    volleyEvery: 3,
  },
  iceStrike: { finalReach: 2, combo: 3 },
} as const;

/** Hero and spell generation (Appendix B §1.8–§1.10, §7; Appendix E §3.2–§3.3, §4.5). */
export const HERO_GEN_TUNING = {
  /** Base rarity weights before the source's rarity bonus; no unique heroes (B §7.3). */
  rarityWeights: { normal: 75, magic: 20, rare: 3.5 },
  /** Support counts and their odds by rarity (B §1.9). */
  supportCounts: {
    normal: [[0, 1]],
    magic: [
      [1, 0.6],
      [2, 0.4],
    ],
    rare: [
      [3, 0.65],
      [4, 0.35],
    ],
  } as Record<"normal" | "magic" | "rare", [number, number][]>,
  /** Kill-drop level offsets and their odds (B §7.2). */
  levelOffsets: [
    [-2, 0.15],
    [-1, 0.25],
    [0, 0.4],
    [1, 0.2],
  ] as [number, number][],
  maxHeroLevel: 32,
  /** Levels above the highest unlocked area level a drop may reach. */
  levelHeadroom: 2,
  /** Support tiers I, II, III need these hero levels (B §1.10). */
  tierLevel: { 1: 1, 2: 12, 3: 24 } as Record<1 | 2 | 3, number>,
  recommendedWeight: 3,
  /** Share of hero picks shaped toward the roster (E §3.3). */
  rosterShaping: 0.35,
  offerSize: 3,
  /** MvM types for custom acolytes (B §1.10 step 2). */
  acolyteTypes: ["Buff", "Persistent", "MvMAcolyte"],
} as const;
