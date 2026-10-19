import { ECONOMY_TUNING } from "../../tuning/economy";
import { WAVE_TUNING } from "../../tuning/waves";
import { LEVEL_1 } from "./level-1";
import type { LevelDefinition } from "./types";

const LANES = [0, 1, 2, 3, 4];
/** Grassland after Level 1: five lanes, the standard first-wave wait and starting mana (D §5.1, E §2). */
const GRASSLAND = {
  lanes: LANES,
  firstWaveSeconds: WAVE_TUNING.firstWaveSeconds,
  startingMana: ECONOMY_TUNING.startingMana,
  specialTiles: 0,
  terrainTypes: [],
  newTerrain: null,
  strongboxes: false,
} as const;

/** Clearfell: Helmed Skeletons (D §6.1). */
export const LEVEL_2: LevelDefinition = {
  ...GRASSLAND,
  lanes: [...LANES],
  terrainTypes: [],
  id: "level-2",
  index: 2,
  areaLevel: 2,
  waves: 6,
  archetypes: ["Shambler", "ArmouredLight"],
  newArchetype: "ArmouredLight",
};

/** Clearfell: Rat Swarms. */
export const LEVEL_3: LevelDefinition = {
  ...LEVEL_2,
  id: "level-3",
  index: 3,
  areaLevel: 3,
  waves: 8,
  archetypes: ["Shambler", "ArmouredLight", "Swarm"],
  newArchetype: "Swarm",
};

/** The Grelwood: Leapers, the first Rocks and possible Strongboxes. */
export const LEVEL_4: LevelDefinition = {
  ...LEVEL_3,
  id: "level-4",
  index: 4,
  areaLevel: 5,
  waves: 10,
  archetypes: ["Shambler", "ArmouredLight", "Swarm", "Leaper"],
  newArchetype: "Leaper",
  specialTiles: 2,
  terrainTypes: ["rock"],
  newTerrain: "rock",
  strongboxes: true,
};

/** The Red Vale: eight waves, then the Bloated Miller with the last (D §6.1, §7.1). No Strongbox on a boss level. */
export const LEVEL_5: LevelDefinition = {
  ...LEVEL_4,
  id: "level-5",
  index: 5,
  areaLevel: 6,
  waves: 8,
  newArchetype: null,
  newTerrain: null,
  strongboxes: false,
  boss: "BloatedMiller",
};

/** The campaign so far, in order (D §6.1). */
export const CAMPAIGN: readonly LevelDefinition[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];
