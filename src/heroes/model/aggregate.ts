import { makeActor, type Actor } from "../../combat/actor";
import type { BaseDamage, SkillHit } from "../../combat/hit";
import {
  DAMAGE_TYPES,
  stat,
  type DamageRange,
  type RangeStatKey,
  type ScalarStatKey,
  type StatSheet,
  type WeaponClass,
} from "../../combat/stats";
import { baseItems, heroGems, mods as allMods, spellGems, supportGems } from "../../data";
import { STAT_MAP } from "../../data/stat-map";
import type { BaseItemData, GemData, ModData, SkillData } from "../../data/types";
import { HERO_TUNING } from "../../tuning/heroes";
import { catalogEntry, WEAPON_CLASS, type WeaponItemClass } from "./catalog";
import type { Card } from "./hero";
import type { ItemInstance } from "./item";
import { gemLevel } from "./levels";
import { SUPPORT_STAT_MAP } from "./support-stats";

type MoreModifier = NonNullable<SkillHit["more"]>[number];

interface Attributes {
  strength: number;
  dexterity: number;
  intelligence: number;
}

/** The equipped weapon after its local mods (Appendix C §C.1.7). */
interface WeaponStats {
  itemClass: WeaponItemClass;
  weaponClass: WeaponClass | undefined;
  damage: BaseDamage;
  /** Milliseconds per attack before skill and global speed. */
  attackTime: number;
  /** Percent. */
  critChance: number;
}

/** One card's aggregated stat block (Appendix A §2.1). Every placed copy shares it. */
export interface HeroSheet {
  heroLevel: number;
  gemLevel: number;
  attributes: Attributes;
  /** The combat stat block; `stats` holds global item and support stats. */
  actor: Actor;
  weapon: WeaponStats | null;
  /** Support "more" multipliers for the skill's hits. */
  more: MoreModifier[];
  spirit: number;
  /**
   * What no system models yet, for logs: `mod:<id>` for item mods outside
   * data/mods.json (such as unique mods before their phase maps them) and
   * `supportStat:<id>` for support stats.
   */
  unmodelled: string[];
}

export interface AggregateContext {
  gems?: readonly GemData[];
  supports?: readonly GemData[];
  bases?: readonly BaseItemData[];
  mods?: readonly ModData[];
}

class Sheet {
  readonly scalars: Record<string, number> = {};
  readonly ranges: Record<string, DamageRange> = {};

  add(key: ScalarStatKey, value: number) {
    this.scalars[key] = (this.scalars[key] ?? 0) + value;
  }

  addRange(key: RangeStatKey, part: "min" | "max", value: number) {
    const range = (this.ranges[key] ??= { min: 0, max: 0 });
    range[part] += value;
  }

  get(key: ScalarStatKey): number {
    return this.scalars[key] ?? 0;
  }

  toStatSheet(): StatSheet {
    return { ...this.scalars, ...this.ranges } as StatSheet;
  }
}

function isLocal(key: string): boolean {
  return key.startsWith("local_");
}

/** Splits one item's mods into its local sheet and the hero's global sheet. */
function addItemMods(
  item: ItemInstance,
  modsById: Map<string, ModData>,
  local: Sheet,
  global: Sheet,
  unmodelled: string[],
) {
  for (const rolled of item.mods) {
    const mod = modsById.get(rolled.modId);
    if (!mod) {
      unmodelled.push(`mod:${rolled.modId}`);
      continue;
    }
    mod.stats.forEach((raw, index) => {
      const mapping = STAT_MAP[raw.id];
      const value = rolled.values[index];
      if (!mapping || value === undefined) return;
      const sheet = isLocal(mapping.stat) ? local : global;
      if ("part" in mapping) sheet.addRange(mapping.stat, mapping.part, value);
      else sheet.add(mapping.stat, value / (mapping.divisor ?? 1));
    });
  }
}

