/**
 * Loot tunables (Appendix C §C.3.6 and §C.6, Appendix E §3–§5).
 */

/** Item slots of the spawn-weight matrix (C.3.6). */
export type MatrixSlot =
  | "Bow"
  | "Xbw"
  | "Spr"
  | "1HM"
  | "2HM"
  | "QS"
  | "Wnd"
  | "Stf"
  | "Scp"
  | "Body"
  | "Shld"
  | "Amu"
  | "Rng"
  | "Blt";

type SlotWeights = Partial<Record<MatrixSlot, number>>;

/** MvM spawn weight per tier, by PoE2 mod type (C.3.6). Missing slots are not allowed. */
export const MOD_WEIGHTS_BY_TYPE: Readonly<Record<string, SlotWeights>> = {
  LocalPhysicalDamagePercent: {
    Bow: 1000,
    Xbw: 1000,
    Spr: 1000,
    "1HM": 1000,
    "2HM": 1000,
    QS: 1000,
  },
  LocalIncreasedPhysicalDamagePercentAndAccuracyRating: {
    Bow: 500,
    Xbw: 500,
    Spr: 500,
    "1HM": 500,
    "2HM": 500,
    QS: 500,
  },
  LocalPhysicalDamage: { Bow: 1000, Xbw: 1000, Spr: 1000, "1HM": 1000, "2HM": 1000, QS: 1000 },
  LocalFireDamage: { Bow: 1000, Xbw: 1000, Spr: 1000, "1HM": 1000, "2HM": 1000, QS: 1000 },
  LocalColdDamage: { Bow: 1000, Xbw: 1000, Spr: 1000, "1HM": 1000, "2HM": 1000, QS: 1000 },
  LocalLightningDamage: { Bow: 1000, Xbw: 1000, Spr: 1000, "1HM": 1000, "2HM": 1000, QS: 1000 },
  IncreasedWeaponElementalDamagePercent: {
    Bow: 500,
    Xbw: 500,
    Spr: 500,
    "1HM": 500,
    "2HM": 500,
    QS: 500,
  },
  LocalAccuracyRating: { Bow: 500, Xbw: 500, Spr: 500, "1HM": 500, "2HM": 500, QS: 500 },
  LocalIncreasedAttackSpeed: {
    Bow: 1000,
    Xbw: 1000,
    Spr: 1000,
    "1HM": 1000,
    "2HM": 1000,
    QS: 1000,
  },
  LocalBaseCriticalStrikeChance: { Bow: 500, Xbw: 500, Spr: 500, "1HM": 500, "2HM": 500, QS: 500 },
  LocalCriticalStrikeMultiplier: { Bow: 500, Xbw: 500, Spr: 500, "1HM": 500, "2HM": 500, QS: 500 },
  LifeLeechLocalPermyriad: { Bow: 250, Xbw: 250, Spr: 250, "1HM": 250, "2HM": 250, QS: 250 },
  LifeGainedFromEnemyDeath: {
    Bow: 500,
    Xbw: 500,
    Spr: 500,
    "1HM": 500,
    "2HM": 500,
    QS: 500,
    Wnd: 500,
    Stf: 500,
    Rng: 500,
  },
  LocalStunDamageIncrease: { Spr: 500, "1HM": 500, "2HM": 500, QS: 500 },
  LocalLightRadiusAndAccuracy: { Bow: 250, Xbw: 250, Spr: 250, "1HM": 250, "2HM": 250, QS: 250 },
  WeaponSpellDamage: { Wnd: 1000, Stf: 1000 },
  WeaponSpellDamageAndMana: { Wnd: 500, Stf: 500 },
  FireDamageWeaponPrefix: { Wnd: 1000, Stf: 1000 },
  ColdDamageWeaponPrefix: { Wnd: 1000, Stf: 1000 },
  LightningDamageWeaponPrefix: { Wnd: 1000, Stf: 1000 },
  ChaosDamageWeaponPrefix: { Wnd: 1000, Stf: 1000 },
  PhysicalSpellDamageWeaponPrefix: { Wnd: 500, Stf: 500 },
  DamageGainedAsFire: { Wnd: 250, Stf: 250 },
  DamageGainedAsCold: { Wnd: 250, Stf: 250 },
  DamageGainedAsLightning: { Wnd: 250, Stf: 250 },
  IncreasedCastSpeed: { Wnd: 1000, Stf: 1000, Amu: 1000, Rng: 1000 },
  SpellCriticalStrikeChance: { Wnd: 500, Stf: 500 },
  SpellCriticalStrikeMultiplier: { Wnd: 500, Stf: 500 },
  IgniteChanceIncrease: { Wnd: 500, Stf: 500 },
  FreezeDamageIncrease: { Wnd: 500, Stf: 500 },
  ShockChanceIncrease: { Wnd: 500, Stf: 500 },
  LocalIncreasedSpiritPercent: { Scp: 1000 },
  LocalIncreasedSpiritAndMana: { Scp: 500 },
  AlliesInPresenceAllDamage: { Scp: 500 },
  AlliesInPresenceAddedPhysicalDamage: { Scp: 500 },
  AlliesInPresenceAddedFireDamage: { Scp: 500 },
  AlliesInPresenceAddedColdDamage: { Scp: 500 },
  AlliesInPresenceAddedLightningDamage: { Scp: 500 },
  AlliesInPresenceIncreasedAttackSpeed: { Scp: 500 },
  AlliesInPresenceIncreasedCastSpeed: { Scp: 500 },
  AlliesInPresenceCriticalStrikeChance: { Scp: 500 },
  AlliesInPresenceCriticalStrikeMultiplier: { Scp: 500 },
  AlliesInPresenceAllResistances: { Scp: 250 },
  AlliesInPresenceLifeRegeneration: { Scp: 500 },
  PresenceRadius: { Scp: 250 },
  LocalIncreasedBlockPercentage: { Shld: 500 },
  ThornsPhysicalDamage: { Body: 500, Shld: 500, Blt: 500 },
  BaseSpirit: { Body: 250, Amu: 250 },
  StunThreshold: { Body: 500, Shld: 500, Blt: 500 },
  IncreasedLife: { Body: 1000, Shld: 1000, Amu: 1000, Rng: 1000, Blt: 1000 },
  MaximumLifeIncreasePercent: { Amu: 250 },
  EnergyShield: { Amu: 500 },
  GlobalEnergyShieldPercent: { Amu: 500 },
  GlobalEvasionRatingPercent: { Amu: 500 },
  GlobalPhysicalDamageReductionRatingPercent: { Amu: 500 },
  EvasionRating: { Rng: 500 },
  PhysicalDamageReductionRating: { Blt: 1000 },
  SpellDamage: { Amu: 500 },
  IncreasedAccuracy: { Amu: 500, Rng: 500 },
  ItemFoundRarityIncreasePrefix: { Amu: 250, Rng: 250 },
  PhysicalDamage: { Rng: 1000 },
  FireDamage: { Rng: 1000 },
  ColdDamage: { Rng: 1000 },
  LightningDamage: { Rng: 1000 },
  FireDamagePercentage: { Rng: 500 },
  ColdDamagePercentage: { Rng: 500 },
  LightningDamagePercentage: { Rng: 500 },
  IncreasedChaosDamage: { Rng: 500 },
  Strength: {
    Xbw: 1000,
    Spr: 1000,
    "1HM": 1000,
    "2HM": 1000,
    Scp: 1000,
    Body: 1000,
    Shld: 1000,
    Amu: 1000,
    Rng: 1000,
    Blt: 1000,
  },
  Dexterity: {
    Bow: 1000,
    Xbw: 1000,
    Spr: 1000,
    QS: 1000,
    Body: 1000,
    Shld: 1000,
    Amu: 1000,
    Rng: 1000,
  },
  Intelligence: {
    QS: 1000,
    Wnd: 1000,
    Stf: 1000,
    Scp: 1000,
    Body: 1000,
    Shld: 1000,
    Amu: 1000,
    Rng: 1000,
  },
  AllAttributes: { Amu: 250, Rng: 250 },
  LifeRegeneration: { Body: 500, Amu: 500, Rng: 500, Blt: 500 },
  CriticalStrikeChance: { Amu: 500 },
  CriticalStrikeMultiplier: { Amu: 500 },
  LifeLeechPermyriad: { Rng: 250 },
  ItemFoundRarityIncrease: { Amu: 250, Rng: 250 },
  // Team families (C.3.8): resistances keep their hero twins' weights, the rest take half.
  TeamFireResistance: { Body: 1000, Shld: 1000, Amu: 1000, Rng: 1000, Blt: 1000 },
  TeamColdResistance: { Body: 1000, Shld: 1000, Amu: 1000, Rng: 1000, Blt: 1000 },
  TeamLightningResistance: { Body: 1000, Shld: 1000, Amu: 1000, Rng: 1000, Blt: 1000 },
  TeamChaosResistance: { Body: 500, Shld: 500, Amu: 500, Rng: 500, Blt: 500 },
  TeamAllResistances: { Shld: 250, Amu: 250, Rng: 250 },
  TeamIncreasedLife: { Body: 500, Shld: 500, Amu: 500, Rng: 500, Blt: 500 },
  TeamMaximumLifeIncreasePercent: { Amu: 125 },
  TeamEnergyShield: { Amu: 250 },
  TeamGlobalEnergyShieldPercent: { Amu: 250 },
  TeamGlobalEvasionRatingPercent: { Amu: 250 },
  TeamGlobalArmourPercent: { Amu: 250 },
  TeamEvasionRating: { Rng: 250 },
  TeamArmourRating: { Blt: 500 },
  TeamFireDamagePercentage: { Rng: 250 },
  TeamColdDamagePercentage: { Rng: 250 },
  TeamLightningDamagePercentage: { Rng: 250 },
  TeamChaosDamagePercentage: { Rng: 250 },
  TeamPhysicalDamagePercentage: { Rng: 250 },
};

