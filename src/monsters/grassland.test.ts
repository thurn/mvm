import { describe, expect, test } from "vitest";
import { applyHitAilments } from "../combat/ailments";
import { damageMap } from "../combat/damage";
import type { SkillHit } from "../combat/hit";
import { mitigate } from "../combat/mitigation";
import type { HitResult } from "../combat/resolve";
import { createRound } from "../sim/state";
import { archetype } from "./archetypes";
import { LEVEL_1 } from "./levels/level-1";
import { buildMonster, spawnRoll } from "./model";
import { generateWavePlan } from "./waves";

const roll = (archetypeId: string, lane = 2, x = 9) => ({
  archetypeId,
  rarity: "normal" as const,
  affixes: [],
  areaLevel: 3,
  levelIndex: 3,
  lane,
  x,
});

describe("Grassland archetypes (Appendix D §2, plan 2.3)", () => {
  test("a Swarm spawns as 3 rats in one lane, 0.3 tiles apart, each a third of a Shambler or so", () => {
    const state = createRound({ seed: 1, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const rats = spawnRoll(state, roll("Swarm", 3, 9.5));
    expect(rats).toHaveLength(3);
    expect(rats.map((r) => r.lane)).toEqual([3, 3, 3]);
    expect(rats.map((r) => r.x)).toEqual([9.5, 9.8, 10.1].map((x) => expect.closeTo(x, 9)));
    const shambler = buildMonster(roll("Shambler"));
    expect(rats[0]!.actor.maxLife).toBeCloseTo(shambler.actor.maxLife * 0.35);
    expect(state.monsters).toHaveLength(3);
    expect(spawnRoll(state, roll("Shambler"))).toHaveLength(1);
  });

  test("a Helmed Skeleton's armour eats physical hits until Fully Broken, then it takes 20% more", () => {
    const skeleton = buildMonster(roll("ArmouredLight")).actor;
    const shambler = buildMonster(roll("Shambler")).actor;
    const hit = damageMap({ physical: 20 });
    const armoured = mitigate(hit, {}, skeleton).physical;
    expect(armoured).toBeLessThan(mitigate(hit, {}, shambler).physical);

    const breaker: SkillHit = {
      kind: "attack",
      tags: ["melee"],
      base: { physical: { min: 1, max: 1 } },
      baseCrit: 0,
      armourBreak: 1e6,
    };
    const result: HitResult = {
      avoidedBy: null,
      crit: false,
      preMitigation: damageMap({ physical: 1 }),
      dealt: damageMap({ physical: 1 }),
      total: 1,
      esLost: 0,
      lifeLost: 1,
      killed: false,
    };
    const applied = applyHitAilments(skeleton, breaker, {}, result, {
      targetKind: "monster",
      rarity: "normal",
      heroMelee: true,
      sourceIsHero: true,
      rng: () => 0.99,
    });
    expect(applied.map((a) => a.ailment)).toContain("fullyBroken");
    expect(mitigate(hit, {}, skeleton).physical).toBeCloseTo(20 * 1.2);
  });

  test("elemental hits ignore its armour; it resists cold by 20%", () => {
    const skeleton = buildMonster(roll("ArmouredLight")).actor;
    expect(mitigate(damageMap({ fire: 20 }), {}, skeleton).fire).toBeCloseTo(20);
    expect(mitigate(damageMap({ cold: 20 }), {}, skeleton).cold).toBeCloseTo(16);
  });

  test("the wave budget charges 2 per Helmed Skeleton and 1 per Swarm pack", () => {
    expect(archetype("ArmouredLight").pointCost).toBe(2);
    expect(archetype("Swarm").pointCost).toBe(1);
    const level = {
      ...LEVEL_1,
      index: 3,
      waves: 8,
      archetypes: ["Shambler", "ArmouredLight", "Swarm"],
    };
    const plan = generateWavePlan(level, 5);
    for (const wave of plan.waves) {
      const points = wave.monsters.reduce((sum, m) => sum + archetype(m.archetypeId).pointCost, 0);
      expect(points).toBeGreaterThan(0);
    }
    const drawn = new Set(plan.waves.flatMap((w) => w.monsters.map((m) => m.archetypeId)));
    expect(drawn).toContain("ArmouredLight");
    expect(drawn).toContain("Swarm");
  });
});
