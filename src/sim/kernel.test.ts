import { describe, expect, test } from "vitest";
import { makeActor } from "../combat/actor";
import { COMBAT_KNOBS } from "../tuning/combat";
import { SIM_TUNING } from "../tuning/sim";
import { hashState } from "./hash";
import { step } from "./kernel";
import { STEPS_PER_SECOND } from "./time";
import { addHero, addScripted, createRound, spawnMonster } from "./state";
import { arrow, shambler } from "./test-fixtures";

function runSeconds(state: ReturnType<typeof createRound>, seconds: number) {
  const events = [];
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++) events.push(...step(state, []));
  return events;
}

function scriptedRound(seed: number) {
  const state = createRound({ seed, lanes: [1, 2, 3], mana: 150 });
  for (let i = 0; i < 10; i++) spawnMonster(state, shambler(1 + (i % 3), 9.75 + i * 0.4));
  addScripted(state, {
    lane: 2,
    column: 1,
    everyTicks: 50,
    hit: arrow,
    actor: makeActor({ maxLife: 42, accuracy: 100 }),
  });
  return state;
}

describe("determinism", () => {
  test("the same seed and intents give the same hash after 3,600 steps", () => {
    const a = scriptedRound(9);
    const b = scriptedRound(9);
    runSeconds(a, 60);
    runSeconds(b, 60);
    expect(hashState(a)).toBe(hashState(b));
    expect(a.tick).toBe(3600);
  });

  test("a different seed gives a different hash", () => {
    const a = scriptedRound(9);
    const b = scriptedRound(10);
    runSeconds(a, 60);
    runSeconds(b, 60);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  test("a JSON round trip keeps the hash and the future", () => {
    const a = scriptedRound(3);
    runSeconds(a, 10);
    const b = JSON.parse(JSON.stringify(a)) as typeof a;
    expect(hashState(b)).toBe(hashState(a));
    runSeconds(a, 10);
    runSeconds(b, 10);
    expect(hashState(b)).toBe(hashState(a));
  });

  test("hashState ignores key order", () => {
    expect(hashState({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(
      hashState({ b: [1, { d: 3, c: 2 }], a: 1 }),
    );
  });
});

describe("locomotion", () => {
  test("a monster walks one tile in walkSecondsPerTile seconds", () => {
    const state = createRound({ seed: 1, lanes: [2], mana: 0 });
    const monster = spawnMonster(state, shambler(2, 8));
    runSeconds(state, COMBAT_KNOBS.walkSecondsPerTile);
    expect(state.monsters[0]!.x).toBeCloseTo(7, 6);
    expect(state.monsters[0]!.id).toBe(monster.id);
  });

  test("a hero on the tile stops the monster", () => {
    const state = createRound({ seed: 1, lanes: [2], mana: 0 });
    addHero(state, { lane: 2, column: 5, actor: makeActor({ maxLife: 42 }) });
    spawnMonster(state, shambler(2, 6));
    runSeconds(state, 20);
    const x = state.monsters[0]!.x;
    expect(x).toBeLessThanOrEqual(5 + SIM_TUNING.blockReach);
    expect(x).toBeGreaterThan(5 + SIM_TUNING.blockReach - 0.01);
  });

  test("a hero in another lane does not stop the monster", () => {
    const state = createRound({ seed: 1, lanes: [1, 2], mana: 0 });
    addHero(state, { lane: 1, column: 5, actor: makeActor({ maxLife: 42 }) });
    spawnMonster(state, shambler(2, 6));
    runSeconds(state, 10);
    expect(state.monsters[0]!.x).toBeLessThan(5);
  });
});

describe("leaks and the life pool", () => {
  test.each([
    ["normal", 1],
    ["magic", 3],
    ["rare", 10],
    ["unique", 10],
    ["boss", 20],
  ] as const)("a %s leak costs %d life", (rarity, cost) => {
    const state = createRound({ seed: 1, lanes: [0], mana: 0 });
    const monster = spawnMonster(state, { ...shambler(0, 0.55), rarity });
    const events = runSeconds(state, 1);
    expect(events).toContainEqual({
      type: "leak",
      monsterId: monster.id,
      lane: 0,
      rarity,
      cost,
      lifeLeft: SIM_TUNING.startingLife - cost,
    });
    expect(state.monsters).toHaveLength(0);
    expect(state.life).toBe(SIM_TUNING.startingLife - cost);
  });

  test("life 0 emits levelEnd lost once and the round stops", () => {
    const state = createRound({ seed: 1, lanes: [0], mana: 0 });
    spawnMonster(state, { ...shambler(0, 0.55), rarity: "boss" });
    spawnMonster(state, shambler(0, 3));
    const events = runSeconds(state, 2);
    expect(events.filter((e) => e.type === "levelEnd")).toEqual([
      { type: "levelEnd", result: "lost" },
    ]);
    expect(state.result).toBe("lost");
    const tick = state.tick;
    expect(step(state, [])).toEqual([]);
    expect(state.tick).toBe(tick);
  });
});

describe("the scripted actor and dealHit", () => {
  test("hits the nearest monster every N ticks through resolveHit", () => {
    const state = createRound({ seed: 5, lanes: [2], mana: 0 });
    const monster = spawnMonster(state, shambler(2, 8));
    const scripted = addScripted(state, {
      lane: 2,
      column: 1,
      everyTicks: 30,
      hit: arrow,
      actor: makeActor({ maxLife: 42, accuracy: 100 }),
    });
    const events = runSeconds(state, 1);
    const hits = events.filter((e) => e.type === "hit");
    expect(hits).toHaveLength(2);
    const [first] = hits;
    expect(first).toMatchObject({
      sourceId: scripted.id,
      targetId: monster.id,
      lane: 2,
      targetMaxLife: monster.actor.maxLife,
      crit: expect.any(Boolean),
    });
    expect(first!.dealt).toBeGreaterThan(0);
    expect(first!.breakdown.physical).toBe(first!.dealt);
    expect(state.monsters[0]!.actor.life).toBeCloseTo(
      monster.actor.maxLife - hits.reduce((sum, h) => sum + h.dealt, 0),
      6,
    );
  });

  test("a killing hit emits kill and removes the monster", () => {
    const state = createRound({ seed: 5, lanes: [2], mana: 0 });
    const monster = spawnMonster(state, { ...shambler(2, 8), actor: makeActor({ maxLife: 1 }) });
    addScripted(state, {
      lane: 2,
      column: 1,
      everyTicks: 1,
      hit: arrow,
      actor: makeActor({ maxLife: 1, accuracy: 100 }),
    });
    const events = runSeconds(state, 1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "kill", targetId: monster.id, rarity: "normal" }),
    );
    expect(state.monsters).toHaveLength(0);
  });
});

describe("scenario: 10 Shamblers against a scripted actor", () => {
  function play(seed: number) {
    const state = scriptedRound(seed);
    const events = [];
    while (
      state.result === null &&
      state.monsters.length > 0 &&
      state.tick < 120 * STEPS_PER_SECOND
    ) {
      events.push(...step(state, []));
    }
    return { state, events };
  }

  test("runs to a deterministic outcome", () => {
    const a = play(11);
    const b = play(11);
    const kills = a.events.filter((e) => e.type === "kill").length;
    const leaks = a.events.filter((e) => e.type === "leak").length;
    expect(kills + leaks).toBe(10);
    expect(kills).toBeGreaterThan(0);
    expect(a.state.monsters).toHaveLength(0);
    expect(hashState(a.state)).toBe(hashState(b.state));
    expect(a.events).toEqual(b.events);
  });
});