/** Defence-variant rows weigh by mod group; the base's PoE2 tags pick the variant (C.3.6, ᵗ). */
export const MOD_WEIGHTS_BY_GROUP: Readonly<Record<string, SlotWeights>> = {
  BaseLocalDefences: { Body: 1000, Shld: 1000 },
  DefencesPercent: { Body: 1000, Shld: 1000 },
  BaseLocalDefencesAndDefencePercent: { Body: 500 },
  BaseLocalDefencesAndLife: { Body: 500 },
  DefencesPercentAndStunThreshold: { Shld: 500 },
  ReducedAilmentDuration: { Body: 250 },
};

/** Per-kill drop tables (Appendix E §3–§5). */
export const LOOT_TUNING = {
  /** Item rolls per kill; fractions roll as a chance of one more (E §3.1). */
  itemRolls: { normal: 0.08, magic: 0.45, rarePerAffixBonus: 0.1, rareBase: 1.5, boss: 8 },
  /** Monster rarity bonus R per affix, and for bosses (C.6 step 3). */
  rarityBonus: { magicPerAffix: 1, rarePerAffix: 2, boss: 32 },
  categories: { gear: 85, hero: 11, spell: 4 },
  slots: { weapon: 40, armour: 35, accessory: 25 },
  armour: { "Body Armour": 80, Shield: 20 },
  accessory: { Ring: 45, Amulet: 30, Belt: 25 },
  /** Share of weapon drops shaped toward the roster's weapon classes (E §3.3). */
  rosterWeaponShare: 0.5,
  /** Base tilt among a class's eligible bases: newest, second newest, the rest (C.6 step 2). */
  baseTilt: [3, 2, 1],
  rarityWeights: { normal: 75, magic: 20, rare: 3.5, unique: 0.12 },
  magicTwoModChance: 0.5,
  /** Rare mod counts 4, 5 and 6 by weight (C.6 step 4). */
  rareModCounts: [
    { count: 4, weight: 8 },
    { count: 5, weight: 3 },
    { count: 6, weight: 1 },
  ],
  affixCaps: { magic: 1, rare: 3 },
  /** An Orb of Alchemy makes a rare with this many mods (C §C.5.2). */
  alchemyMods: 4,
  qualityChance: 0.1,
  qualityMax: 20,
  /** Chance of one currency drop per kill (E §4.1); bosses roll several times. */
  currencyChance: { normal: 0.025, magic: 0.12, rare: 0.5 },
  bossCurrencyRolls: 3,
  /** MvM drop level and weight per currency (E §4.2), keyed by RePoE ID or MvM ID. */
  currencies: [
    { id: "Metadata/Items/Currency/CurrencyUpgradeToMagic", dropLevel: 1, weight: 30 },
    { id: "Metadata/Items/Currency/CurrencyAddModToMagic", dropLevel: 1, weight: 30 },
    { id: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare", dropLevel: 3, weight: 8 },
    { id: "Metadata/Items/Currency/CurrencyAddModToRare", dropLevel: 3, weight: 8 },
    { id: "Metadata/Items/Currency/CurrencyUpgradeToRare", dropLevel: 3, weight: 4 },
    { id: "Metadata/Items/Currency/CurrencyRerollRare", dropLevel: 8, weight: 6 },
    { id: "Metadata/Items/Currency/CurrencyRemoveMod", dropLevel: 15, weight: 2 },
    { id: "Metadata/Items/Currency/CurrencyCorrupt", dropLevel: 15, weight: 2 },
    { id: "Metadata/Items/Currency/CurrencyModValues", dropLevel: 20, weight: 1 },
    { id: "Metadata/Items/Currency/CurrencyGemQuality", dropLevel: 8, weight: 2 },
    { id: "Metadata/Items/Currency/CurrencyAddSkillGemSocket3", dropLevel: 5, weight: 4 },
    { id: "Metadata/Items/Currency/CurrencyAddSkillGemSocket4", dropLevel: 15, weight: 1 },
    { id: "Metadata/Items/Currency/CurrencyAddSkillGemSocket5", dropLevel: 25, weight: 0.25 },
    { id: "MvM/Currency/RerollSupport", dropLevel: 12, weight: 1 },
    { id: "MvM/Currency/TransferSupports", dropLevel: 15, weight: 0.5 },
  ],
  /** Gold piles per kill: chance and count (E §5.1). */
  goldPiles: {
    normal: { chance: 0.25, piles: 1 },
    magic: { chance: 0.6, piles: 2 },
    rare: { chance: 1, piles: 4 },
    boss: { chance: 1, piles: 10 },
  },
  /** Pile size = round((goldBase + goldPerAreaLevel × A) × rand(goldMin, goldMax) × (1 + gold_found%)). */
  goldBase: 2,
  goldPerAreaLevel: 0.4,
  goldMin: 0.75,
  goldMax: 1.25,
  /** Item price = (priceBase + pricePerItemLevel × ilvl) × rarity multiplier; sells for 20% (E §5.2). */
  priceBase: 10,
  pricePerItemLevel: 2,
  priceRarity: { normal: 1, magic: 2.5, rare: 7 },
  uniqueSellMultiplier: 4,
  sellShare: 0.2,
} as const;

/** Strongboxes (Appendix D §9). */
export const STRONGBOX_TUNING = {
  /** Chance per level that allows one (Level 4 on, never a boss level). */
  chance: 0.25,
  /** The chest sits on a placeable tile in these columns, inclusive. */
  columns: [5, 7],
  /** The ambush spends this share of the level's flag-wave budget… */
  budgetShare: 0.6,
  /** …with at least this many rare, then magic, monsters… */
  minRare: 1,
  minMagic: 2,
  /** …and at least this share of its points in the lanes nearest the box. */
  nearLanes: 2,
  nearLaneShare: 0.7,
  /** The reward once every ambusher is dead, all at area level + `ilvlBonus`. */
  reward: {
    rareItems: 1,
    itemRolls: 3,
    heroRolls: 1,
    currencyRolls: 2,
    ilvlBonus: 1,
    /** "Rare-monster rarity": a rare monster's rarity bonus R (C.6 step 3) with three affixes. */
    rarityBonus: 6,
  },
} as const;

/** Salvage and shards (Appendix C §C.5.6). */
export const SALVAGE_TUNING = {
  /** Shards per merge into their orb. */
  shardsPerOrb: 10,
  item: { magic: 1, rare: 1, rareSixMods: 2, unique: 4 },
  hero: { magic: 1, rare: 3, rareFourSupports: 4 },
  /** The Lesser Jeweller's Orb's support ceiling (C §C.5.4). */
  lesserJewellerCeiling: 3,
} as const;
