import { describe, expect, test } from "vitest";
import { makeActor } from "../actor";
import { damageMap } from "../damage";
import type { SkillHit } from "../hit";
import type { HitResult } from "../resolve";
import { constantRng } from "../test-rng";
import {
  applyHitAilments,
  chillMagnitude,
  effectiveSpeed,
  isImmobilised,
  isPrimed,
  lightStunChance,
  shockChance,
  tickAilments,
} from "./index";
import { AILMENT_TUNING } from "../../tuning/combat";

const coldHit: SkillHit = { kind: "attack", tags: ["melee"], base: {}, baseCrit: 0 };

function result(
  dealt: Partial<Record<"physical" | "fire" | "cold" | "lightning" | "chaos", number>>,
): HitResult {
  const map = damageMap(dealt);
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return {
    avoidedBy: null,
    crit: false,
    preMitigation: map,
    dealt: map,
    total,
    esLost: 0,
    lifeLost: total,
    killed: false,
  };
}

const monster = () => makeActor({ maxLife: 100 });
const ctx = (overrides = {}) => ({
  targetKind: "monster" as const,
  rarity: "normal" as const,
  heroMelee: false,
  sourceIsHero: false,
  rng: constantRng(0),
  ...overrides,
});

describe("shock (Appendix A §6.2)", () => {
  test("chance is 1% per 4% of the ailment threshold dealt as lightning", () => {
    expect(shockChance(4, 100, {})).toBeCloseTo(0.01);
    expect(shockChance(40, 100, {})).toBeCloseTo(0.1);
    expect(shockChance(40, 100, { "shock_chance_+%": 100 })).toBeCloseTo(0.2);
    expect(shockChance(1000, 100, {})).toBe(1);
  });

  test("a shocked target takes 20% increased damage for 8 s, then it expires", () => {
    const target = monster();
    const applied = applyHitAilments(target, coldHit, {}, result({ lightning: 50 }), ctx());
    expect(applied).toContainEqual(
      expect.objectContaining({ ailment: "shock", magnitude: 20, seconds: 8 }),
    );
    expect(target.damageTakenIncreased).toMatchObject({
      physical: 20,
      fire: 20,
      cold: 20,
      lightning: 20,
      chaos: 20,
    });
    expect(tickAilments(target, 7.9).expired).toEqual([]);
    expect(tickAilments(target, 0.2).expired).toEqual(["shock"]);
    expect(target.damageTakenIncreased.lightning ?? 0).toBe(0);
  });

  test("a missed roll applies nothing", () => {
    const target = monster();
    expect(
      applyHitAilments(
        target,
        coldHit,
        {},
        result({ lightning: 4 }),
        ctx({ rng: constantRng(0.5) }),
      ),
    ).toEqual([]);
  });
});

describe("chill and freeze (§6.2)", () => {
  test("chill magnitude scales with hit size, ignores chills under 30%, caps at 50%", () => {
    expect(chillMagnitude(2, 100, {})).toBe(0);
    expect(chillMagnitude(6, 100, {})).toBeCloseTo(30);
    expect(chillMagnitude(8, 100, {})).toBeCloseTo(40);
    expect(chillMagnitude(50, 100, {})).toBe(50);
  });

  test("chill slows walk and action speed, with less effect on tougher monsters and a 25% floor", () => {
    const target = monster();
    applyHitAilments(target, coldHit, {}, result({ cold: 50 }), ctx());
    expect(effectiveSpeed(target, "normal")).toBeCloseTo(0.5);
    expect(effectiveSpeed(target, "rare")).toBeCloseTo(1 - 0.5 * 0.7);
  });

  test("freeze buildup fills a meter; at 100% the target freezes for 4 s and can't act", () => {
    const target = monster();
    const hits = [];
    for (let i = 0; i < 9; i++)
      hits.push(...applyHitAilments(target, coldHit, {}, result({ cold: 12 }), ctx()));
    expect(hits.some((a) => a.ailment === "freeze")).toBe(true);
    expect(isImmobilised(target)).toBe(true);
    expect(effectiveSpeed(target, "normal")).toBe(0);
    tickAilments(target, 4.05);
    expect(isImmobilised(target)).toBe(false);
  });

  test("the freeze meter decays after 2 s without buildup", () => {
    const target = monster();
    applyHitAilments(target, coldHit, {}, result({ cold: 50 }), ctx());
    const meter = target.ailments.freezeBuildup;
    tickAilments(target, 1.9);
    expect(target.ailments.freezeBuildup).toBeCloseTo(meter);
    tickAilments(target, 3);
    expect(target.ailments.freezeBuildup).toBeLessThan(meter);
  });
});

