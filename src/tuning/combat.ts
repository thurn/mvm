/**
 * Combat tunables (Appendix A). The four global knobs (§1.3) are the only
 * place to fix global tempo; everything else stays PoE2-relative.
 */
export const COMBAT_KNOBS = {
  /** Multiplies all monster maximum life. */
  K_monsterLife: 4.5,
  /** Multiplies all monster hit damage. */
  K_monsterDamage: 1.25,
  /** Multiplies hero attack and cast speed, after all modifiers; 0.55 lets every focus clear Levels 4–5 (plan 2.26). */
  K_heroActionRate: 0.55,
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

/** Ailment, stun and debuff tunables (Appendix A §6). */
export const AILMENT_TUNING = {
  /** Shock: 1% chance per 4% of the ailment threshold dealt as lightning; 20% increased damage taken. */
  shockChancePerThreshold: 0.25,
  shockMagnitude: 20,
  shockSeconds: { monster: 8, hero: 4 },
  /** Chill: magnitude = this × (cold dealt / threshold, in %), ignored under the minimum, capped (MvM reading of §6.2). */
  chillMagnitudePerThresholdPercent: 5,
  chillMinimum: 30,
  chillMaximum: 50,
  chillSeconds: { monster: 8, hero: 2 },
  /** Slows have less effect on tougher monsters, and never go below a floor (A §3.2). */
  slowReductionByRarity: { normal: 0, magic: 0.15, rare: 0.3, unique: 0.5, boss: 0.5 },
  slowFloor: 0.25,
  /** Freeze: a 0→1 meter of cold dealt / threshold; freezes at 1 for 4 s; decays after 2 s idle. */
  freezeSeconds: 4,
  freezeDecayDelaySeconds: 2,
  freezeDecayPerSecond: 0.5,
  uniqueFreezeBuildupMultiplier: 0.5,
  /** Ignite: 1% chance per 5% of threshold dealt as fire (Flammability); 20% of the hit's fire per second for 4 s. */
  flammabilityPerThreshold: 0.2,
  igniteDpsFraction: 0.2,
  igniteSeconds: 4,
  /** Light stun: damage / max life, physical 1.5×, hero melee 1.5× again; chances under 15% are 0. */
  stunPhysicalMultiplier: 1.5,
  stunHeroMeleeMultiplier: 1.5,
  lightStunMinimum: 0.15,
  /** A light-stunned monster's next attack waits this much longer. */
  lightStunAttackDelaySeconds: 0.3,
  heavyStunSeconds: 3,
  heavyStunRecoverySeconds: 4,
  heavyStunRecoveryBuildupMultiplier: 0.5,
  primedThreshold: { normal: 0.4, magic: 0.5, rare: 0.6, unique: 0.7, boss: 0.7 },
  /** Armour Break: heroes break 3× against normal and 2× against magic monsters; Fully Broken lasts 12 s. */
  heroArmourBreakVsNormal: 3,
  heroArmourBreakVsMagic: 2,
  fullyBrokenSeconds: 12,
  fullyBrokenPhysicalTaken: 20,
} as const;
