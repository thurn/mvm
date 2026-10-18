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
} as const;
