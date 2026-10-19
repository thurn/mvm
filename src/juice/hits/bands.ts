import type { Sound } from "../../audio/engine";
import { BAND_TUNING } from "../../tuning/juice";
import type { Band } from "../core/significance";

export const bandEffects = (band: Band) => BAND_TUNING[band];

/** Surfaces a hit can land on (H §12.1); M1's Shamblers are flesh. */
/** What a hit target is made of (H §7.1): bone knocks instead of the flesh band sounds. */
export type Material = "flesh" | "bone";

/** The hit sound for a band on a material: light, medium or heavy (H §2.6, §12.1). */
export function hitSoundId(band: Band, material: Material = "flesh"): Sound {
  if (material === "bone") return "hit_bone";
  return `hit_${BAND_TUNING[band].sound}` satisfies Sound;
}

/** Actor hitstop by band (H §2.6); a crit holds at least as long as a medium hit. */
export function hitstopMs(band: Band, crit: boolean): number {
  const ms = BAND_TUNING[band].hitstopMs;
  return crit ? Math.max(ms, BAND_TUNING.medium.hitstopMs) : ms;
}
