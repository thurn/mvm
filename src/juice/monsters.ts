import type { Sound } from "../audio/engine";
import type { Material } from "./hits/bands";

/**
 * Each archetype's sound (Appendix H §7.1): what its hits sound like, so the
 * player hears whether their damage type works, and its death vocal.
 */
export const MONSTER_FEEL: Readonly<Record<string, { material: Material; deathVocal: Sound }>> = {
  Shambler: { material: "flesh", deathVocal: "kill" },
  ArmouredLight: { material: "bone", deathVocal: "bone_clatter" },
  Swarm: { material: "flesh", deathVocal: "rat_squeak" },
  Leaper: { material: "flesh", deathVocal: "goblin_squeal" },
};

/** A monster's hit material; heroes, bosses and scripted targets are flesh. */
export const materialOf = (archetypeId: string | undefined): Material =>
  (archetypeId && MONSTER_FEEL[archetypeId]?.material) || "flesh";

/** A monster's death vocal; bosses and unknown archetypes groan. */
export const deathVocalOf = (archetypeId: string | undefined): Sound =>
  (archetypeId && MONSTER_FEEL[archetypeId]?.deathVocal) || "kill";
