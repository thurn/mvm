import { BAND_TUNING } from "../../tuning/juice";
import type { Band } from "../core/significance";

export const bandEffects = (band: Band) => BAND_TUNING[band];

/** Surfaces a hit can land on (H §12.1); M1's Shamblers are flesh. */
type Material = "flesh";

/** The hit sound for a band on a material: light, medium or heavy (H §2.6, §12.1). */
export function hitSoundId(band: Band, material: Material = "flesh"): string {
  void material;
  return `hit_${BAND_TUNING[band].sound}`;
}

/** Actor hitstop by band (H §2.6); a crit holds at least as long as a medium hit. */
export function hitstopMs(band: Band, crit: boolean): number {
  const ms = BAND_TUNING[band].hitstopMs;
  return crit ? Math.max(ms, BAND_TUNING.medium.hitstopMs) : ms;
}
