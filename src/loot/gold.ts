import { LOOT_TUNING } from "../tuning/loot";

/** One gold pile (Appendix E §5.1): round((2 + 0.4 × area) × rand(0.75, 1.25) × (1 + gold found %)). */
export function goldPileSize(
  areaLevel: number,
  goldFoundPercent: number,
  rng: () => number,
): number {
  const t = LOOT_TUNING;
  const roll = t.goldMin + rng() * (t.goldMax - t.goldMin);
  return Math.round(
    (t.goldBase + t.goldPerAreaLevel * areaLevel) * roll * (1 + goldFoundPercent / 100),
  );
}
