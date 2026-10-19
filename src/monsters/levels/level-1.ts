import type { LevelDefinition } from "./types";

/** The Riverbank: 3 lanes, Shamblers, 5 waves and 150 starting mana (Appendix D §6.1). */
export const LEVEL_1: LevelDefinition = {
  id: "level-1",
  index: 1,
  areaLevel: 1,
  lanes: [1, 2, 3],
  waves: 5,
  archetypes: ["Shambler"],
  newArchetype: "Shambler",
  // Level 1 waits 25 s, to give time to place the first acolytes (§5.1).
  firstWaveSeconds: 25,
  startingMana: 150,
  specialTiles: 0,
  terrainTypes: [],
  newTerrain: null,
  strongboxes: false,
};
