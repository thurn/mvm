import { damageMap, totalDamage } from "../../combat/damage";
import { convert, critChance, gainAsExtra, type SkillHit } from "../../combat/hit";
import { DAMAGE_TYPES, stat, type DamageType, type StatSheet } from "../../combat/stats";
import { VFX_TUNING as V } from "../../tuning/juice";

/** How a hero's effects look, from its final stat block (H §5.3). */
export interface VfxProfile {
  main: DamageType;
  color: string;
  core: string;
  /** The second element's colour, shown as trail particles. */
  trail: string | null;
  trailLength: number;
  /** "Gained as extra" draws a thin outline in the gained element. */
  outline: string | null;
  ringScale: number;
  critSpark: boolean;
}

export function vfxProfile(hit: SkillHit, stats: StatSheet): VfxProfile {
  const average = damageMap();
  for (const type of DAMAGE_TYPES) {
    const range = hit.base[type];
    if (range) average[type] = (range.min + range.max) / 2;
  }
  const converted = convert(average, hit.conversion, stats);
  const mix = gainAsExtra(converted, stats);
  const total = Math.max(1e-9, totalDamage(mix));
  const ranked = [...DAMAGE_TYPES].sort((a, b) => mix[b] - mix[a]);
  const main = ranked[0]!;
  const second = ranked[1]!;
  const gained = DAMAGE_TYPES.filter((t) => mix[t] - converted[t] > 1e-9).sort(
    (a, b) => mix[b] - converted[b] - (mix[a] - converted[a]),
  )[0];
  return {
    main,
    color: V.fx[main].main,
    core: V.fx[main].core,
    trail: mix[second] / total >= V.trailShare ? V.fx[second].main : null,
    trailLength: V.trailBase + (stat(stats, "projectile_speed_+%") / 100) * V.trailPerSpeed,
    outline: gained && gained !== main ? V.fx[gained].main : null,
    ringScale: 1 + stat(stats, "area_of_effect_+%") / 100,
    critSpark: critChance(hit, stats) > V.critSparkChance,
  };
}
