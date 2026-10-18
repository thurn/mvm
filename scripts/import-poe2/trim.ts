/**
 * Trims the PoE2 RePoE export to the committed `data/` files (P19). Pure:
 * it reads only the parsed source objects it is given, so the same pin and
 * ID lists always give the same output.
 */
import { STAT_MAP } from "../../src/data/stat-map";
import type {
  BaseItemData,
  CurrencyData,
  GemData,
  ModData,
  MonsterLevelStats,
  MvmModStat,
  RawModStat,
  SkillData,
  SkillStatSet,
  UniqueData,
} from "../../src/data/types";

/** The parsed RePoE files the trimmer reads. */
export interface RepoeSource {
  skillGems: unknown;
  skills: unknown;
  baseItems: unknown;
  mods: unknown;
  uniques: unknown;
  defaultMonsterStats: unknown;
}

/** The committed ID lists in `scripts/import-poe2/ids/`. Later phases extend these. */
export interface IdLists {
  /** Full gem IDs of hero skills (Appendix B §2). */
  heroes: string[];
  /** Full gem IDs of player spells (Appendix B §6). */
  spells: string[];
  /** Support gem IDs as Appendix B §5 cites them, resolved by suffix. */
  supports: string[];
  /** Base visual IDs as Appendix C §C.2 cites them, resolved by suffix. */
  bases: string[];
  /** Mod IDs from Appendix C §C.3. */
  mods: string[];
  /** Mod types from Appendix C §C.3 whose rows list variants rather than IDs. */
  modTypes: string[];
  uniques: { id: string; base: string; mods: string[] }[];
  currency: string[];
}

export interface TrimOptions {
  /** Bases and mods above this item level are left out. */
  maxItemLevel: number;
  /** Skill levels above this gem level are left out. */
  maxGemLevel: number;
}

export interface DataFiles {
  "heroes.json": GemData[];
  "spells.json": GemData[];
  "supports.json": GemData[];
  "bases.json": BaseItemData[];
  "mods.json": ModData[];
  "uniques.json": UniqueData[];
  "currency.json": CurrencyData[];
  "monster-stats.json": MonsterLevelStats[];
}

type Json = Record<string, unknown>;

function record(value: unknown, what: string): Record<string, Json> {
  if (value === null || typeof value !== "object") throw new Error(`${what} is not an object`);
  return value as Record<string, Json>;
}

function get(table: Record<string, Json>, key: string, what: string): Json {
  const entry = table[key];
  if (!entry) throw new Error(`${what} ${key} is not in the RePoE export`);
  return entry;
}

/** Resolves a short ID (`FourBow1`, `SupportGemBrutality`) to the one full key ending in it. */
function resolveSuffix(table: Record<string, Json>, short: string, what: string): string {
  if (short in table) return short;
  const matches = Object.keys(table).filter((key) => key.endsWith(`/${short}`));
  if (matches.length !== 1) {
    throw new Error(`${what} ${short} matches ${matches.length} RePoE entries`);
  }
  return matches[0]!;
}

function levelsUpTo(perLevel: unknown, max: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const levels = Object.keys(record(perLevel ?? {}, "per_level"))
    .map(Number)
    .filter((level) => level <= max)
    .sort((a, b) => a - b);
  for (const level of levels) out[String(level)] = (perLevel as Json)[String(level)];
  return out;
}

/** Drops tooltip text, which MvM never reads. */
function withoutText(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutText);
  if (value === null || typeof value !== "object") return value;
  const out: Json = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === "stat_text" || key === "tooltip_order" || key === "translation_file") continue;
    if (key === "description") continue;
    out[key] = withoutText(inner);
  }
  return out;
}

