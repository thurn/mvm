import { describe, expect, test } from "vitest";
import { createRound, spawnMonster } from "./state";
import {
  distance,
  laneFirst,
  laneMostAdvanced,
  monstersWithin,
  nearbyMostAdvanced,
  tilesInCircle,
} from "./targeting";
import { shambler } from "./test-fixtures";

function board() {
  const state = createRound({ seed: 1, lanes: [0, 1, 2, 3, 4], mana: 0 });
  const ids = {
    a: spawnMonster(state, shambler(2, 3)).id,
    b: spawnMonster(state, shambler(2, 6)).id,
    c: spawnMonster(state, shambler(2, 8.5)).id,
    d: spawnMonster(state, shambler(1, 4)).id,
    e: spawnMonster(state, shambler(4, 2)).id,
  };
  return { state, ids };
}

test("distance is hypot(dx, dLane)", () => {
  expect(distance({ lane: 0, x: 0 }, { lane: 3, x: 4 })).toBe(5);
});

describe("laneFirst", () => {
  test("picks the lane's smallest x at or ahead of the hero within range", () => {
    const { state, ids } = board();
    expect(laneFirst(state, 2, 4, 9)?.id).toBe(ids.b);
    expect(laneFirst(state, 2, 3, 9)?.id).toBe(ids.a);
    expect(laneFirst(state, 2, 4, 1)).toBeUndefined();
    expect(laneFirst(state, 0, 1, 9)).toBeUndefined();
  });
});

describe("laneMostAdvanced", () => {
  test("picks the lane's monster closest to the gate within range", () => {
    const { state, ids } = board();
    expect(laneMostAdvanced(state, 2, 5, 9)?.id).toBe(ids.a);
    expect(laneMostAdvanced(state, 2, 7, 1.5)?.id).toBe(ids.b);
  });
});

describe("nearbyMostAdvanced", () => {
  test("picks the most advanced monster in any lane within the radius", () => {
    const { state, ids } = board();
    expect(nearbyMostAdvanced(state, 2, 4, 1.5)?.id).toBe(ids.a);
    expect(nearbyMostAdvanced(state, 1, 5, 1.2)?.id).toBe(ids.d);
    expect(nearbyMostAdvanced(state, 3, 3, 1.5)?.id).toBe(ids.e);
    expect(nearbyMostAdvanced(state, 0, 9, 0.5)).toBeUndefined();
  });
});

describe("monstersWithin", () => {
  test("returns every monster within the radius across lanes", () => {
    const { state, ids } = board();
    const found = monstersWithin(state, 2, 4, 1.5).map((m) => m.id);
    expect(found.sort()).toEqual([ids.a, ids.d].sort());
  });
});

describe("tilesInCircle", () => {
  test("returns the board tiles whose centres are within the radius", () => {
    const state = createRound({ seed: 1, lanes: [0, 1, 2, 3, 4], mana: 0 });
    expect(tilesInCircle(state, 0, 1, 1)).toEqual([
      { lane: 0, column: 1 },
      { lane: 0, column: 2 },
      { lane: 1, column: 1 },
    ]);
    expect(tilesInCircle(state, 2, 5, 0.4)).toEqual([{ lane: 2, column: 5 }]);
  });

  test("skips lanes the level doesn't use", () => {
    const state = createRound({ seed: 1, lanes: [1, 2, 3], mana: 0 });
    expect(tilesInCircle(state, 1, 5, 1).map((t) => t.lane)).not.toContain(0);
  });
});
