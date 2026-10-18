import { JUICE_TUNING } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

export type Band = "small" | "medium" | "big";

/** Hit significance (H §2.6): dealt over max life picks the impact band; bosses count ×10. */
export function significance(
  dealt: number,
  maxLife: number,
  boss: boolean,
  settings: JuiceSettings,
): Band {
  const sig =
    (dealt / Math.max(1e-9, maxLife)) * (boss ? JUICE_TUNING.bossSignificanceMultiplier : 1);
  const [medium, big] = settings.sigBands;
  return sig < medium ? "small" : sig < big ? "medium" : "big";
}
