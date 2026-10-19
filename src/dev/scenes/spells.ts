import { starterCard } from "../../heroes/model/starter";
import { buildMonster } from "../../monsters/model";
import { lockRoster } from "../../sim/economy/roster";
import type { Intent } from "../../sim/intents";
import { createRound, spawnMonster } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { GRASSLAND_SPELLS, STARTER_SPELLS } from "../../spells/catalog";
import { id } from "../../types/ids";
import type { Scene } from ".";

/** When (seconds) each starter spell is cast, and where. */
const CASTS: { at: number; spellId: string; lane: number; column: number }[] = [
  { at: 2, spellId: "comet", lane: 1, column: 7 },
  { at: 5, spellId: "earthquake", lane: 2, column: 6 },
  { at: 8, spellId: "grenade", lane: 3, column: 6 },
  { at: 10, spellId: "frostBomb", lane: 1, column: 5 },
];

/** Packs of level 1 Shamblers walking into a Comet, an Earthquake, an Explosive Grenade and a Frost Bomb. */
export const spells: Scene = {
  name: "spells",
  create() {
    const state = createRound({ seed: 5, lanes: [0, 1, 2, 3, 4], mana: 9990 });
    lockRoster(state, [
      starterCard(id<"Gem">(STARTER_SPELLS.comet), 1, "comet"),
      starterCard(id<"Gem">(STARTER_SPELLS.earthquake), 1, "earthquake"),
      starterCard(id<"Gem">(STARTER_SPELLS.explosiveGrenade), 1, "grenade"),
      starterCard(id<"Gem">(GRASSLAND_SPELLS.frostBomb), 1, "frostBomb"),
    ]);
    for (const slot of state.roster) slot.rechargeLeft = 0;
    for (let i = 0; i < 30; i++) {
      spawnMonster(
        state,
        buildMonster({
          archetypeId: "Shambler",
          rarity: "normal",
          affixes: [],
          areaLevel: 1,
          levelIndex: 1,
          lane: i % 5,
          x: 7 + Math.floor(i / 5) * 0.5,
        }),
      );
    }
    return state;
  },
  intents(state): Intent[] {
    return CASTS.filter((c) => Math.round(c.at * STEPS_PER_SECOND) === state.tick).map((c) => ({
      type: "cast",
      spellId: c.spellId,
      lane: c.lane,
      x: c.column,
    }));
  },
};
