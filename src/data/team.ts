import type { ScalarStatKey } from "../combat/stats";
import { MOD_WEIGHTS_BY_TYPE } from "../tuning/loot";
import { id } from "../types/ids";
import type { ModData, RawModStat } from "./types";

/** The hero stats a team affix can carry (Appendix C §C.3.8); `team_<stat>` on an item. */
export type TeamStat = Extract<
  ScalarStatKey,
  | "fire_resistance_%"
  | "cold_resistance_%"
  | "lightning_resistance_%"
  | "chaos_resistance_%"
  | "all_elemental_resistances_%"
  | "base_maximum_life"
  | "maximum_life_+%"
  | "energy_shield"
  | "energy_shield_+%"
  | "evasion_+%"
  | "armour_+%"
  | "evasion"
  | "armour"
  | "fire_damage_+%"
  | "cold_damage_+%"
  | "lightning_damage_+%"
  | "chaos_damage_+%"
  | "physical_damage_+%"
>;

/** A team stat's raw id on an item, and the stat it becomes on every hero. */
const TEAM_PREFIX = "team_";
export const teamStatOf = (rawId: string): TeamStat | null =>
  rawId.startsWith(TEAM_PREFIX) ? (rawId.slice(TEAM_PREFIX.length) as TeamStat) : null;

type Slot = "Body" | "Shld" | "Amu" | "Rng" | "Blt";

interface TeamFamily {
  /** The family's mod type and group (`Team` + the twin's). */
  type: string;
  generationType: "prefix" | "suffix";
  stat: TeamStat;
  /** Tooltip text, `#` for the value. */
  text: string;
  /** Only shields with these defence tags take it ("SI" in C.3.6). */
  shieldTags?: string[];
  /** Twin mod id, tier name, required level, value range. */
  tiers: [twinId: string, name: string, requiredLevel: number, min: number, max: number][];
}

