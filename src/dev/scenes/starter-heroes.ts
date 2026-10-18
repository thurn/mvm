import { makeActor } from "../../combat/actor";
import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { createRound, spawnMonster } from "../../sim/state";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { id } from "../../types/ids";
import type { Scene } from ".";

const BITE = 9.16 * COMBAT_KNOBS.K_monsterDamage;

/** The seven starter heroes, each in a lane against a stream of biting level 1 Shamblers. */
export const starterHeroes: Scene = {
  name: "starter-heroes",
  create() {
    const state = createRound({ seed: 11, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const place = (skill: string, lane: number, column: number) =>
      placeHero(state, starterCard(id<"Gem">(skill), 1, `scene-${lane}-${column}`), lane, column);
    place(SKILLS.lightningArrow, 0, 2);
    place(SKILLS.armourPiercingRounds, 1, 2);
    place(SKILLS.acolyte, 2, 1);
    place(SKILLS.spark, 2, 2);
    place(SKILLS.rollingSlam, 3, 4);
    place(SKILLS.fallingThunder, 4, 3);
    place(SKILLS.iceStrike, 4, 6);
    for (let i = 0; i < 25; i++) {
      spawnMonster(state, {
        archetypeId: "Shambler",
        rarity: "normal",
        lane: i % 5,
        x: 9.75 + Math.floor(i / 5) * 1.5,
        moveSpeed: 1,
        actor: makeActor({ maxLife: 15 * COMBAT_KNOBS.K_monsterLife }),
        attack: {
          seconds: 1,
          timer: 1,
          hit: {
            kind: "attack",
            tags: ["melee"],
            base: { physical: { min: BITE, max: BITE } },
            baseCrit: 0,
          },
        },
      });
    }
    return state;
  },
};
