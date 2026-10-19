import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { spawnRoll } from "../../monsters/model";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** The Grassland archetypes (plan 2.3, 2.4, 2.15): each lane meets one, against a defence. */
export const archetypes: Scene = {
  name: "archetypes",
  create() {
    const state = createRound({ seed: 21, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const kinds = ["Shambler", "ArmouredLight", "Swarm", "Leaper", "Leaper"];
    state.lanes.forEach((lane, i) => {
      // Leaper lanes put a harmless acolyte up front, to be leapt, and the striker behind it.
      const leaper = kinds[i] === "Leaper";
      const front = leaper ? SKILLS.acolyte : SKILLS.rollingSlam;
      const back = leaper ? SKILLS.rollingSlam : SKILLS.lightningArrow;
      placeHero(state, starterCard(id<"Gem">(front), 3, `scene-arch-${lane}`), lane, 3);
      placeHero(state, starterCard(id<"Gem">(back), 3, `scene-arch-back-${lane}`), lane, 1);
      for (let wave = 0; wave < 4; wave++)
        spawnRoll(state, {
          archetypeId: kinds[i]!,
          rarity: "normal",
          affixes: [],
          areaLevel: 3,
          levelIndex: 3,
          lane,
          x: 9.75 + wave * 2,
        });
    });
    return state;
  },
};