/** The 18 team families (Appendix C §C.3.8): twins' names and levels, about half their values. Spawn weights are in src/tuning/loot.ts. */
const TEAM_FAMILIES: readonly TeamFamily[] = [
  {
    type: "TeamFireResistance",
    generationType: "suffix",
    stat: "fire_resistance_%",
    text: "+#% team fire resistance",
    tiers: [
      ["FireResist1", "of the Whelpling", 1, 3, 5],
      ["FireResist2", "of the Salamander", 12, 6, 7],
      ["FireResist3", "of the Drake", 24, 8, 10],
      ["FireResist4", "of the Kiln", 36, 11, 13],
    ],
  },
  {
    type: "TeamColdResistance",
    generationType: "suffix",
    stat: "cold_resistance_%",
    text: "+#% team cold resistance",
    tiers: [
      ["ColdResist1", "of the Seal", 1, 3, 5],
      ["ColdResist2", "of the Penguin", 14, 6, 7],
      ["ColdResist3", "of the Narwhal", 26, 8, 10],
      ["ColdResist4", "of the Yeti", 38, 11, 13],
    ],
  },
  {
    type: "TeamLightningResistance",
    generationType: "suffix",
    stat: "lightning_resistance_%",
    text: "+#% team lightning resistance",
    tiers: [
      ["LightningResist1", "of the Cloud", 1, 3, 5],
      ["LightningResist2", "of the Squall", 13, 6, 7],
      ["LightningResist3", "of the Storm", 25, 8, 10],
      ["LightningResist4", "of the Thunderhead", 37, 11, 13],
    ],
  },
  {
    type: "TeamChaosResistance",
    generationType: "suffix",
    stat: "chaos_resistance_%",
    text: "+#% team chaos resistance",
    tiers: [
      ["ChaosResist1", "of the Lost", 16, 2, 4],
      ["ChaosResist2", "of Banishment", 30, 4, 6],
    ],
  },
  {
    type: "TeamAllResistances",
    generationType: "suffix",
    stat: "all_elemental_resistances_%",
    text: "+#% team elemental resistances",
    shieldTags: ["str_int_armour"],
    tiers: [
      ["AllResistances1", "of the Crystal", 12, 2, 3],
      ["AllResistances2", "of the Prism", 26, 3, 4],
      ["AllResistances3", "of the Kaleidoscope", 40, 5, 6],
    ],
  },
  {
    type: "TeamIncreasedLife",
    generationType: "prefix",
    stat: "base_maximum_life",
    text: "+# team maximum life",
    tiers: [
      ["IncreasedLife1", "Hale", 1, 5, 9],
      ["IncreasedLife2", "Healthy", 6, 10, 14],
      ["IncreasedLife3", "Sanguine", 16, 15, 19],
      ["IncreasedLife4", "Stalwart", 24, 20, 29],
      ["IncreasedLife5", "Stout", 33, 30, 34],
      ["IncreasedLife6", "Robust", 38, 35, 42],
    ],
  },
  {
    type: "TeamMaximumLifeIncreasePercent",
    generationType: "prefix",
    stat: "maximum_life_+%",
    text: "#% increased team maximum life",
    tiers: [["MaximumLifeIncrease1", "Hopeful", 33, 2, 2]],
  },
  {
    type: "TeamEnergyShield",
    generationType: "prefix",
    stat: "energy_shield",
    text: "+# team maximum energy shield",
    tiers: [
      ["IncreasedEnergyShield1", "Shining", 1, 4, 7],
      ["IncreasedEnergyShield2", "Glimmering", 11, 8, 10],
      ["IncreasedEnergyShield3", "Glittering", 16, 11, 12],
      ["IncreasedEnergyShield4", "Glowing", 25, 13, 16],
      ["IncreasedEnergyShield5", "Radiating", 33, 17, 20],
    ],
  },
  {
    type: "TeamGlobalEnergyShieldPercent",
    generationType: "prefix",
    stat: "energy_shield_+%",
    text: "#% increased team energy shield",
    tiers: [
      ["IncreasedEnergyShieldPercent1", "Protective", 2, 5, 7],
      ["IncreasedEnergyShieldPercent2", "Strong-Willed", 16, 8, 10],
      ["IncreasedEnergyShieldPercent3", "Resolute", 33, 11, 13],
    ],
  },
  {
    type: "TeamGlobalEvasionRatingPercent",
    generationType: "prefix",
    stat: "evasion_+%",
    text: "#% increased team evasion rating",
    tiers: [
      ["IncreasedEvasionRatingPercent1", "Shade's", 2, 5, 7],
      ["IncreasedEvasionRatingPercent2", "Ghost's", 16, 8, 10],
      ["IncreasedEvasionRatingPercent3", "Spectre's", 33, 11, 13],
    ],
  },
  {
    type: "TeamGlobalArmourPercent",
    generationType: "prefix",
    stat: "armour_+%",
    text: "#% increased team armour",
    tiers: [
      ["IncreasedPhysicalDamageReductionRatingPercent1", "Reinforced", 2, 5, 7],
      ["IncreasedPhysicalDamageReductionRatingPercent2", "Layered", 16, 8, 10],
      ["IncreasedPhysicalDamageReductionRatingPercent3", "Lobstered", 33, 11, 13],
    ],
  },
  {
    type: "TeamEvasionRating",
    generationType: "prefix",
    stat: "evasion",
    text: "+# team evasion rating",
    tiers: [
      ["IncreasedEvasionRating1", "Agile", 1, 4, 8],
      ["IncreasedEvasionRating2", "Dancer's", 11, 9, 19],
      ["IncreasedEvasionRating3", "Acrobat's", 16, 20, 25],
      ["IncreasedEvasionRating4", "Fleet", 25, 26, 39],
      ["IncreasedEvasionRating5", "Blurred", 33, 40, 53],
    ],
  },
  {
    type: "TeamArmourRating",
    generationType: "prefix",
    stat: "armour",
    text: "+# team armour",
    tiers: [
      ["IncreasedPhysicalDamageReductionRating1", "Lacquered", 1, 6, 11],
      ["IncreasedPhysicalDamageReductionRating2", "Studded", 11, 12, 25],
      ["IncreasedPhysicalDamageReductionRating3", "Ribbed", 16, 26, 34],
      ["IncreasedPhysicalDamageReductionRating4", "Fortified", 25, 35, 53],
      ["IncreasedPhysicalDamageReductionRating5", "Plated", 33, 54, 70],
    ],
  },
  ...(
    [
      ["Fire", "FireDamagePercent", ["Searing", "Sizzling", "Blistering"]],
      ["Cold", "ColdDamagePercent", ["Bitter", "Biting", "Alpine"]],
      ["Lightning", "LightningDamagePercent", ["Charged", "Hissing", "Bolting"]],
      ["Chaos", "ChaosDamagePercent", ["Impure", "Tainted", "Clouded"]],
      // MvM custom: no PoE2 jewellery twin, so its ids and names are its own.
      ["Physical", "PhysicalDamagePercent", ["Honed", "Tempered", "Forged"]],
    ] as const
  ).map(
    ([element, twin, names]): TeamFamily => ({
      type: `Team${element}DamagePercentage`,
      generationType: "prefix",
      stat: `${element.toLowerCase() as Lowercase<typeof element>}_damage_+%`,
      text: `#% increased team ${element.toLowerCase()} damage`,
      tiers: [
        [`${twin}1`, names[0], 8, 2, 3],
        [`${twin}2`, names[1], 16, 4, 6],
        [`${twin}3`, names[2], 33, 7, 8],
      ],
    }),
  ),
];

