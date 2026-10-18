import { describe, expect, test } from "vitest";
import { starterCard } from "../../heroes/model/starter";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { startLevel } from "../../monsters/waves";
import { ECONOMY_TUNING } from "../../tuning/economy";
import { id } from "../../types/ids";
import type { SimEvent } from "../events";
import type { Intent } from "../intents";
import { step } from "../kernel";
import { createRound, type RoundState } from "../state";
import { STEPS_PER_SECOND } from "../time";
import { lockRoster } from "./roster";

const ACOLYTE = "MvM/Heroes/EzomyteAcolyte";
const LIGHTNING_ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";

function level1(seed: number): RoundState {
  const state = startLevel(LEVEL_1, seed);
  lockRoster(state, [
    starterCard(id<"Gem">(ACOLYTE), 1, "acolyte"),
    starterCard(id<"Gem">(LIGHTNING_ARROW), 1, "lightning-arrow"),
  ]);
  return state;
}

function runTo(state: RoundState, seconds: number, intents: Intent[] = []): SimEvent[] {
  const events: SimEvent[] = [];
  let first = true;
  while (state.tick < Math.round(seconds * STEPS_PER_SECOND)) {
    events.push(...step(state, first ? intents : []));
    first = false;
  }
  return events;
}

const place = (cardId: string, lane: number, column: number): Intent => ({
  type: "place",
  cardId,
  lane,
  column,
});

describe("Appendix E §2.3: the first minute", () => {
  test("a three-acolyte opener tracks the target shape", () => {
    const samples = {
      at0: [] as number[],
      at7: [] as number[],
      at15: [] as number[],
      at25: [] as number[],
    };
    for (let seed = 1; seed <= 40; seed++) {
      const state = level1(seed);
      expect(state.mana).toBe(150);
      runTo(state, 1 / 60, [place("acolyte", 1, 1)]);
      samples.at0.push(state.mana);
      runTo(state, 7.5);
      runTo(state, 7.5 + 1 / 60, [place("acolyte", 2, 1)]);
      samples.at7.push(state.mana);
      runTo(state, 15);
      runTo(state, 15 + 1 / 60, [place("acolyte", 3, 1)]);
      samples.at15.push(state.mana);
      runTo(state, 25);
      samples.at25.push(state.mana);
      expect(state.heroes).toHaveLength(3);
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(samples.at0)).toBe(100);
    // ~5 s sky +25, then the second acolyte: ~75.
    expect(mean(samples.at7)).toBeGreaterThan(60);
    expect(mean(samples.at7)).toBeLessThan(110);
    // ~8–12 s sky and the first orb, then the third acolyte: ~75.
    expect(mean(samples.at15)).toBeGreaterThan(55);
    expect(mean(samples.at15)).toBeLessThan(130);
    // Enough at the first wave for a 100-mana ranged hero, leaving ~0–25 (the starter sceptre's Spirit adds a little).
    expect(mean(samples.at25)).toBeGreaterThan(100);
    expect(mean(samples.at25)).toBeLessThan(200);
  });

  test("sky mana falls on PvZ's schedule: first at 4.25–7 s, then 4.25–6.99 s apart early on", () => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const spawns = runTo(state, 60).flatMap((e) =>
      e.type === "manaSpawn" && e.source === "sky" ? [e] : [],
    );
    expect(spawns.length).toBeGreaterThanOrEqual(7);
    expect(spawns.every((e) => e.amount === ECONOMY_TUNING.skyManaAmount)).toBe(true);
  });

  test("orbs auto-collect after a delay and mana never exceeds the cap", () => {
    const state = createRound({ seed: 3, lanes: [2], mana: ECONOMY_TUNING.manaCap - 10 });
    const events = runTo(state, 20);
    const spawn = events.find((e) => e.type === "manaSpawn")!;
    const collect = events.find((e) => e.type === "manaCollect")!;
    expect(collect).toMatchObject({ orbId: spawn.type === "manaSpawn" ? spawn.orbId : "" });
    expect(state.mana).toBe(ECONOMY_TUNING.manaCap);
  });
});

describe("placement rules (GDD §6.3)", () => {
  function refusals(events: SimEvent[]) {
    return events.flatMap((e) => (e.type === "placeRefused" ? [e.reason] : []));
  }

  test("refused for cost, recharge, occupancy, bounds and unknown cards", () => {
    const state = level1(1);
    expect(refusals(runTo(state, 1 / 60, [place("acolyte", 2, 1)]))).toEqual([]);
    expect(refusals(runTo(state, 2 / 60, [place("acolyte", 2, 2)]))).toEqual(["recharging"]);
    expect(refusals(runTo(state, 3 / 60, [place("lightning-arrow", 2, 1)]))).toEqual(["occupied"]);
    expect(refusals(runTo(state, 4 / 60, [place("lightning-arrow", 0, 3)]))).toEqual([
      "out-of-bounds",
    ]);
    expect(refusals(runTo(state, 5 / 60, [place("lightning-arrow", 2, 10)]))).toEqual([
      "out-of-bounds",
    ]);
    expect(refusals(runTo(state, 6 / 60, [place("nope", 2, 3)]))).toEqual(["unknown-card"]);
    state.mana = 50;
    expect(refusals(runTo(state, 7 / 60, [place("lightning-arrow", 2, 3)]))).toEqual(["cost"]);
    state.mana = 100;
    const events = runTo(state, 8 / 60, [place("lightning-arrow", 2, 3)]);
    expect(refusals(events)).toEqual([]);
    expect(events).toContainEqual(expect.objectContaining({ type: "placed", lane: 2, column: 3 }));
    expect(state.mana).toBe(0);
  });

  test("slow and very slow cards start the level recharging", () => {
    const state = createRound({ seed: 1, lanes: [2], mana: 500 });
    lockRoster(state, [starterCard(id<"Gem">(ACOLYTE), 1, "fast")]);
    expect(state.roster[0]!.rechargeLeft).toBe(0);
    expect(ECONOMY_TUNING.startRecharge.slow).toBe(20);
    expect(ECONOMY_TUNING.startRecharge.verySlow).toBe(35);
  });

  test("the shovel frees the tile with no refund", () => {
    const state = level1(1);
    runTo(state, 1 / 60, [place("acolyte", 2, 1)]);
    const manaAfterPlacing = state.mana;
    const events = runTo(state, 2 / 60, [{ type: "shovel", lane: 2, column: 1 }]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "shovelled", lane: 2, column: 1 }),
    );
    expect(state.heroes).toHaveLength(0);
    expect(state.mana).toBe(manaAfterPlacing);
  });

  test("the roster is locked: later changes to a card don't reach the round", () => {
    const state = createRound({ seed: 1, lanes: [2], mana: 500 });
    const card = starterCard(id<"Gem">(LIGHTNING_ARROW), 1, "la");
    lockRoster(state, [card]);
    card.hero.level = 30;
    expect(state.roster[0]!.card.hero.level).toBe(1);
  });

  test("setSpeed sets the round's speed", () => {
    const state = createRound({ seed: 1, lanes: [2], mana: 0 });
    runTo(state, 1 / 60, [{ type: "setSpeed", speed: 2 }]);
    expect(state.speed).toBe(2);
  });
});