function trimSkill(skills: Record<string, Json>, id: string, options: TrimOptions): SkillData {
  const skill = get(skills, id, "skill");
  const statSets = (skill.stat_sets as Json[] | undefined) ?? [];
  return {
    id,
    isSupport: skill.is_support === true,
    activeSkill: withoutText(skill.active_skill ?? null),
    supportGem: skill.support_gem ?? null,
    castTime: typeof skill.cast_time === "number" ? skill.cast_time : null,
    static: withoutText(skill.static ?? null),
    perLevel: levelsUpTo(skill.per_level, options.maxGemLevel),
    statSets: statSets.map((set): SkillStatSet => ({
      id: String(set.id),
      static: withoutText(set.static ?? null),
      perLevel: levelsUpTo(set.per_level, options.maxGemLevel),
    })),
  };
}

function trimGem(source: RepoeSource, key: string, options: TrimOptions): GemData {
  const gems = record(source.skillGems, "skill_gems");
  const skills = record(source.skills, "skills");
  const gem = get(gems, key, "gem");
  const base = gem.base_item as Json;
  const weights = gem.requirement_weights as GemData["requirementWeights"];
  return {
    id: key as GemData["id"],
    name: String(base.display_name),
    gemType: gem.gem_type === "support" ? "support" : "active",
    craftingLevel: Number(gem.crafting_level),
    craftingTypes: [...((gem.crafting_types as string[] | undefined) ?? [])],
    requirementWeights: {
      strength: weights.strength,
      dexterity: weights.dexterity,
      intelligence: weights.intelligence,
    },
    tags: [...((gem.tags as string[] | undefined) ?? [])],
    recommendedSupports: [...((gem.recommended_supports as GemData["id"][] | undefined) ?? [])],
    skills: ((gem.grants_skills as string[] | undefined) ?? []).map((id) =>
      trimSkill(skills, id, options),
    ),
  };
}

function rawStats(mod: Json): RawModStat[] {
  return ((mod.stats as RawModStat[] | undefined) ?? []).map(({ id, min, max }) => ({
    id,
    min,
    max,
  }));
}

/** Maps a mod's PoE2 stats to the vocabulary, failing on any stat the map doesn't know. */
function mapStats(modId: string, stats: RawModStat[]): MvmModStat[] {
  const out: MvmModStat[] = [];
  for (const raw of stats) {
    if (!(raw.id in STAT_MAP))
      throw new Error(`mod ${modId}: PoE2 stat ${raw.id} has no STAT_MAP entry`);
    const mapping = STAT_MAP[raw.id];
    if (!mapping) continue;
    if ("part" in mapping) {
      out.push({ stat: mapping.stat, part: mapping.part, min: raw.min, max: raw.max });
    } else {
      const divisor = mapping.divisor ?? 1;
      const a = raw.min / divisor;
      const b = raw.max / divisor;
      out.push({ stat: mapping.stat, min: Math.min(a, b), max: Math.max(a, b) });
    }
  }
  return out;
}

function isRollableAffix(mod: Json): boolean {
  return (
    mod.domain === "item" &&
    (mod.generation_type === "prefix" || mod.generation_type === "suffix") &&
    mod.is_essence_only !== true &&
    ((mod.spawn_weights as { weight: number }[] | undefined) ?? []).some((w) => w.weight > 0)
  );
}

function trimMods(source: RepoeSource, ids: IdLists, options: TrimOptions): ModData[] {
  const mods = record(source.mods, "mods");
  const wanted = new Set(ids.mods);
  for (const id of ids.mods) get(mods, id, "mod");
  const types = new Set(ids.modTypes);
  return Object.keys(mods)
    .filter((id) => wanted.has(id) || types.has(String(mods[id]!.type)))
    .filter(
      (id) =>
        isRollableAffix(mods[id]!) && Number(mods[id]!.required_level) <= options.maxItemLevel,
    )
    .sort()
    .map((id): ModData => {
      const mod = mods[id]!;
      const stats = rawStats(mod);
      return {
        id: id as ModData["id"],
        name: String(mod.name),
        type: String(mod.type),
        groups: [...((mod.groups as string[] | undefined) ?? [])],
        generationType: mod.generation_type as ModData["generationType"],
        requiredLevel: Number(mod.required_level),
        spawnWeights: ((mod.spawn_weights as ModData["spawnWeights"] | undefined) ?? []).map(
          ({ tag, weight }) => ({ tag, weight }),
        ),
        stats,
        mvmStats: mapStats(id, stats),
      };
    });
}