/** PoE2 tags that place a slot's bases, for the spawn rule (the slot weights do the rest). */
const SLOT_TAGS: Record<Slot, string> = {
  Body: "body_armour",
  Shld: "shield",
  Amu: "amulet",
  Rng: "ring",
  Blt: "belt",
};

function spawnWeights(family: TeamFamily): ModData["spawnWeights"] {
  const tags: ModData["spawnWeights"] = [];
  for (const tag of family.shieldTags ?? []) tags.push({ tag, weight: 1 });
  // Which slots take the family is the loot table's (src/tuning/loot.ts).
  for (const slot of Object.keys(MOD_WEIGHTS_BY_TYPE[family.type] ?? {}) as Slot[])
    tags.push({ tag: SLOT_TAGS[slot], weight: family.shieldTags && slot === "Shld" ? 0 : 1 });
  tags.push({ tag: "default", weight: 0 });
  return tags;
}

/** Every team mod (`Team` + the twin's id), as item mods. */
export const TEAM_MODS: readonly ModData[] = TEAM_FAMILIES.flatMap((family) =>
  family.tiers.map(([twin, name, requiredLevel, min, max]) => ({
    id: id<"Mod">(`Team${twin}`),
    name,
    type: family.type,
    groups: [family.type],
    generationType: family.generationType,
    requiredLevel,
    spawnWeights: spawnWeights(family),
    stats: [{ id: `${TEAM_PREFIX}${family.stat}`, min, max }],
    mvmStats: [],
  })),
);

/** Tooltip text per team stat id. */
export const TEAM_TEXT: Readonly<Record<string, string>> = Object.fromEntries(
  TEAM_FAMILIES.map((f) => [`${TEAM_PREFIX}${f.stat}`, f.text]),
);

/** The hero-only resistance families the team families replace (C.3.6 rows 79–83). */
export const REPLACED_BY_TEAM = /^(Fire|Cold|Lightning|Chaos)Resist\d|^AllResistances\d/;

/** Ring resistance implicits, adapted to team resistances (C.2.4). */
export const TEAM_IMPLICITS: Readonly<Record<string, RawModStat[]>> = {
  RingImplicitFireResistance1: [{ id: "team_fire_resistance_%", min: 10, max: 15 }],
  RingImplicitColdResistance1: [{ id: "team_cold_resistance_%", min: 10, max: 15 }],
  RingImplicitLightningResistance1: [{ id: "team_lightning_resistance_%", min: 10, max: 15 }],
  RingImplicitChaosResistance1: [{ id: "team_chaos_resistance_%", min: 4, max: 6 }],
};
