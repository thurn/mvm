import { LEVEL_1 } from "../../monsters/levels/level-1";
import { startLevel } from "../../monsters/waves";
import type { Scene } from ".";

/** A generated Level 4-shaped map: 5 lanes, 2 Rocks (D §6.1, §8.2; plan 2.2, 2.16). */
export const terrain: Scene = {
  name: "terrain",
  create() {
    return startLevel(
      {
        ...LEVEL_1,
        id: "scene-terrain",
        index: 4,
        areaLevel: 5,
        lanes: [0, 1, 2, 3, 4],
        specialTiles: 2,
        terrainTypes: ["rock"],
        newTerrain: "rock",
        startingMana: 500,
      },
      Math.floor(Math.random() * 1e9),
    );
  },
};
