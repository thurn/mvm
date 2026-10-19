import { describe, expect, test, vi } from "vitest";

// No ×5+ wall hero is in the catalog until plan 2.9, so the test adds one.
vi.mock("../heroes/model/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../heroes/model/catalog")>();
  return {
    ...actual,
    HERO_CATALOG: {
      ...actual.HERO_CATALOG,
      "MvM/Test/Wall": { ...actual.HERO_CATALOG["MvM/Heroes/EzomyteAcolyte"]!, lifeMultiplier: 8 },
    },
  };
});
import { makeActor } from "../combat/actor";
import type { SimEvent } from "../sim/events";
import { step } from "../sim/kernel";
import { addHero, createRound, type RoundState } from "../sim/state";
import { STEPS_PER_SECOND } from "../sim/time";
import { COMBAT_KNOBS } from "../tuning/combat";
import { archetype } from "./archetypes";
import { spawnRoll } from "./model";

const ROLLING_SLAM = "Metadata/Items/Gems/SkillGemRollingSlam";
/** A ×8 wall (Armour Breaker, B H05); the catalog's life multiplier decides walls. */
const WALL = "MvM/Test/Wall";

function board(): RoundState {
  return createRound({ seed: 1, lanes: [2], mana: 0 });
}

function leaper(state: RoundState, x = 6) {
  return spawnRoll(state, {
    archetypeId: "Leaper",
    rarity: "normal",
    affixes: [],
    areaLevel: 5,
    levelIndex: 4,
    lane: 2,
    x,
  })[0]!;
}

function hero(state: RoundState, column: number, skillId = ROLLING_SLAM) {
  return addHero(state, { lane: 2, column, skillId, actor: makeActor({ maxLife: 1e9 }) });
}

function run(state: RoundState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * STEPS_PER_SECOND); i++) events.push(...step(state, []));
  return events;
}

describe("the Goblin Leaper (Appendix D §2.2, plan 2.4)", () => {
  test("it leaps once, landing exactly one tile behind the first hero it reaches", () => {
    const state = board();
    const goblin = leaper(state);
    hero(state, 5);
    hero(state, 4);
    const events = run(state, 5);
    const leaps = events.filter((e) => e.type === "leap");
    expect(leaps).toHaveLength(1);
    expect(leaps[0]).toMatchObject({ monsterId: goblin.id, toX: 4 });
    // Landed on the second hero's tile: blocked there, no second leap.
    expect(goblin.x).toBeCloseTo(4, 5);
    expect(goblin.leapt).toBe(true);
  });

  test("a wall can't be leapt: the leaper stops and bites", () => {
    const state = board();
    const goblin = leaper(state);
    hero(state, 5, WALL);
    const events = run(state, 5);
    expect(events.some((e) => e.type === "leap")).toBe(false);
    expect(goblin.x).toBeCloseTo(5.5, 1);
    expect(events.some((e) => e.type === "hit" && e.sourceId === goblin.id)).toBe(true);
  });

  test("it walks at 3.0 s per tile, then 5.5 after the leap", () => {
    const state = board();
    const goblin = leaper(state, 9);
    expect(goblin.moveSpeed).toBeCloseTo(COMBAT_KNOBS.walkSecondsPerTile / 3);
    hero(state, 7);
    run(state, 8);
    expect(goblin.leapt).toBe(true);
    expect(goblin.moveSpeed).toBeCloseTo(
      COMBAT_KNOBS.walkSecondsPerTile / archetype("Leaper").leapSecondsPerTile!,
    );
  });

  test("a leap that would land past the gate leaks", () => {
    const state = board();
    leaper(state, 2);
    hero(state, 1);
    const events = run(state, 3);
    expect(events.some((e) => e.type === "leap")).toBe(true);
    expect(events.some((e) => e.type === "leak")).toBe(true);
    expect(state.monsters).toHaveLength(0);
  });
});
