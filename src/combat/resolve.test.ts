import { describe, expect, test } from "vitest";
import { COMBAT_KNOBS } from "../tuning/combat";
import { makeActor } from "./actor";
import type { SkillHit } from "./hit";
import { resolveHit } from "./resolve";
import { ELEMENTS } from "./stats";
import { constantRng } from "./test-rng";

const bow: SkillHit = {
  kind: "attack",
  tags: ["projectile"],
  weaponClass: "bow",
  base: {},
  baseCrit: 5,
};

describe("resolveHit", () => {
  test("Appendix A §10: the spear lands for ~94 against a magic Plated Skeleton", () => {
    const attacker = makeActor({
      maxLife: 500,
      accuracy: 376,
      stats: { "damage_gained_as_lightning_%": 25, "lightning_damage_+%": 30 },
    });
    const target = makeActor({ maxLife: 2560, armour: 840, evasion: 38 });
    const hit: SkillHit = {
      kind: "attack",
      tags: ["melee"],
      weaponClass: "spear",
      base: { physical: { min: 19.83, max: 36.355 }, lightning: { min: 3.305, max: 41.3125 } },
      baseCrit: 5,
      conversion: { physical: { lightning: 80 } },
      more: [{ percent: 25, types: ELEMENTS, kind: "attack" }],
    };
    const result = resolveHit(attacker, target, hit, constantRng(0.5));
    expect(result.avoidedBy).toBeNull();
    expect(result.crit).toBe(false);
    expect(result.dealt.physical).toBeCloseTo(0.56, 1);
    expect(result.dealt.lightning).toBeCloseTo(93.3, 0);
    expect(result.total).toBeCloseTo(94, 0);
    expect(result.lifeLost).toBeCloseTo(result.total, 6);
    expect(result.killed).toBe(false);
  });

  test("the same weapon unconverted is gutted by the plate", () => {
    const attacker = makeActor({ maxLife: 500, accuracy: 376 });
    const target = makeActor({ maxLife: 2560, armour: 840 });
    const hit: SkillHit = { ...bow, base: { physical: { min: 28, max: 28 } } };
    const result = resolveHit(attacker, target, hit, constantRng(0.5));
    expect(result.dealt.physical).toBeCloseTo(7, 0);
  });

  test("an evaded attack deals nothing", () => {
    const attacker = makeActor({ maxLife: 10, accuracy: 0 });
    const target = makeActor({ maxLife: 10, evasion: 1000 });
    const hit: SkillHit = { ...bow, base: { physical: { min: 5, max: 5 } } };
    const result = resolveHit(attacker, target, hit, constantRng(0.5));
    expect(result.avoidedBy).toBe("evade");
    expect(result.total).toBe(0);
    expect(result.lifeLost).toBe(0);
    expect(result.preMitigation.physical).toBe(5);
  });

  test("spells can't be evaded but can be blocked", () => {
    const attacker = makeActor({ maxLife: 10, accuracy: 0 });
    const target = makeActor({ maxLife: 10, evasion: 1000, blockChance: 80 });
    const spell: SkillHit = { ...bow, kind: "spell", base: { fire: { min: 5, max: 5 } } };
    expect(resolveHit(attacker, target, spell, constantRng(0.49)).avoidedBy).toBe("block");
    expect(resolveHit(attacker, target, spell, constantRng(0.5)).avoidedBy).toBeNull();
    const unblockable = { ...spell, unblockable: true };
    expect(resolveHit(attacker, target, unblockable, constantRng(0)).avoidedBy).toBeNull();
  });

  test("a killing hit reports the kill", () => {
    const attacker = makeActor({ maxLife: 10 });
    const target = makeActor({ maxLife: 10, maxEs: 5 });
    const hit: SkillHit = { ...bow, base: { cold: { min: 20, max: 20 } } };
    const result = resolveHit(attacker, target, hit, constantRng(0.5));
    expect(result).toMatchObject({ esLost: 5, lifeLost: 10, killed: true });
  });

  test("resolveHit does not mutate its inputs", () => {
    const attacker = makeActor({ maxLife: 10 });
    const target = makeActor({ maxLife: 10, maxEs: 5 });
    const before = structuredClone(target);
    resolveHit(
      attacker,
      target,
      { ...bow, base: { cold: { min: 20, max: 20 } } },
      constantRng(0.5),
    );
    expect(target).toEqual(before);
  });
});

describe("Appendix A §1.3 calibration", () => {
  test("a level 1 starter bow hero kills a white Shambler in 8–10 hits", () => {
    const hero = makeActor({ maxLife: 42, accuracy: 100 });
    let shambler = makeActor({ maxLife: 15 * COMBAT_KNOBS.K_monsterLife });
    const arrow: SkillHit = { ...bow, base: { physical: { min: 7, max: 9 } } };
    let hits = 0;
    while (shambler.life > 0 && hits < 100) {
      const result = resolveHit(hero, shambler, arrow, constantRng(0.5));
      shambler = { ...shambler, life: shambler.life - result.lifeLost };
      hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(8);
    expect(hits).toBeLessThanOrEqual(10);
  });

  test("a level 1 Shambler kills an unarmoured squishy hero in about 3.7 s", () => {
    const K = COMBAT_KNOBS.K_monsterDamage;
    const shambler = makeActor({ maxLife: 67.5, accuracy: 100 });
    const hero = makeActor({ maxLife: 42 });
    const bite: SkillHit = {
      kind: "attack",
      tags: ["melee"],
      base: { physical: { min: 9.16 * K, max: 9.16 * K } },
      baseCrit: 5,
    };
    const perHit = resolveHit(shambler, hero, bite, constantRng(0.5)).lifeLost;
    const secondsToKill = hero.maxLife / perHit; // one bite per second
    expect(secondsToKill).toBeGreaterThan(3.4);
    expect(secondsToKill).toBeLessThan(4.0);
  });
});
