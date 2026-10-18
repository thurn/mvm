import { describe, expect, test } from "vitest";
import { applyStep, beginLevel, newAccount } from "../../account/lifecycle";
import { step } from "../../sim/kernel";
import { POLICIES } from "../../sim/policies/policies";
import { STEPS_PER_SECOND } from "../../sim/time";
import { LEVEL_1 } from "./level-1";

const SEEDS = 20;
const MAX_SECONDS = 600;

/** One fresh account's Level 1 round with the PvZ-opener policy: did it win? */
function wins(focus: string, seed: number): boolean {
  const account = newAccount(focus);
  const round = beginLevel(account, LEVEL_1, seed);
  const policy = POLICIES.pvzOpener!;
  while (round.result === null && round.tick < MAX_SECONDS * STEPS_PER_SECOND)
    applyStep(account, round, step(round, policy(round)));
  return round.result === "won";
}

/** 1.38's bar: each focus's starter kit clears Level 1 on at least 90% of seeds. */
describe("Level 1 is clearable by every focus (1.38)", () => {
  test.each(["warrior", "ranger", "sorceress"])(
    "%s wins at least 18 of 20 seeds with the PvZ opener",
    (focus) => {
      let won = 0;
      for (let seed = 1; seed <= SEEDS; seed++) if (wins(focus, seed)) won++;
      expect(won / SEEDS).toBeGreaterThanOrEqual(0.9);
    },
    120_000,
  );
});

/** mason hv-7ic2.110: the spellcaster policy exercises every focus's spell in a real round. */
describe("the spellcaster autoplay policy", () => {
  test.each(["warrior", "ranger", "sorceress"])(
    "%s casts its spell at least twice in a Level 1 round, and the casts land",
    (focus) => {
      const account = newAccount(focus);
      const round = beginLevel(account, LEVEL_1, 1);
      const policy = POLICIES.spellcaster!;
      let casts = 0;
      let impacts = 0;
      while (round.result === null && round.tick < MAX_SECONDS * STEPS_PER_SECOND) {
        const events = step(round, policy(round));
        applyStep(account, round, events);
        casts += events.filter((e) => e.type === "cast").length;
        impacts += events.filter((e) => e.type === "spellImpact").length;
      }
      expect(casts).toBeGreaterThanOrEqual(2);
      expect(impacts).toBeGreaterThanOrEqual(casts);
      expect(round.result).toBe("won");
    },
  );
});
