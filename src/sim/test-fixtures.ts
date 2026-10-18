import { makeActor } from "../combat/actor";
import type { SkillHit } from "../combat/hit";
import { COMBAT_KNOBS } from "../tuning/combat";
import type { MonsterSpec } from "./state";

/** A white level 1 Shambler, built by hand until the monster model (1.13) lands. */
export function shambler(lane: number, x: number): MonsterSpec {
  return {
    archetypeId: "Shambler",
    rarity: "normal",
    lane,
    x,
    moveSpeed: 1,
    actor: makeActor({ maxLife: 15 * COMBAT_KNOBS.K_monsterLife }),
  };
}

export const arrow: SkillHit = {
  kind: "attack",
  tags: ["projectile"],
  weaponClass: "bow",
  base: { physical: { min: 7, max: 9 } },
  baseCrit: 5,
};