describe("ignite (§6.1)", () => {
  test("burns for 20% of the hit's fire damage per second for 4 s, through fire resistance", () => {
    const target = makeActor({
      maxLife: 100,
      resist: { fire: 50, cold: 0, lightning: 0, chaos: 0 },
    });
    const applied = applyHitAilments(target, coldHit, {}, result({ fire: 100 }), ctx());
    expect(applied).toContainEqual(
      expect.objectContaining({ ailment: "ignite", magnitude: 20, seconds: 4 }),
    );
    const { dotDamage } = tickAilments(target, 1);
    expect(dotDamage).toBeCloseTo(10);
  });

  test("a stronger ignite replaces the current one; a weaker one is ignored", () => {
    // High life keeps stuns out of the way; the ailment threshold stays 100.
    const target = makeActor({ maxLife: 1000, ailmentThreshold: 100 });
    applyHitAilments(target, coldHit, {}, result({ fire: 100 }), ctx());
    tickAilments(target, 2);
    expect(applyHitAilments(target, coldHit, {}, result({ fire: 50 }), ctx())).toEqual([]);
    expect(target.ailments.ignite!.secondsLeft).toBeCloseTo(2);
    expect(applyHitAilments(target, coldHit, {}, result({ fire: 200 }), ctx())).toContainEqual(
      expect.objectContaining({ ailment: "ignite", magnitude: 40 }),
    );
    expect(target.ailments.ignite!.secondsLeft).toBeCloseTo(4);
  });
});

describe("stun (§6.3)", () => {
  test("light stun: damage over max life, physical 1.5×, hero melee 1.5× again, nothing under 15%", () => {
    expect(lightStunChance(result({ fire: 10 }), 100, false)).toBe(0);
    expect(lightStunChance(result({ fire: 20 }), 100, false)).toBeCloseTo(0.2);
    expect(lightStunChance(result({ physical: 20 }), 100, false)).toBeCloseTo(0.3);
    expect(lightStunChance(result({ physical: 20 }), 100, true)).toBeCloseTo(0.45);
    expect(lightStunChance(result({ physical: 200 }), 100, true)).toBe(1);
  });

  test("heavy buildup primes a monster at its rarity threshold; Crushing Blows then heavy-stuns it", () => {
    const target = monster();
    applyHitAilments(target, coldHit, {}, result({ fire: 45 }), ctx({ rng: constantRng(0.99) }));
    expect(isPrimed(target, "normal")).toBe(true);
    expect(isPrimed(target, "magic")).toBe(false);
    const applied = applyHitAilments(
      target,
      coldHit,
      { crushing_blows: 1 },
      result({ fire: 1 }),
      ctx({ rng: constantRng(0.99) }),
    );
    expect(applied).toContainEqual(
      expect.objectContaining({ ailment: "heavyStun", seconds: AILMENT_TUNING.heavyStunSeconds }),
    );
    expect(isImmobilised(target)).toBe(true);
  });

  test("a full heavy stun bar heavy-stuns for 3 s; heroes are never heavy stunned", () => {
    const target = monster();
    expect(
      applyHitAilments(
        target,
        coldHit,
        {},
        result({ physical: 80 }),
        ctx({ rng: constantRng(0.99) }),
      ),
    ).toContainEqual(expect.objectContaining({ ailment: "heavyStun" }));
    const hero = makeActor({ maxLife: 100 });
    expect(
      applyHitAilments(
        hero,
        coldHit,
        {},
        result({ physical: 80 }),
        ctx({ targetKind: "hero", rng: constantRng(0.99) }),
      ).some((a) => a.ailment === "heavyStun"),
    ).toBe(false);
  });

  test("a light stun interrupts the target's action", () => {
    const target = monster();
    const applied = applyHitAilments(
      target,
      coldHit,
      {},
      result({ physical: 40 }),
      ctx({ rng: constantRng(0) }),
    );
    expect(applied).toContainEqual(expect.objectContaining({ ailment: "lightStun" }));
  });
});

describe("Armour Break (§6.4)", () => {
  test("hero hits break 3× armour on normal monsters; at 0 it is Fully Broken for 12 s with 20% more physical taken", () => {
    const target = makeActor({ maxLife: 1000, armour: 30 });
    const hit: SkillHit = { ...coldHit, armourBreak: 4 };
    const breakIt = () =>
      applyHitAilments(target, hit, {}, result({ physical: 1 }), ctx({ sourceIsHero: true }));
    breakIt();
    expect(target.armour).toBe(30 - 4 * AILMENT_TUNING.heroArmourBreakVsNormal);
    breakIt();
    expect(target.armour).toBe(6);
    const applied = breakIt();
    expect(target.armour).toBe(0);
    expect(applied).toContainEqual(
      expect.objectContaining({ ailment: "fullyBroken", seconds: 12 }),
    );
    expect(target.damageTakenIncreased.physical).toBe(20);
    tickAilments(target, 12.1);
    expect(target.armour).toBe(30);
    expect(target.damageTakenIncreased.physical ?? 0).toBe(0);
  });
});
