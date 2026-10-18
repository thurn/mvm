import { makeActor } from "../../combat/actor";
import type { StatSheet } from "../../combat/stats";
import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { createRound, spawnMonster, type RoundState } from "../../sim/state";
import { id } from "../../types/ids";
import type { Scene } from ".";

/**
 * The same hero before and after an upgrade, lane by lane (1.29): lanes 0/1
 * are Armour Piercing Rounds plain and with physical converted to cold;
 * lanes 3/4 are Lightning Arrow plain and with fire gained as extra plus two
 * more projectiles. The upgrade should show without a tooltip.
 */
export const equipAb: Scene = {
  name: "equip-ab",
  create() {
    const state = createRound({ seed: 29, lanes: [0, 1, 3, 4], mana: 0 });
    const place = (
      skill: string,
      lane: number,
      upgrade?: { stats: StatSheet; projectiles?: number },
    ) => {
      placeHero(state, starterCard(id<"Gem">(skill), 5, `scene-ab-${lane}`), lane, 2);
      const hero = state.heroes.at(-1)!;
      if (!upgrade) return;
      Object.assign(hero.actor.stats, upgrade.stats);
      const kit = hero.kit;
      if (
        upgrade.projectiles &&
        (kit?.behavior === "lightningArrow" || kit?.behavior === "armourPiercingRounds")
      )
        kit.numbers.additionalProjectiles = upgrade.projectiles;
    };
    place(SKILLS.armourPiercingRounds, 0);
    place(SKILLS.armourPiercingRounds, 1, { stats: { "physical_converted_to_cold_%": 100 } });
    place(SKILLS.lightningArrow, 3);
    place(SKILLS.lightningArrow, 4, { stats: { "damage_gained_as_fire_%": 50 }, projectiles: 2 });
    stream(state);
    return state;
  },
};

function stream(state: RoundState) {
  for (let i = 0; i < 40; i++)
    for (const lane of [0, 1, 3, 4])
      spawnMonster(state, {
        archetypeId: "Shambler",
        rarity: "normal",
        lane,
        x: 9.75 + i * 1.4,
        moveSpeed: 1,
        actor: makeActor({ maxLife: 40 * COMBAT_KNOBS.K_monsterLife }),
      });
}
