import type { WeaponClass } from "../../combat/stats";

type Role =
  | "acolyte"
  | "wall"
  | "basicRanged"
  | "advancedRanged"
  | "striker"
  | "spellcaster"
  | "curse"
  | "aura"
  | "spell";

type RechargeTier = "fast" | "slow" | "verySlow";

/** PoE2 item classes a hero slot can hold (Appendix C §C.1.1). */
export type WeaponItemClass =
  | "Bow"
  | "Crossbow"
  | "Spear"
  | "One Hand Mace"
  | "Two Hand Mace"
  | "Warstaff"
  | "Wand"
  | "Staff"
  | "Sceptre";

/** The MvM facts about a hero or spell that PoE2 data doesn't hold (Appendix B §2, §6). */
export interface CatalogEntry {
  role: Role;
  /** The locked weapon class (§1.3); null for spells, which use a virtual weapon. */
  weapon: WeaponItemClass | null;
  /** Base mana before support cost multipliers (§1.11). */
  baseMana: number;
  recharge: RechargeTier;
  /** Archetype life multiplier (§1.4). */
  lifeMultiplier: number;
  /** Attribute weights for MvM custom heroes, which have no gem. */
  attributeWeights?: { strength: number; dexterity: number; intelligence: number };
  /** Spells: cooldown and the cooldown left at level start (§6.1). */
  cooldownSeconds?: number;
  startCooldownSeconds?: number;
}

/** Catalog entries, keyed by gem ID (or MvM ID for custom heroes). Later beads add heroes. */
export const HERO_CATALOG: Readonly<Record<string, CatalogEntry>> = {
  // H01
  "MvM/Heroes/EzomyteAcolyte": {
    role: "acolyte",
    weapon: "Sceptre",
    baseMana: 50,
    recharge: "fast",
    lifeMultiplier: 1,
    attributeWeights: { strength: 0, dexterity: 0, intelligence: 100 },
  },
  // H07
  "Metadata/Items/Gems/SkillGemRollingSlam": {
    role: "striker",
    weapon: "Two Hand Mace",
    baseMana: 150,
    recharge: "fast",
    lifeMultiplier: 2.5,
  },
  // H09
  "Metadata/Items/Gems/SkillGemIceStrike": {
    role: "striker",
    weapon: "Warstaff",
    baseMana: 125,
    recharge: "fast",
    lifeMultiplier: 2,
  },
  // H10
  "Metadata/Items/Gems/SkillGemFallingThunder": {
    role: "striker",
    weapon: "Warstaff",
    baseMana: 125,
    recharge: "fast",
    lifeMultiplier: 2,
  },
  // H12
  "Metadata/Items/Gems/SkillGemLightningArrow": {
    role: "basicRanged",
    weapon: "Bow",
    baseMana: 100,
    recharge: "fast",
    lifeMultiplier: 1,
  },
  // H16
  "Metadata/Items/Gems/SkillGemLightningSpear": {
    role: "advancedRanged",
    weapon: "Spear",
    baseMana: 150,
    recharge: "fast",
    lifeMultiplier: 1.25,
  },
  // H18
  "Metadata/Items/Gem/SkillGemArmourPiercingRounds": {
    role: "basicRanged",
    weapon: "Crossbow",
    baseMana: 100,
    recharge: "fast",
    lifeMultiplier: 1.25,
  },
  // H24
  "Metadata/Items/Gems/SkillGemSpark": {
    role: "spellcaster",
    weapon: "Wand",
    baseMana: 125,
    recharge: "fast",
    lifeMultiplier: 1,
  },
  // S2
  "Metadata/Items/Gems/SkillGemEarthquake": {
    role: "spell",
    weapon: null,
    baseMana: 150,
    recharge: "fast",
    lifeMultiplier: 1,
    cooldownSeconds: 35,
    startCooldownSeconds: 20,
  },
  // S3
  "Metadata/Items/Gem/SkillGemExplosiveGrenade": {
    role: "spell",
    weapon: null,
    baseMana: 125,
    recharge: "fast",
    lifeMultiplier: 1,
    cooldownSeconds: 30,
    startCooldownSeconds: 20,
  },
  // S5
  "Metadata/Items/Gems/SkillGemComet": {
    role: "spell",
    weapon: null,
    baseMana: 175,
    recharge: "fast",
    lifeMultiplier: 1,
    cooldownSeconds: 45,
    startCooldownSeconds: 35,
  },
};

/** Every hero and spell a focus can grant (Appendix B §4). */
export const STARTER_HEROES: readonly string[] = [
  "MvM/Heroes/EzomyteAcolyte",
  "Metadata/Items/Gems/SkillGemRollingSlam",
  "Metadata/Items/Gem/SkillGemArmourPiercingRounds",
  "Metadata/Items/Gems/SkillGemFallingThunder",
  "Metadata/Items/Gems/SkillGemLightningArrow",
  "Metadata/Items/Gems/SkillGemIceStrike",
  "Metadata/Items/Gems/SkillGemSpark",
  "Metadata/Items/Gems/SkillGemEarthquake",
  "Metadata/Items/Gem/SkillGemExplosiveGrenade",
  "Metadata/Items/Gems/SkillGemComet",
];

export function catalogEntry(skillId: string): CatalogEntry {
  const entry = HERO_CATALOG[skillId];
  if (!entry) throw new Error(`no hero catalog entry for ${skillId}`);
  return entry;
}

/** The combat weapon class an item class scales with (`{weapon}_damage_+%`). */
export const WEAPON_CLASS: Readonly<Record<WeaponItemClass, WeaponClass | undefined>> = {
  Bow: "bow",
  Crossbow: "crossbow",
  Spear: "spear",
  "One Hand Mace": "mace",
  "Two Hand Mace": "mace",
  Warstaff: "quarterstaff",
  Wand: "wand",
  Staff: "staff",
  Sceptre: undefined,
};
