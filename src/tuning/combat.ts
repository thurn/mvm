/**
 * Combat tunables (Appendix A). The four global knobs (§1.3) are the only
 * place to fix global tempo; everything else stays PoE2-relative.
 */
export const COMBAT_KNOBS = {
  /** Multiplies all monster maximum life. */
  K_monsterLife: 4.5,
  /** Multiplies all monster hit damage. */
  K_monsterDamage: 1.25,
  /** Multiplies hero attack and cast speed, after all modifiers. */
  K_heroActionRate: 0.5,
  /** Seconds a base-speed Shambler takes to walk one tile. */
  walkSecondsPerTile: 4.7,
} as const;

/** PoE2 caps and constants used by the hit pipeline (§4–§5). */
export const COMBAT_RULES = {
  /** Chance to hit is clamped to [minChanceToHit, 1] (§4.4). */
  minChanceToHit: 0.05,
  /** chanceToHit = accuracy × accuracyFactor / (accuracy + evasion × evasionFactor). (verify) */
  accuracyFactor: 1.25,
  evasionFactor: 0.3,
  /** A crit deals 100% more by default (§4.5). */
  baseCritBonusPercent: 100,
  /** physDR = armour / (armour + armourHitFactor × hit), capped (§5.2). */
  armourHitFactor: 10,
  armourReductionCap: 0.9,
  defaultMaxResistPercent: 75,
  hardMaxResistPercent: 90,
  blockCapPercent: 50,
  /** Chaos damage removes this much more energy shield (§5.4). */
  chaosEsMultiplier: 2,
} as const;