function weaponStats(base: BaseItemData, local: Sheet, quality: number): WeaponStats {
  const p = base.properties;
  const damage: BaseDamage = {};
  const physMultiplier = (1 + local.get("local_physical_damage_+%") / 100) * (1 + quality / 100);
  for (const type of DAMAGE_TYPES) {
    const added = local.ranges[`local_added_${type}_damage`];
    const baseMin = type === "physical" ? (p.physical_damage_min ?? 0) : 0;
    const baseMax = type === "physical" ? (p.physical_damage_max ?? 0) : 0;
    const min = baseMin + (added?.min ?? 0);
    const max = baseMax + (added?.max ?? 0);
    if (min === 0 && max === 0) continue;
    const scale = type === "physical" ? physMultiplier : 1;
    damage[type] = { min: min * scale, max: max * scale };
  }
  const itemClass = base.itemClass as WeaponItemClass;
  return {
    itemClass,
    weaponClass: WEAPON_CLASS[itemClass],
    damage,
    attackTime: (p.attack_time ?? 1000) / (1 + local.get("local_attack_speed_+%") / 100),
    critChance: (p.critical_strike_chance ?? 0) / 100 + local.get("local_critical_strike_chance"),
  };
}

function attributes(weights: Attributes, level: number, global: Sheet): Attributes {
  const t = HERO_TUNING;
  const one = (weight: number, flat: number) =>
    Math.floor(
      t.attributeBase +
        (t.attributeWeightBonus + t.attributePerLevel * (level - 1)) * (weight / 100),
    ) +
    flat +
    global.get("all_attributes");
  return {
    strength: one(weights.strength, global.get("strength")),
    dexterity: one(weights.dexterity, global.get("dexterity")),
    intelligence: one(weights.intelligence, global.get("intelligence")),
  };
}

function addSupports(
  supportIds: readonly string[],
  supports: readonly GemData[],
  global: Sheet,
  more: MoreModifier[],
  unmodelled: string[],
) {
  for (const supportId of supportIds) {
    const gem = supports.find((g) => g.id === supportId);
    if (!gem) throw new Error(`unknown support ${supportId}`);
    for (const skill of gem.skills) {
      for (const set of skill.statSets) {
        const stats =
          (set.static as { stats?: { id: string; value: number }[] } | null)?.stats ?? [];
        for (const { id, value } of stats) {
          const effect = SUPPORT_STAT_MAP[id];
          if (!effect) {
            unmodelled.push(`supportStat:${id}`);
          } else if ("stat" in effect) {
            global.add(effect.stat, value / (effect.divisor ?? 1));
          } else {
            more.push({ ...effect.more, percent: effect.fixedPercent ?? value });
          }
        }
      }
    }
  }
}

/**
 * Aggregates a card into its stat block (Appendix A §2.1, B §1.4, C §C.1.7):
 * attributes from the gem's weights and level, items (local mods into the
 * item, global mods into the sheet) and supports.
 */
