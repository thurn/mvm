/** Wave, rarity and spawn tunables (Appendix D §3 and §5). */
export const WAVE_TUNING = {
  firstWaveSeconds: 18,
  gapMinSeconds: 25,
  gapMaxSeconds: 31,
  /** The next wave comes early once the current one falls to this share of its spawned life. */
  earlyTriggerMin: 0.5,
  earlyTriggerMax: 0.65,
  earlyTriggerDelaySeconds: 2,
  earlyTriggerMinSecondsAfterStart: 4,
  flagEvery: 10,
  flagWarningSeconds: 7.5,
  /** waveBudget = (floor(w / 3) + 1) × B × (flag ? flagBudgetMultiplier : 1); B = budgetBase + (level − 1) × budgetPerLevel. */
  budgetBase: 2,
  budgetPerLevel: 1 / 19,
  flagBudgetMultiplier: 2.5,
  /** Flag waves first spend min(budget × share, cap) points on Shamblers. */
  flagShamblerShare: 0.4,
  flagShamblerCap: 8,
  /** No lane takes more than this share of a wave's points, unless an even split needs more. */
  laneShareCap: 0.4,
  staggerMaxSeconds: 4,
  /** Spawn x = spawnX + rand(0, spawnJitter) (Appendix A §1.1). */
  spawnX: 9.75,
  spawnJitter: 0.5,
  /** Magic and rare chance per spawn, by level (§3). */
  rarityByLevel: [
    { maxLevel: 3, magic: 0.12, rare: 0.02 },
    { maxLevel: 9, magic: 0.14, rare: 0.025 },
    { maxLevel: 15, magic: 0.16, rare: 0.03 },
    { maxLevel: 20, magic: 0.18, rare: 0.04 },
  ],
  rareAffixesMin: 2,
  rareAffixesMax: 4,
  /** MvM custom rarity multipliers (§3). */
  rarityMultipliers: {
    normal: { life: 1, damage: 1 },
    magic: { life: 2, damage: 1.15 },
    rare: { life: 4.5, damage: 1.35 },
  },
  /** Monster hits' base crit chance in percent (§4.2: "base 5%"). */
  monsterBaseCrit: 5,
} as const;

/**
 * Monster hit elements (Appendix D §2.3). Each biome converts this share of
 * an archetype's physical hit to its element; native elements convert all of
 * it and replace the biome's. Archetype ids not yet in the game take effect
 * when they land (Rot Slime is "Splitter", its children included; Orc Shaman
 * is "Shaman"). Bosses use their own spec.
 */
export const MONSTER_ELEMENT_TUNING = {
  biomeSharePercent: 50,
  /** The biome element from each campaign level on; null is all physical. */
  biomes: [
    { fromLevel: 1, element: null },
    { fromLevel: 6, element: "lightning" },
    { fromLevel: 11, element: "fire" },
    { fromLevel: 16, element: "cold" },
  ],
  native: { Splitter: "chaos", Shaman: "fire" },
} as const satisfies {
  biomeSharePercent: number;
  biomes: readonly { fromLevel: number; element: "fire" | "cold" | "lightning" | null }[];
  native: Readonly<Record<string, "fire" | "cold" | "lightning" | "chaos">>;
};
