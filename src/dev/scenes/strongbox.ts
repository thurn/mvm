import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { startLevel } from "../../monsters/waves";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** A Level 4-shaped round whose Strongbox triggers at once: a hero stands beside it (plan 2.12, 2.18). */
export const strongbox: Scene = {
  name: "strongbox",
  create() {
    const level = {
      ...LEVEL_1,
      id: "scene-strongbox",
      index: 4,
      areaLevel: 5,
      waves: 10,
      lanes: [0, 1, 2, 3, 4],
      specialTiles: 2,
      terrainTypes: ["rock" as const],
      newTerrain: "rock" as const,
      strongboxes: true,
    };
    let seed = 1;
    let state = startLevel(level, seed);
    while (!state.strongbox) state = startLevel(level, ++seed);
    const box = state.strongbox;
    const place = (skill: string, lane: number, column: number) =>
      placeHero(
        state,
        starterCard(id<"Gem">(skill), 8, `scene-box-${lane}-${column}`),
        lane,
        column,
      );
    place(SKILLS.rollingSlam, box.lane, box.column - 1);
    for (const lane of state.lanes) {
      if (lane !== box.lane) place(SKILLS.rollingSlam, lane, 4);
      place(SKILLS.lightningArrow, lane, 2);
    }
    return state;
  },
};
