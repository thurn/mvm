import type { Conversion } from "../../combat/hit";
import type { DamageType } from "../../combat/stats";
import type { SkillStatSet } from "../../data/types";
import { HERO_TUNING } from "../../tuning/heroes";

/** Hero level → continuous PoE2 gem level, interpolated between table rows (Appendix B §1.5). */
export function gemLevel(heroLevel: number): number {
  const req = HERO_TUNING.gemLevelRequirements;
  if (heroLevel <= req[0]!) return 1;
  for (let g = 0; g < req.length - 1; g++) {
    const lo = req[g]!;
    const hi = req[g + 1]!;
    if (heroLevel < hi) return g + 1 + (heroLevel - lo) / (hi - lo);
  }
  return req.length;
}

interface LevelEntry {
  damage_multiplier?: number;
  stats?: { id: string; value: number }[];
}

interface StaticEntry {
  stats?: { id: string; type?: string; value: number }[];
}

export interface StatSetValues {
  /** Attack damage % or spell damage effectiveness at this gem level. */
  damageMultiplier: number;
  /** Constant and per-level numeric stats, by PoE2 stat id. */
  stats: Record<string, number>;
  /** Skill-inherent conversion (`active_skill_base_physical_damage_%_to_convert_to_*`). */
  conversion: Conversion;
}

function levelValue(set: SkillStatSet, level: number): LevelEntry {
  return (set.perLevel[String(level)] ?? {}) as LevelEntry;
}

/**
 * A stat set's numbers at a continuous gem level: continuous values
 * interpolate linearly between the two levels; read counts with
 * `Math.floor(gemLevel)` instead (§1.5).
 */
export function statSetAt(set: SkillStatSet, gem: number): StatSetValues {
  const lo = Math.max(1, Math.floor(gem));
  const frac = gem - lo;
  const a = levelValue(set, lo);
  const b = levelValue(set, lo + 1);
  const dm = (entry: LevelEntry) => entry.damage_multiplier ?? HERO_TUNING.defaultDamageMultiplier;
  const damageMultiplier = frac > 0 ? dm(a) + frac * (dm(b) - dm(a)) : dm(a);

  const stats: Record<string, number> = {};
  for (const stat of (set.static as StaticEntry | null)?.stats ?? []) {
    if (stat.type !== "implicit") stats[stat.id] = stat.value;
  }
  const bValues = new Map((b.stats ?? []).map((s) => [s.id, s.value]));
  for (const stat of a.stats ?? []) {
    const next = bValues.get(stat.id);
    stats[stat.id] =
      frac > 0 && next !== undefined ? stat.value + frac * (next - stat.value) : stat.value;
  }

  const conversion: Conversion = {};
  for (const [statId, value] of Object.entries(stats)) {
    const match = /^active_skill_base_physical_damage_%_to_convert_to_(\w+)$/.exec(statId);
    if (match) {
      conversion.physical = { ...conversion.physical, [match[1] as DamageType]: value };
    }
  }
  return { damageMultiplier, stats, conversion };
}
