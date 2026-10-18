import { baseItems, mods } from "../data";
import { uniques } from "../data/uniques";
import type { BaseItemData, BaseItemId, ModData, ModId, RawModStat } from "../data/types";
import type { ItemInstance } from "../heroes/model/item";
import {
  LOOT_TUNING,
  MOD_WEIGHTS_BY_GROUP,
  MOD_WEIGHTS_BY_TYPE,
  type MatrixSlot,
} from "../tuning/loot";

type Rng = () => number;
export type ItemRarity = ItemInstance["rarity"];
export type MonsterRarity = "normal" | "magic" | "rare" | "unique" | "boss";

/** The demo's weapon classes (Appendix C §C.1.1). */
const WEAPON_CLASSES = [
  "Bow",
  "Crossbow",
  "Spear",
  "One Hand Mace",
  "Two Hand Mace",
  "Warstaff",
  "Wand",
  "Staff",
  "Sceptre",
] as const;

const SLOT_OF_CLASS: Readonly<Record<string, MatrixSlot>> = {
  Bow: "Bow",
  Crossbow: "Xbw",
  Spear: "Spr",
  "One Hand Mace": "1HM",
  "Two Hand Mace": "2HM",
  Warstaff: "QS",
  Wand: "Wnd",
  Staff: "Stf",
  Sceptre: "Scp",
  "Body Armour": "Body",
  Shield: "Shld",
  Amulet: "Amu",
  Ring: "Rng",
  Belt: "Blt",
};

const MARTIAL_AND_ARMOUR = new Set([
  "Bow",
  "Crossbow",
  "Spear",
  "One Hand Mace",
  "Two Hand Mace",
  "Warstaff",
  "Wand",
  "Staff",
  "Sceptre",
  "Body Armour",
  "Shield",
]);

/** Item level: area level, +1 from a rare monster, +2 from a boss (C.1.2). */
export function itemLevel(areaLevel: number, monster: MonsterRarity): number {
  return areaLevel + (monster === "rare" ? 1 : monster === "boss" || monster === "unique" ? 2 : 0);
}

export function pickWeighted<T>(options: readonly { value: T; weight: number }[], rng: Rng): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = rng() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.value;
  }
  return options.at(-1)!.value;
}

const pickUniform = <T>(values: readonly T[], rng: Rng): T =>
  values[Math.floor(rng() * values.length)]!;

/** Item rarity from base weights scaled by the rarity bonus R (C.6 step 3). */
export function rollItemRarity(rarityBonus: number, rng: Rng): ItemRarity {
  const w = LOOT_TUNING.rarityWeights;
  const scale = 1 + rarityBonus;
  return pickWeighted<ItemRarity>(
    [
      { value: "normal", weight: w.normal },
      { value: "magic", weight: w.magic * scale },
      { value: "rare", weight: w.rare * scale },
      { value: "unique", weight: w.unique * scale },
    ],
    rng,
  );
}

/** A gear slot's item class (C.6 step 2): weapon, armour or accessory, then the class within it. */
function rollItemClass(rosterWeaponClasses: readonly string[], rng: Rng): string {
  const t = LOOT_TUNING;
  const slot = pickWeighted(
    [
      { value: "weapon", weight: t.slots.weapon },
      { value: "armour", weight: t.slots.armour },
      { value: "accessory", weight: t.slots.accessory },
    ],
    rng,
  );
  if (slot === "armour")
    return pickWeighted(
      Object.entries(t.armour).map(([value, weight]) => ({ value, weight })),
      rng,
    );
  if (slot === "accessory") {
    return pickWeighted(
      Object.entries(t.accessory).map(([value, weight]) => ({ value, weight })),
      rng,
    );
  }
  const shaped = rosterWeaponClasses.length > 0 && rng() < t.rosterWeaponShare;
  return pickUniform(shaped ? rosterWeaponClasses : WEAPON_CLASSES, rng);
}

/** A class's base: among bases at or below the item level, the newest weigh 3, the next 2, the rest 1. */
function rollBase(itemClass: string, ilvl: number, rng: Rng): BaseItemData | undefined {
  const eligible = baseItems()
    .filter((b) => b.itemClass === itemClass && b.dropLevel <= ilvl)
    .sort((a, b) => b.dropLevel - a.dropLevel || a.id.localeCompare(b.id));
  if (eligible.length === 0) return undefined;
  const tilt = LOOT_TUNING.baseTilt;
  return pickWeighted(
    eligible.map((value, i) => ({ value, weight: tilt[Math.min(i, tilt.length - 1)]! })),
    rng,
  );
}

/** PoE2's spawn rule: the first spawn tag the base carries decides whether the mod may roll on it. */
function spawnsOn(mod: ModData, base: BaseItemData): boolean {
  const entry = mod.spawnWeights.find((w) => base.tags.includes(w.tag));
  return (entry?.weight ?? 0) > 0;
}

