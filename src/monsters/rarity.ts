import { WAVE_TUNING } from "../tuning/waves";
import { MONSTER_AFFIXES } from "./affixes";
import type { LevelDefinition } from "./levels/types";

export type SpawnRarity = "normal" | "magic" | "rare";
type Rng = () => number;

/** Rolls one spawn's rarity from the level's magic and rare chances (Appendix D §3). */
export function rollRarity(level: LevelDefinition, rng: Rng): SpawnRarity {
  const row =
    WAVE_TUNING.rarityByLevel.find((r) => level.index <= r.maxLevel) ??
    WAVE_TUNING.rarityByLevel.at(-1)!;
  const roll = rng();
  if (roll < row.rare) return "rare";
  if (roll < row.rare + row.magic) return "magic";
  return "normal";
}

/** Rolls distinct affixes legal for the archetype at the area level: 1 for magic, 2–4 for rare (§4). */
export function rollAffixes(
  rarity: SpawnRarity,
  archetypeId: string,
  areaLevel: number,
  rng: Rng,
): string[] {
  if (rarity === "normal") return [];
  const count =
    rarity === "magic"
      ? 1
      : WAVE_TUNING.rareAffixesMin +
        Math.floor(rng() * (WAVE_TUNING.rareAffixesMax - WAVE_TUNING.rareAffixesMin + 1));
  const pool = Object.keys(MONSTER_AFFIXES)
    .sort()
    .filter((id) => {
      const affix = MONSTER_AFFIXES[id]!;
      return affix.requiredLevel <= areaLevel && (!affix.only || affix.only.includes(archetypeId));
    });
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
  }
  return picked;
}
