import { describe, expect, test } from "vitest";
import { makeActor } from "./actor";
import { damageMap } from "./damage";
import {
  applyToPools,
  armourReduction,
  cappedBlockChance,
  effectiveResistance,
  maxResistance,
  mitigate,
} from "./mitigation";

describe("armour (§5.2)", () => {
  test.each([
    [0, 10, 0],
    [100, 10, 100 / 200],
    [89, 1, 89 / 99],
    [90, 1, 0.9],
    [91, 1, 0.9],
    [100_000, 1, 0.9],
    [100, 0, 0],
  ])("armour %d against a %d physical hit", (armour, hit, expected) => {
    expect(armourReduction(armour, hit)).toBeCloseTo(expected, 6);
  });
});

describe("resistances and penetration (§5.2)", () => {
  test.each([
    [74, 75, 0, 74],
    [75, 75, 0, 75],
    [76, 75, 0, 75],
    [80, 85, 0, 80],
    [75, 75, 20, 55],
    [10, 75, 20, 0],
    [-20, 75, 10, -20],
  ])("resist %d with max %d and penetration %d", (resist, max, pen, expected) => {
    expect(effectiveResistance(resist, max, pen)).toBe(expected);
  });

  test("maximum resistance is 75% by default and hard-capped at 90%", () => {
    expect(maxResistance("fire", {})).toBe(75);
    expect(maxResistance("fire", { "maximum_fire_resistance_%": 10 })).toBe(85);
    expect(maxResistance("fire", { "maximum_fire_resistance_%": 20 })).toBe(90);
    expect(maxResistance("chaos", {})).toBe(75);
  });
});

describe("block (§5.1)", () => {
  test.each([
    [49, 0.49],
    [50, 0.5],
    [51, 0.5],
    [100, 0.5],
  ])("block chance %d", (chance, expected) => {
    expect(cappedBlockChance(chance)).toBeCloseTo(expected, 6);
  });
});

describe("mitigate", () => {
  test("applies armour, resistances with penetration, and damage taken", () => {
    const target = makeActor({
      maxLife: 100,
      armour: 100,
      resist: { fire: 50, cold: 0, lightning: 80, chaos: -10 },
      damageTakenIncreased: { fire: 20 },
    });
    const out = mitigate(
      damageMap({ physical: 10, fire: 100, lightning: 100, chaos: 100 }),
      { "fire_penetration_%": 10, "elemental_penetration_%": 5 },
      target,
    );
    expect(out.physical).toBeCloseTo(10 * (1 - 100 / 200));
    expect(out.fire).toBeCloseTo(100 * (1 - 0.35) * 1.2);
    expect(out.lightning).toBeCloseTo(100 * (1 - 0.7));
    expect(out.chaos).toBeCloseTo(110);
  });
});

describe("energy shield before life (§5.4)", () => {
  test("ES absorbs first and the rest reaches life", () => {
    const target = makeActor({ maxLife: 100, maxEs: 30 });
    expect(applyToPools(target, damageMap({ fire: 50 }))).toEqual({ esLost: 30, lifeLost: 20 });
  });

  test("chaos removes twice as much ES", () => {
    const target = makeActor({ maxLife: 100, maxEs: 30 });
    expect(applyToPools(target, damageMap({ chaos: 10 }))).toEqual({ esLost: 20, lifeLost: 0 });
    expect(applyToPools(target, damageMap({ chaos: 20 }))).toEqual({ esLost: 30, lifeLost: 5 });
  });

  test("life loss stops at the target's remaining life", () => {
    const target = makeActor({ maxLife: 100, life: 15 });
    expect(applyToPools(target, damageMap({ physical: 40 }))).toEqual({ esLost: 0, lifeLost: 15 });
  });
});
