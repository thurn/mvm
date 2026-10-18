import { makeActor } from "../../combat/actor";
import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { addScripted, createRound, spawnMonster, type Rarity } from "../../sim/state";
import { id } from "../../types/ids";
import type { Scene } from ".";

const ROWS: [lane: number, rarity: Rarity, count: number][] = [
  [0, "normal", 5],
  [1, "magic", 4],
  [2, "rare", 3],
];

/** Kills by rarity, gold piles flying to the readout, and a hero falling in lane 4 (1.26). */
export const kills: Scene = {
  name: "kills",
  create() {
    const state = createRound({ seed: 26, lanes: [0, 1, 2, 4], mana: 0 });
    for (const [lane, rarity, count] of ROWS) {
      for (let i = 0; i < count; i++)
        spawnMonster(state, {
          archetypeId: "Shambler",
          rarity,
          lane,
          x: 6 + i * 1.2,
          moveSpeed: 2,
          actor: makeActor({ maxLife: 60 }),
        });
      addScripted(state, {
        lane,
        column: 2,
        everyTicks: 40,
        blocks: true,
        actor: makeActor({ maxLife: 1000, accuracy: 100000 }),
        hit: { kind: "attack", tags: [], base: { physical: { min: 35, max: 35 } }, baseCrit: 0 },
      });
    }
    // A hero with a hard-biting Shambler at its tile, to show the hero death.
    placeHero(state, starterCard(id<"Gem">(SKILLS.spark), 1, "scene-kills-hero"), 4, 3);
    spawnMonster(state, {
      archetypeId: "Shambler",
      rarity: "normal",
      lane: 4,
      x: 3.9,
      moveSpeed: 1,
      actor: makeActor({ maxLife: 100000 }),
      attack: {
        seconds: 0.8,
        timer: 0.8,
        hit: {
          kind: "attack",
          tags: ["melee"],
          base: { physical: { min: 30, max: 30 } },
          baseCrit: 0,
        },
      },
    });
    return state;
  },
};