function tierWeight(mod: ModData, base: BaseItemData): number {
  const slot = SLOT_OF_CLASS[base.itemClass];
  if (!slot) return 0;
  const row =
    MOD_WEIGHTS_BY_TYPE[mod.type] ?? mod.groups.map((g) => MOD_WEIGHTS_BY_GROUP[g]).find(Boolean);
  return row?.[slot] ?? 0;
}

function rollValue(stat: RawModStat, rng: Rng): number {
  return stat.min + Math.floor(rng() * (stat.max - stat.min + 1));
}

/** Rolls `count` affixes on a base: legal tiers by weight, one per group, prefix and suffix caps (C.6 step 5). */
function rollAffixes(base: BaseItemData, ilvl: number, count: number, cap: number, rng: Rng) {
  const pool = mods().filter(
    (m) => m.requiredLevel <= ilvl && spawnsOn(m, base) && tierWeight(m, base) > 0,
  );
  const rolled: ModData[] = [];
  const groups = new Set<string>();
  const kinds = { prefix: 0, suffix: 0 };
  while (rolled.length < count) {
    const options = pool.filter(
      (m) =>
        kinds[m.generationType] < cap &&
        !m.groups.some((g) => groups.has(g)) &&
        !rolled.includes(m),
    );
    if (options.length === 0) break;
    const mod = pickWeighted(
      options.map((value) => ({ value, weight: tierWeight(value, base) })),
      rng,
    );
    rolled.push(mod);
    kinds[mod.generationType]++;
    for (const g of mod.groups) groups.add(g);
  }
  return rolled.map((mod) => ({
    modId: mod.id as ModId,
    values: mod.stats.map((s) => rollValue(s, rng)),
  }));
}

function rollModCount(rarity: ItemRarity, rng: Rng): number {
  if (rarity === "magic") return rng() < LOOT_TUNING.magicTwoModChance ? 2 : 1;
  if (rarity === "rare")
    return pickWeighted(
      LOOT_TUNING.rareModCounts.map((r) => ({ value: r.count, weight: r.weight })),
      rng,
    );
  return 0;
}

export interface GearRequest {
  ilvl: number;
  /** Forces the rarity; otherwise rolled from `rarityBonus`. */
  rarity?: ItemRarity;
  rarityBonus?: number;
  /** Forces the item class; otherwise rolled by slot with roster shaping. */
  itemClass?: string;
  rosterWeaponClasses?: readonly string[];
  newId: () => string;
}

/** A unique at the item level per C.4.1's random rule: uniform over uniques whose base can drop. */
function rollUnique(ilvl: number, request: GearRequest, rng: Rng): ItemInstance | undefined {
  const eligible = uniques().filter((u) => {
    const base = baseItems().find((b) => b.id === u.baseId);
    return base !== undefined && base.dropLevel <= ilvl;
  });
  if (eligible.length === 0) return undefined;
  const unique = pickUniform(eligible, rng);
  return {
    id: request.newId(),
    baseId: unique.baseId as BaseItemId,
    rarity: "unique",
    itemLevel: ilvl,
    quality: 0,
    uniqueId: unique.id,
    mods: unique.mods.map((m) => ({
      modId: m.id as ModId,
      values: m.stats.map((s) => rollValue(s, rng)),
    })),
  };
}

/** One gear drop (Appendix C §C.6 steps 2–6). */
export function generateGear(request: GearRequest, rng: Rng): ItemInstance {
  let rarity = request.rarity ?? rollItemRarity(request.rarityBonus ?? 0, rng);
  if (rarity === "unique") {
    const unique = rollUnique(request.ilvl, request, rng);
    if (unique) return unique;
    rarity = "rare";
  }
  let itemClass = request.itemClass ?? rollItemClass(request.rosterWeaponClasses ?? [], rng);
  let base = rollBase(itemClass, request.ilvl, rng);
  if (!base) {
    // The rolled class has nothing this low: fall back to any weapon class that does.
    const open = WEAPON_CLASSES.filter((c) => rollBase(c, request.ilvl, () => 0));
    if (open.length === 0) throw new Error(`no base can drop at item level ${request.ilvl}`);
    itemClass = pickUniform(open, rng);
    base = rollBase(itemClass, request.ilvl, rng)!;
  }
  const t = LOOT_TUNING;
  const cap = rarity === "magic" ? t.affixCaps.magic : t.affixCaps.rare;
  const quality =
    MARTIAL_AND_ARMOUR.has(base.itemClass) && rng() < t.qualityChance
      ? 1 + Math.floor(rng() * t.qualityMax)
      : 0;
  return {
    id: request.newId(),
    baseId: base.id,
    rarity,
    itemLevel: request.ilvl,
    quality,
    mods: rollAffixes(base, request.ilvl, rollModCount(rarity, rng), cap, rng),
    implicits: base.implicits.map((imp) => ({
      modId: imp.id,
      values: imp.stats.map((s) => rollValue(s, rng)),
    })),
  };
}
