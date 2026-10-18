import { makeActor } from "../../combat/actor";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { addScripted, createRound, spawnMonster } from "../../sim/state";
import type { Scene } from ".";

/** Ten white level 1 Shamblers walking into a scripted bow actor per lane. */
export const shamblersVsScripted: Scene = {
  name: "shamblers-vs-scripted",
  create() {
    const state = createRound({ seed: 7, lanes: [1, 2, 3], mana: 150 });
    for (let i = 0; i < 10; i++) {
      spawnMonster(state, {
        archetypeId: "Shambler",
        rarity: "normal",
        lane: 1 + (i % 3),
        x: 9.75 + i * 0.6,
        moveSpeed: 1,
        actor: makeActor({ maxLife: 15 * COMBAT_KNOBS.K_monsterLife }),
      });
    }
    for (const lane of [1, 2, 3]) {
      addScripted(state, {
        lane,
        column: 2,
        everyTicks: 60,
        blocks: true,
        actor: makeActor({ maxLife: 42, accuracy: 100 }),
        hit: {
          kind: "attack",
          tags: ["projectile"],
          weaponClass: "bow",
          base: { physical: { min: 6, max: 9 } },
          baseCrit: 5,
        },
      });
    }
    return state;
  },
};