export function aggregate(card: Card, context: AggregateContext = {}): HeroSheet {
  const gems = context.gems ?? [...heroGems(), ...spellGems()];
  const bases = context.bases ?? baseItems();
  const modsById = new Map((context.mods ?? allMods()).map((m) => [m.id as string, m]));
  const { hero } = card;
  const entry = catalogEntry(hero.skillId);
  const gem = gems.find((g) => g.id === hero.skillId);
  const weights = gem?.requirementWeights ??
    entry.attributeWeights ?? { strength: 0, dexterity: 0, intelligence: 0 };

  const global = new Sheet();
  const unmodelled: string[] = [];
  const baseOf = (item: ItemInstance) => {
    const base = bases.find((b) => b.id === item.baseId);
    if (!base) throw new Error(`item ${item.id}: unknown base ${item.baseId}`);
    return base;
  };

  let weapon: WeaponStats | null = null;
  const weaponLocal = new Sheet();
  if (card.weapon) {
    addItemMods(card.weapon, modsById, weaponLocal, global, unmodelled);
    weapon = weaponStats(baseOf(card.weapon), weaponLocal, card.weapon.quality);
  }

  const armourLocal = new Sheet();
  const armourBase = card.armour ? baseOf(card.armour) : null;
  if (card.armour) addItemMods(card.armour, modsById, armourLocal, global, unmodelled);
  if (card.accessory) addItemMods(card.accessory, modsById, new Sheet(), global, unmodelled);

  const more: MoreModifier[] = [];
  addSupports(hero.supports, context.supports ?? supportGems(), global, more, unmodelled);

  const attrs = attributes(weights, hero.level, global);
  const t = HERO_TUNING;
  const maxLife =
    (t.lifeBase +
      t.lifePerLevel * hero.level +
      t.lifePerStrength * attrs.strength +
      global.get("base_maximum_life")) *
    (1 + global.get("maximum_life_+%") / 100) *
    entry.lifeMultiplier;

  const p = armourBase?.properties ?? {};
  const hybrid = armourLocal.get("local_hybrid_defence_+%");
  const localDefence = (base: number, flat: ScalarStatKey, percent: ScalarStatKey) =>
    (base + armourLocal.get(flat)) *
    (1 + (armourLocal.get(percent) + (base > 0 ? hybrid : 0)) / 100);
  const armour =
    (global.get("armour") + localDefence(p.armour ?? 0, "local_armour", "local_armour_+%")) *
    (1 + global.get("armour_+%") / 100);
  const evasion =
    (global.get("evasion") + localDefence(p.evasion ?? 0, "local_evasion", "local_evasion_+%")) *
    (1 + global.get("evasion_+%") / 100);
  const maxEs =
    (global.get("energy_shield") +
      localDefence(p.energy_shield ?? 0, "local_energy_shield", "local_energy_shield_+%")) *
    (1 +
      (global.get("energy_shield_+%") +
        Math.floor(attrs.intelligence / t.intelligencePerEnergyShieldPercent)) /
        100);
  const accuracy =
    (t.accuracyPerDexterity * attrs.dexterity +
      global.get("accuracy_rating") +
      weaponLocal.get("local_accuracy_rating")) *
    (1 + global.get("accuracy_rating_+%") / 100);
  const allEle = global.get("all_elemental_resistances_%");
  const blockBase = armourBase?.itemClass === "Shield" ? (p.block ?? 0) : 0;

  const stats = global.toStatSheet();
  const actor = makeActor({
    maxLife,
    maxEs,
    armour,
    evasion,
    accuracy,
    blockChance: blockBase * (1 + global.get("block_chance_+%") / 100),
    resist: {
      fire: global.get("fire_resistance_%") + allEle,
      cold: global.get("cold_resistance_%") + allEle,
      lightning: global.get("lightning_resistance_%") + allEle,
      chaos: global.get("chaos_resistance_%"),
    },
    ailmentThreshold: maxLife / 2,
    stats,
  });

  const sceptreSpirit = weapon?.itemClass === "Sceptre" ? t.sceptreBaseSpirit : 0;
  return {
    heroLevel: hero.level,
    gemLevel: gemLevel(hero.level),
    attributes: attrs,
    actor,
    weapon,
    more,
    spirit: sceptreSpirit + stat(stats, "spirit"),
    unmodelled: [...new Set(unmodelled)].sort(),
  };
}

/** Raw PoE2 attacks per second with the card's weapon, before `K_heroActionRate` (Appendix B §3). */
export function attacksPerSecond(sheet: HeroSheet, skill: SkillData): number {
  if (!sheet.weapon) return 0;
  const multiplier =
    (skill.static as { attack_speed_multiplier?: number } | null)?.attack_speed_multiplier ?? 0;
  return (
    (1000 / sheet.weapon.attackTime) *
    (1 + multiplier / 100) *
    (1 + stat(sheet.actor.stats, "attack_speed_+%") / 100)
  );
}
