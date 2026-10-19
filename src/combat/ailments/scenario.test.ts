import { expect, test } from "vitest";
import { buildMonster } from "../../monsters/model";
import type { SimEvent } from "../../sim/events";
import { step } from "../../sim/kernel";
import { addScripted, createRound, spawnMonster } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { makeActor } from "../actor";

test("scenario: an Ice Strike-like scripted cold hit freezes a walking Shambler", () => {
  const state = createRound({ seed: 8, lanes: [2], mana: 0 });
  const shambler = spawnMonster(
    state,
    buildMonster({
      archetypeId: "Shambler",
      rarity: "normal",
      affixes: [],
      areaLevel: 1,
      levelIndex: 1,
      lane: 2,
      x: 6,
    }),
  );
  // Enough life to outlast the test; its ailment threshold stays a level 1 Shambler's 67.5.
  shambler.actor.maxLife = shambler.actor.life = 1000;
  // Ice Strike's 80% conversion makes its hits mostly cold; its Freeze support doubles buildup.
  addScripted(state, {
    lane: 2,
    column: 2,
    everyTicks: 30,
    actor: makeActor({ maxLife: 84, accuracy: 500, stats: { "freeze_buildup_+%": 100 } }),
    hit: {
      kind: "attack",
      tags: ["melee"],
      base: { physical: { min: 5, max: 5 } },
      baseCrit: 0,
      conversion: { physical: { cold: 80 } },
    },
  });
  let frozenAt = -1;
  for (let i = 0; i < 20 * STEPS_PER_SECOND && frozenAt < 0; i++) {
    for (const e of step(state, [])) {
      if (e.type === "ailmentApplied" && e.ailment === "freeze" && e.targetId === shambler.id)
        frozenAt = state.tick;
    }
  }
  expect(frozenAt).toBeGreaterThan(0);
  expect(state.monsters).toContain(shambler);
  const x = shambler.x;
  for (let i = 0; i < 3 * STEPS_PER_SECOND; i++) step(state, []);
  expect(shambler.x).toBe(x);
  const expired: SimEvent[] = [];
  for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) expired.push(...step(state, []));
  expect(expired).toContainEqual({
    type: "ailmentExpired",
    targetId: shambler.id,
    ailment: "freeze",
  });
  for (let i = 0; i < STEPS_PER_SECOND; i++) step(state, []);
  expect(shambler.x).toBeLessThan(x);
});
