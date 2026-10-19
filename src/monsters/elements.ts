import type { Conversion } from "../combat/hit";
import { MONSTER_ELEMENT_TUNING } from "../tuning/waves";

/**
 * How an archetype's physical hit converts at a campaign level (Appendix D
 * §2.3): its native element in full, else half to the biome's element, else
 * nothing. Conversion runs before "gained as extra" affixes (A §4.2), and
 * converted damage builds its element's ailments like any other.
 */
export function monsterConversion(archetypeId: string, levelIndex: number): Conversion | undefined {
  const t = MONSTER_ELEMENT_TUNING;
  const native = (t.native as Readonly<Record<string, (typeof t.native)[keyof typeof t.native]>>)[
    archetypeId
  ];
  if (native) return { physical: { [native]: 100 } };
  const biome = [...t.biomes].reverse().find((b) => levelIndex >= b.fromLevel)?.element ?? null;
  return biome ? { physical: { [biome]: t.biomeSharePercent } } : undefined;
}
