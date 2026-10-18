import { COMBAT_RULES } from "../tuning/combat";
import { damageMap, mapDamage, totalDamage, type DamageMap } from "./damage";
import {
  DAMAGE_TYPES,
  ELEMENTS,
  isElement,
  rangeStat,
  stat,
  type DamageRange,
  type DamageType,
  type SkillTag,
  type StatSheet,
  type WeaponClass,
} from "./stats";

/** A uniform draw in [0, 1) from one of the sim's named RNG streams. */
export type Rng = () => number;

type SkillKind = "attack" | "spell";

export type BaseDamage = Partial<Record<DamageType, DamageRange>>;

/** Percent conversion from a source type to target types. */
export type Conversion = Partial<Record<DamageType, Partial<Record<DamageType, number>>>>;

/** A "more" multiplier, optionally limited to damage types, a skill kind or skill tags. */
interface MoreModifier {
  percent: number;
  types?: readonly DamageType[];
  kind?: SkillKind;
  tags?: readonly SkillTag[];
}

/** One hit a skill delivers, before the attacker's stat sheet is applied. */
export interface SkillHit {
  kind: SkillKind;
  tags: readonly SkillTag[];
  weaponClass?: WeaponClass;
  /** Base damage per §4.1: see `attackBase` and `spellBase`. */
  base: BaseDamage;
  /** Percent: the weapon's base crit for attacks, the skill's for spells. */
  baseCrit: number;
  /** Skill-inherent conversion, applied before stat conversion (§4.2). */
  conversion?: Conversion;
  /** Support and skill "more" multipliers (§4.3). */
  more?: readonly MoreModifier[];
  /** Boss attacks flagged unblockable (§5.1). */
  unblockable?: boolean;
}

function addRanges(
  a: DamageRange | undefined,
  b: DamageRange | undefined,
): DamageRange | undefined {
  if (!a) return b;
  if (!b) return a;
  return { min: a.min + b.min, max: a.max + b.max };
}

function scaleRanges(base: BaseDamage, factor: number): BaseDamage {
  const out: BaseDamage = {};
  for (const type of DAMAGE_TYPES) {
    const range = base[type];
    if (range) out[type] = { min: range.min * factor, max: range.max * factor };
  }
  return out;
}

/**
 * Attack base damage (§4.1): the weapon's damage with local mods already
 * folded in, plus global "adds X–Y to attacks", times the skill's attack
 * damage percent at its gem level.
 */
export function attackBase(
  weapon: BaseDamage,
  attackDamagePercent: number,
  stats: StatSheet,
): BaseDamage {
  const sum: BaseDamage = {};
  for (const type of DAMAGE_TYPES) {
    const range = addRanges(weapon[type], rangeStat(stats, `attack_added_${type}_damage`));
    if (range) sum[type] = range;
  }
  return scaleRanges(sum, attackDamagePercent / 100);
}

/**
 * Spell base damage (§4.1): the skill's base damage at its gem level, plus
 * global "adds X–Y to spells" times the skill's damage effectiveness.
 */
export function spellBase(
  skillBase: BaseDamage,
  effectivenessPercent: number,
  stats: StatSheet,
): BaseDamage {
  const out: BaseDamage = {};
  for (const type of DAMAGE_TYPES) {
    const added = rangeStat(stats, `spell_added_${type}_damage`);
    const range = addRanges(
      skillBase[type],
      added && {
        min: (added.min * effectivenessPercent) / 100,
        max: (added.max * effectivenessPercent) / 100,
      },
    );
    if (range) out[type] = range;
  }
  return out;
}

/**
 * Conversion (§4.2): skill-inherent conversion first, then stat conversion
 * into whatever share of the source remains. Either one above 100% is scaled
 * down proportionally.
 */
export function convert(
  damage: DamageMap,
  skillConversion: Conversion | undefined,
  stats: StatSheet,
): DamageMap {
  const out = damageMap();
  for (const source of DAMAGE_TYPES) {
    const amount = damage[source];
    const skill = skillConversion?.[source] ?? {};
    const other: Partial<Record<DamageType, number>> = {};
    if (source === "physical") {
      for (const element of ELEMENTS) {
        other[element] = stat(stats, `physical_converted_to_${element}_%`);
      }
    }
    const skillTotal = sumValues(skill);
    const skillScale = skillTotal > 100 ? 100 / skillTotal : 1;
    const remaining = 100 - skillTotal * skillScale;
    const otherTotal = sumValues(other);
    const otherScale = otherTotal > remaining ? remaining / otherTotal : 1;
    let converted = 0;
    for (const target of DAMAGE_TYPES) {
      if (target === source) continue;
      const share = ((skill[target] ?? 0) * skillScale + (other[target] ?? 0) * otherScale) / 100;
      out[target] += amount * share;
      converted += share;
    }
    out[source] += amount * (1 - converted);
  }
  return out;
}

