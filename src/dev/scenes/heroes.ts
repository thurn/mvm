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
    // Ranged heroes stand behind the melee line in lanes 1–3.
    placeHero(state, starterCard(id<"Gem">(SKILLS.lightningSpear), 5, "scene-heroes-ls"), 1, 1);
    placeHero(state, starterCard(id<"Gem">(SKILLS.explosiveSpear), 5, "scene-heroes-es"), 2, 1);
    placeHero(state, starterCard(id<"Gem">(SKILLS.permafrostBolts), 5, "scene-heroes-pb"), 3, 1);
    // Casters in the back column of the other lanes.
    placeHero(state, starterCard(id<"Gem">(SKILLS.fireball), 5, "scene-heroes-fb"), 0, 1);
    placeHero(state, starterCard(id<"Gem">(SKILLS.flameWall), 5, "scene-heroes-fw"), 4, 1);
    placeHero(state, starterCard(id<"Gem">(SKILLS.iceNova), 5, "scene-heroes-in"), 0, 2);
    placeHero(state, starterCard(id<"Gem">(SKILLS.essenceDrain), 5, "scene-heroes-ed"), 4, 2);
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
          x: 6.5 + i * 2,
        });
    });
    return state;
  },
};
