import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { spawnBoss } from "../../monsters/bosses";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** The Bloated Miller on a 5-lane board against a level 6 defence (plan 2.5, 2.17). */
export const boss: Scene = {
  name: "boss",
  create() {
    const state = createRound({ seed: 5, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const place = (skill: string, lane: number, column: number) =>
      placeHero(
        state,
        starterCard(id<"Gem">(skill), 6, `scene-boss-${lane}-${column}`),
        lane,
        column,
      );
    for (const lane of [1, 2, 3, 4]) {
      place(SKILLS.rollingSlam, lane, 4);
      place(SKILLS.lightningArrow, lane, 2);
      place(SKILLS.armourPiercingRounds, lane, 1);
    }
    spawnBoss(state, { bossId: "BloatedMiller", areaLevel: 6, levelIndex: 5, x: 9.5 });
    return state;
  },
};
