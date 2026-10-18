import { makeActor } from "../../combat/actor";
import { addScripted, createRound, spawnMonster } from "../../sim/state";
import type { Scene } from ".";

const LIFE = 1000;
/** Per lane: a small (3%), medium (12%) and big (33%) hit on a 1000-life Shambler (H §2.6). */
const HITS = [30, 120, 330];

/** Small, medium and big hits side by side, for telling the bands apart (1.25). */
export const hitBands: Scene = {
  name: "hit-bands",
  create() {
    const state = createRound({ seed: 25, lanes: [1, 2, 3], mana: 0 });
    HITS.forEach((damage, i) => {
      const lane = 1 + i;
      spawnMonster(state, {
        archetypeId: "Shambler",
        rarity: "normal",
        lane,
        x: 6,
        moveSpeed: 0,
        actor: makeActor({ maxLife: LIFE }),
      });
      addScripted(state, {
        lane,
        column: 2,
        everyTicks: 75,
        blocks: true,
        actor: makeActor({ maxLife: 42, accuracy: 100000 }),
        hit: {
          kind: "attack",
          tags: [],
          base: { physical: { min: damage, max: damage } },
          baseCrit: 0,
        },
      });
    });
    return state;
  },
  // The scene keeps its targets alive by topping their life back up between hits.
  intents(state) {
    for (const monster of state.monsters)
      if (monster.actor.life < LIFE * 0.4) monster.actor.life = monster.actor.maxLife;
    return [];
  },
};
