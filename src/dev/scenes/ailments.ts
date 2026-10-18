import { makeActor } from "../../combat/actor";
import type { SkillHit } from "../../combat/hit";
import { addScripted, createRound, spawnMonster } from "../../sim/state";
import type { Scene } from ".";

const LIFE = 2000;
const hit = (base: SkillHit["base"], extra: Partial<SkillHit> = {}): SkillHit => ({
  kind: "attack",
  tags: [],
  base,
  baseCrit: 0,
  ...extra,
});
/** One ailment per lane: ignite, chill/freeze, shock, heavy stun, armour break (1.30). */
const LANES: SkillHit[] = [
  hit({ fire: { min: 600, max: 600 } }),
  hit({ cold: { min: 450, max: 450 } }),
  hit({ lightning: { min: 300, max: 300 } }),
  hit({ physical: { min: 600, max: 600 } }, { tags: ["melee"] }),
  hit({ physical: { min: 60, max: 60 } }, { armourBreak: 4000 }),
];

/** Each ailment on its own Shambler, so each is identifiable at a glance (1.30). */
export const ailments: Scene = {
  name: "ailments",
  create() {
    const state = createRound({ seed: 30, lanes: [0, 1, 2, 3, 4], mana: 0 });
    LANES.forEach((laneHit, lane) => {
      spawnMonster(state, {
        archetypeId: "Shambler",
        rarity: "normal",
        lane,
        x: 6,
        moveSpeed: 0,
        actor: makeActor({ maxLife: LIFE, armour: 300 }),
      });
      addScripted(state, {
        lane,
        column: 2,
        // Fire hits often, since ignite builds from accumulated flammability.
        everyTicks: lane === 0 ? 30 : 90,
        blocks: true,
        actor: makeActor({ maxLife: 1000, accuracy: 100000 }),
        hit: laneHit,
      });
    });
    return state;
  },
  // The scene keeps its targets alive by topping their life back up.
  intents(state) {
    for (const monster of state.monsters)
      if (monster.actor.life < LIFE * 0.5) monster.actor.life = monster.actor.maxLife;
    return [];
  },
};
