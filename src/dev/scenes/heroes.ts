import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { spawnRoll } from "../../monsters/model";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** Phase 2's heroes, one lane each, against Grassland monsters (plan 2.9–2.11). */
export const heroes: Scene = {
  name: "heroes",
  create() {
    const state = createRound({ seed: 31, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const lanes: [string, string][] = [
      [SKILLS.shrinewarden, "Shambler"],
      [SKILLS.armourBreaker, "ArmouredLight"],
      [SKILLS.boneshatter, "ArmouredLight"],
      [SKILLS.fangsOfFrost, "Swarm"],
      [SKILLS.armourBreaker, "Leaper"],
    ];
    lanes.forEach(([skill, monster], lane) => {
      placeHero(state, starterCard(id<"Gem">(skill), 5, `scene-heroes-${lane}`), lane, 3);
      for (let i = 0; i < 4; i++)
        spawnRoll(state, {
          archetypeId: monster,
          rarity: "normal",
          affixes: [],
          areaLevel: 3,
          levelIndex: 3,
          lane,
          x: 9.75 + i * 2,
        });
    });
    return state;
  },
};
