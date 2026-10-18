import type { RangeStatKey, ScalarStatKey } from "../combat/stats";
import type { Id } from "../types/ids";

/** Branded IDs per content kind; later beads key loot and rosters by them. @public */
export type GemId = Id<"Gem">;
/** @public */
export type BaseItemId = Id<"BaseItem">;
/** @public */
export type ModId = Id<"Mod">;
/** @public */
export type UniqueId = Id<"Unique">;
/** @public */
export type CurrencyId = Id<"Currency">;

/** One stat_set of a PoE2 skill, trimmed to the gem levels MvM uses. */
export interface SkillStatSet {
  id: string;
  /** Stats that hold at every level: `{ id, type, value }` as RePoE gives them. */
  static: unknown;
  /** Per gem level ("1"…"10"); RePoE omits values equal to the default. */
  perLevel: Record<string, unknown>;
}

export interface SkillData {
  id: string;
  isSupport: boolean;
  /** PoE2 `active_skill` (types, weapon restrictions, conversions), when the skill is active. */
  activeSkill: unknown;
  /** PoE2 `support_gem` (allowed and excluded types), when the skill is a support. */
  supportGem: unknown;
  castTime: number | null;
  /** Skill-level fields that hold at every gem level, such as `cost_multiplier`. */
  static: unknown;
  /** Per gem level costs and requirements. */
  perLevel: Record<string, unknown>;
  statSets: SkillStatSet[];
}

/** A PoE2 skill or support gem and the skills it grants (Appendix B §1.1). */
export interface GemData {
  id: GemId;
  name: string;
  gemType: "active" | "support";
  craftingLevel: number;
  craftingTypes: string[];
  requirementWeights: { strength: number; dexterity: number; intelligence: number };
  tags: string[];
  recommendedSupports: GemId[];
  skills: SkillData[];
}

export interface RawModStat {
  id: string;
  min: number;
  max: number;
}

/** A mod stat in the Appendix A vocabulary, after unit conversion. */
export type MvmModStat =
  | { stat: ScalarStatKey; min: number; max: number }
  | { stat: RangeStatKey; part: "min" | "max"; min: number; max: number };

export interface ModData {
  id: ModId;
  name: string;
  /** PoE2 mod type: the Appendix C family. */
  type: string;
  groups: string[];
  generationType: "prefix" | "suffix";
  requiredLevel: number;
  /** PoE2 spawn flags in order; the first tag a base has decides. */
  spawnWeights: { tag: string; weight: number }[];
  stats: RawModStat[];
  mvmStats: MvmModStat[];
}

export interface BaseItemData {
  id: BaseItemId;
  name: string;
  itemClass: string;
  dropLevel: number;
  tags: string[];
  /** Non-null PoE2 properties: damage, attack time, crit, armour, block… */
  properties: Record<string, number>;
  implicits: { id: string; stats: RawModStat[] }[];
}

export interface UniqueData {
  id: UniqueId;
  name: string;
  itemClass: string;
  visualId: string;
  baseId: BaseItemId;
  /** Unique mods with their raw PoE2 stats; Appendix C §C.4.3 gives each one's MvM fate. */
  mods: { id: string; stats: RawModStat[] }[];
}

export interface CurrencyData {
  id: CurrencyId;
  name: string;
  dropLevel: number;
  description: string | null;
}

/** One row of PoE2 `default_monster_stats`, by area level (Appendix A §2.2). */
export interface MonsterLevelStats {
  level: number;
  life: number;
  physicalDamage: number;
  armour: number;
  evasion: number;
  accuracy: number;
  experience: number;
  allyLife: number;
}