function trimProperties(properties: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const entries = Object.entries(record(properties ?? {}, "properties")).sort(([a], [b]) =>
    a < b ? -1 : 1,
  );
  for (const [key, value] of entries) if (typeof value === "number") out[key] = value;
  return out;
}

function trimBases(source: RepoeSource, ids: IdLists, options: TrimOptions): BaseItemData[] {
  const bases = record(source.baseItems, "base_items");
  const mods = record(source.mods, "mods");
  return ids.bases
    .map((short) => resolveSuffix(bases, short, "base"))
    .filter((key) => Number(bases[key]!.drop_level) <= options.maxItemLevel)
    .map((key): BaseItemData => {
      const base = bases[key]!;
      return {
        id: key as BaseItemData["id"],
        name: String(base.name),
        itemClass: String(base.item_class),
        dropLevel: Number(base.drop_level),
        tags: [...((base.tags as string[] | undefined) ?? [])],
        properties: trimProperties(base.properties),
        implicits: ((base.implicits as string[] | undefined) ?? []).map((id) => ({
          id,
          stats: rawStats(get(mods, id, "implicit mod")),
        })),
      };
    });
}

function trimUniques(source: RepoeSource, ids: IdLists): UniqueData[] {
  const uniques = record(source.uniques, "uniques");
  const bases = record(source.baseItems, "base_items");
  const mods = record(source.mods, "mods");
  return ids.uniques.map((wanted): UniqueData => {
    const unique = Object.values(uniques).find(
      (u) => (u.visual_identity as Json | undefined)?.id === wanted.id,
    );
    if (!unique) throw new Error(`unique ${wanted.id} is not in the RePoE export`);
    return {
      id: String(unique.id) as UniqueData["id"],
      name: String(unique.name),
      itemClass: String(unique.item_class),
      visualId: wanted.id,
      baseId: resolveSuffix(bases, wanted.base, "unique base") as UniqueData["baseId"],
      mods: wanted.mods.map((id) => ({ id, stats: rawStats(get(mods, id, "unique mod")) })),
    };
  });
}

function trimCurrency(source: RepoeSource, ids: IdLists): CurrencyData[] {
  const bases = record(source.baseItems, "base_items");
  return ids.currency.map((key): CurrencyData => {
    const item = get(bases, key, "currency");
    const description = (item.properties as Json | undefined)?.description;
    return {
      id: key as CurrencyData["id"],
      name: String(item.name),
      dropLevel: Number(item.drop_level),
      description: typeof description === "string" ? description : null,
    };
  });
}

function trimMonsterStats(source: RepoeSource): MonsterLevelStats[] {
  const rows = record(source.defaultMonsterStats, "default_monster_stats");
  return Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level): MonsterLevelStats => {
      const row = rows[String(level)]!;
      return {
        level,
        life: Number(row.life),
        physicalDamage: Number(row.physical_damage),
        armour: Number(row.armour),
        evasion: Number(row.evasion),
        accuracy: Number(row.accuracy),
        experience: Number(row.experience),
        allyLife: Number(row.ally_life),
      };
    });
}

export function trim(source: RepoeSource, ids: IdLists, options: TrimOptions): DataFiles {
  const gems = record(source.skillGems, "skill_gems");
  return {
    "heroes.json": ids.heroes.map((id) => trimGem(source, id, options)),
    "spells.json": ids.spells.map((id) => trimGem(source, id, options)),
    "supports.json": ids.supports
      .map((short) => resolveSuffix(gems, short, "support"))
      .sort()
      .map((id) => trimGem(source, id, options)),
    "bases.json": trimBases(source, ids, options),
    "mods.json": trimMods(source, ids, options),
    "uniques.json": trimUniques(source, ids),
    "currency.json": trimCurrency(source, ids),
    "monster-stats.json": trimMonsterStats(source),
  };
}