function sumValues(values: Partial<Record<DamageType, number>>): number {
  let total = 0;
  for (const type of DAMAGE_TYPES) total += values[type] ?? 0;
  return total;
}

/**
 * "Gained as extra" (§4.2): a percent of all post-conversion damage added on
 * top as the named type, plus the monster-only "physical as extra".
 */
export function gainAsExtra(damage: DamageMap, stats: StatSheet): DamageMap {
  const total = totalDamage(damage);
  return mapDamage(damage, (amount, type) => {
    if (type === "physical") return amount;
    const fromAll = stat(stats, `damage_gained_as_${type}_%`);
    const fromPhysical = stat(stats, `monster_extra_${type}_damage_%`);
    return amount + (total * fromAll + damage.physical * fromPhysical) / 100;
  });
}

/** Summed increased percent that applies to one damage type of this hit (§4.3). */
function increasedPercent(type: DamageType, hit: SkillHit, stats: StatSheet): number {
  let total = stat(stats, `${type}_damage_+%`) + stat(stats, `${hit.kind}_damage_+%`);
  if (isElement(type)) total += stat(stats, "elemental_damage_+%");
  for (const tag of hit.tags) total += stat(stats, `${tag}_damage_+%`);
  if (hit.kind === "attack" && hit.weaponClass)
    total += stat(stats, `${hit.weaponClass}_damage_+%`);
  return total;
}

function moreApplies(more: MoreModifier, type: DamageType, hit: SkillHit): boolean {
  if (more.types && !more.types.includes(type)) return false;
  if (more.kind && more.kind !== hit.kind) return false;
  if (more.tags && !more.tags.some((tag) => hit.tags.includes(tag))) return false;
  return true;
}

/** Increased and more (§4.3). Converted damage scales only with its final type. */
export function scale(damage: DamageMap, hit: SkillHit, stats: StatSheet): DamageMap {
  return mapDamage(damage, (amount, type) => {
    if (amount === 0) return 0;
    let scaled = amount * (1 + increasedPercent(type, hit, stats) / 100);
    for (const more of hit.more ?? []) {
      if (moreApplies(more, type, hit)) scaled *= 1 + more.percent / 100;
    }
    return scaled;
  });
}

/** Crit chance in [0, 1] (§4.5). Spells add their flat base crit stat. */
export function critChance(hit: SkillHit, stats: StatSheet): number {
  const base =
    hit.baseCrit + (hit.kind === "spell" ? stat(stats, "spell_base_critical_strike_chance") : 0);
  const chance = (base * (1 + stat(stats, "critical_strike_chance_+%") / 100)) / 100;
  return Math.min(1, Math.max(0, chance));
}

/** Damage multiplier on a crit (§4.5): 2x by default. */
export function critMultiplier(stats: StatSheet): number {
  return (
    1 + (COMBAT_RULES.baseCritBonusPercent + stat(stats, "critical_strike_multiplier_+")) / 100
  );
}

/** Chance for an attack to hit, in [0.05, 1] (§4.4). */
export function chanceToHit(accuracy: number, evasion: number): number {
  const { accuracyFactor, evasionFactor, minChanceToHit } = COMBAT_RULES;
  const denominator = accuracy + evasion * evasionFactor;
  if (denominator <= 0) return 1;
  return Math.min(1, Math.max(minChanceToHit, (accuracy * accuracyFactor) / denominator));
}

export interface RolledHit {
  /** Pre-mitigation damage per type, crit included. Ailment magnitudes read this. */
  damage: DamageMap;
  crit: boolean;
}

/**
 * The hit roll (§4.1–§4.5): rolls each base type in its range, then
 * conversion, gained as extra, increased and more, and the crit. Draws one
 * value per base type present, then one for the crit.
 */
export function rollHit(stats: StatSheet, hit: SkillHit, rng: Rng): RolledHit {
  const rolled = damageMap();
  for (const type of DAMAGE_TYPES) {
    const range = hit.base[type];
    if (range) rolled[type] = range.min + (range.max - range.min) * rng();
  }
  const scaled = scale(gainAsExtra(convert(rolled, hit.conversion, stats), stats), hit, stats);
  const crit = rng() < critChance(hit, stats);
  const multiplier = crit ? critMultiplier(stats) : 1;
  return { damage: mapDamage(scaled, (amount) => amount * multiplier), crit };
}
