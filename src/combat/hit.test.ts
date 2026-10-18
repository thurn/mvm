import { describe, expect, test } from "vitest";
import { makeActor } from "./actor";
import {
  attackBase,
  chanceToHit,
  convert,
  critChance,
  critMultiplier,
  gainAsExtra,
  rollHit,
  scale,
  spellBase,
  type SkillHit,
} from "./hit";
import { damageMap, type DamageMap } from "./damage";
import { ELEMENTS, type StatSheet } from "./stats";
import { seededRng } from "./test-rng";

const spear: SkillHit = {
  kind: "attack",
  tags: ["melee"],
  weaponClass: "spear",
  base: {},
  baseCrit: 5,
};

/** The appendix rounds each step to one decimal, so allow that much drift. */
function close(actual: DamageMap, expected: Partial<DamageMap>, tolerance = 0.1) {
  for (const [type, value] of Object.entries(expected)) {
    expect(Math.abs(actual[type as keyof DamageMap] - value), type).toBeLessThanOrEqual(tolerance);
  }
}

describe("Appendix A §10 worked hit example", () => {
  // Level 17 Rare Lightning Spear: Winged Spear 12–22 physical with 2–25 local lightning,
  // 165.25% attack damage, 80% skill conversion to lightning, Lightning Attunement (+25% of
  // all damage as extra lightning), +30% increased lightning, Elemental Armament II (25% more
  // elemental attack damage).
  const stats: StatSheet = { "damage_gained_as_lightning_%": 25, "lightning_damage_+%": 30 };
  const hit: SkillHit = {
    ...spear,
    base: attackBase(
      { physical: { min: 12, max: 22 }, lightning: { min: 2, max: 25 } },
      165.25,
      stats,
    ),
    conversion: { physical: { lightning: 80 } },
    more: [{ percent: 25, types: ELEMENTS, kind: "attack" }],
  };

  test.each([
    ["min", 0, [19.8, 3.3], [4.0, 19.2], [4.0, 25.0], [4.0, 40.6]],
    ["max", 1, [36.4, 41.3], [7.3, 70.4], [7.3, 89.8], [7.3, 146.0]],
  ] as const)("%s end of the range, step by step", (_end, at, base, converted, gained, scaled) => {
    const step1 = damageMap({
      physical: hit.base.physical!.min + at * (hit.base.physical!.max - hit.base.physical!.min),
      lightning: hit.base.lightning!.min + at * (hit.base.lightning!.max - hit.base.lightning!.min),
    });
    close(step1, { physical: base[0], lightning: base[1] });
    const step2 = convert(step1, hit.conversion, stats);
    close(step2, { physical: converted[0], lightning: converted[1] });
    const step3 = gainAsExtra(step2, stats);
    close(step3, { physical: gained[0], lightning: gained[1] });
    const step5 = scale(step3, hit, stats);
    close(step5, { physical: scaled[0], lightning: scaled[1] });
  });

  test("step 7: 376 accuracy against 38 evasion always hits", () => {
    expect(chanceToHit(376, 38)).toBe(1);
  });

  test("rolled at the midpoint without a crit, it averages the documented hit", () => {
    const rolled = rollHit(stats, hit, () => 0.5);
    expect(rolled.crit).toBe(false);
    close(rolled.damage, { physical: 5.6, lightning: 93.3 });
  });
});

describe("conversion and gained as extra", () => {
  test("skill conversion applies first and other conversion fills only what is left", () => {
    const out = convert(
      damageMap({ physical: 100 }),
      { physical: { lightning: 80 } },
      { "physical_converted_to_fire_%": 40 },
    );
    close(out, { physical: 0, lightning: 80, fire: 20 });
  });

  test("other conversion above 100% scales down proportionally", () => {
    const out = convert(damageMap({ physical: 100 }), undefined, {
      "physical_converted_to_fire_%": 90,
      "physical_converted_to_cold_%": 60,
    });
    close(out, { physical: 0, fire: 60, cold: 40 });
  });

  test("skill conversion above 100% scales down proportionally", () => {
    const out = convert(damageMap({ physical: 100 }), { physical: { fire: 100, cold: 100 } }, {});
    close(out, { physical: 0, fire: 50, cold: 50 });
  });

  test("converted damage scales only with its final type", () => {
    const stats: StatSheet = { "physical_damage_+%": 50, "cold_damage_+%": 10 };
    const hit: SkillHit = { ...spear, base: { physical: { min: 100, max: 100 } } };
    const converted = convert(damageMap({ physical: 100 }), { physical: { cold: 100 } }, stats);
    close(scale(converted, hit, stats), { physical: 0, cold: 110 });
  });

  test("gained as extra reads the post-conversion amount and adds on top", () => {
    const stats: StatSheet = { "physical_converted_to_fire_%": 50, "damage_gained_as_cold_%": 10 };
    const out = gainAsExtra(convert(damageMap({ physical: 100 }), undefined, stats), stats);
    close(out, { physical: 50, fire: 50, cold: 10 });
  });
});

describe("increased and more", () => {
  test("increased sums the stats that match the type, tags and weapon", () => {
    const stats: StatSheet = {
      "fire_damage_+%": 10,
      "elemental_damage_+%": 20,
      "attack_damage_+%": 30,
      "projectile_damage_+%": 40,
      "spear_damage_+%": 50,
      "spell_damage_+%": 1000,
      "melee_damage_+%": 1000,
      "bow_damage_+%": 1000,
    };
    const hit: SkillHit = { ...spear, tags: ["projectile"] };
    close(scale(damageMap({ physical: 100, fire: 100 }), hit, stats), {
      physical: 220,
      fire: 250,
    });
  });

  test("more multiplies and respects its type and kind limits", () => {
    const hit: SkillHit = {
      ...spear,
      more: [
        { percent: 50 },
        { percent: 100, types: ["fire"] },
        { percent: 1000, kind: "spell" },
        { percent: 1000, tags: ["area"] },
      ],
    };
    close(scale(damageMap({ physical: 10, fire: 10 }), hit, {}), { physical: 15, fire: 30 });
  });
});

describe("base damage (§4.1)", () => {
  test("attacks add global attack damage before the attack damage multiplier", () => {
    const base = attackBase({ physical: { min: 10, max: 20 } }, 150, {
      attack_added_fire_damage: { min: 2, max: 4 },
      spell_added_fire_damage: { min: 100, max: 100 },
    });
    expect(base).toEqual({ physical: { min: 15, max: 30 }, fire: { min: 3, max: 6 } });
  });

  test("spells add global spell damage scaled by effectiveness", () => {
    const base = spellBase({ cold: { min: 10, max: 10 } }, 50, {
      spell_added_cold_damage: { min: 4, max: 8 },
      attack_added_cold_damage: { min: 100, max: 100 },
    });
    expect(base).toEqual({ cold: { min: 12, max: 14 } });
  });
});

describe("accuracy (§4.4)", () => {
  test.each([
    [0, 1000, 0.05],
    [100, 0, 1],
    [100, 1000, (100 * 1.25) / (100 + 300)],
    [0, 0, 1],
  ])("accuracy %d against evasion %d", (accuracy, evasion, expected) => {
    expect(chanceToHit(accuracy, evasion)).toBeCloseTo(expected, 6);
  });
});

describe("critical hits (§4.5)", () => {
  test("crit chance scales base crit and clamps to 100%", () => {
    expect(critChance(spear, { "critical_strike_chance_+%": 100 })).toBeCloseTo(0.1);
    expect(critChance({ ...spear, baseCrit: 60 }, { "critical_strike_chance_+%": 100 })).toBe(1);
    expect(
      critChance(
        { ...spear, kind: "spell", baseCrit: 6 },
        { spell_base_critical_strike_chance: 2 },
      ),
    ).toBeCloseTo(0.08);
    expect(critChance({ ...spear, baseCrit: 6 }, { spell_base_critical_strike_chance: 2 })).toBe(
      0.06,
    );
  });

  test("a crit deals 2x by default and more with critical damage bonus", () => {
    expect(critMultiplier({})).toBe(2);
    expect(critMultiplier({ "critical_strike_multiplier_+": 50 })).toBe(2.5);
  });

  test("with a seeded RNG, crit frequency matches the chance and crits double damage", () => {
    const rng = seededRng(1234);
    const hit: SkillHit = { ...spear, base: { physical: { min: 10, max: 10 } }, baseCrit: 10 };
    let crits = 0;
    for (let i = 0; i < 10_000; i++) {
      const rolled = rollHit({}, hit, rng);
      expect(rolled.damage.physical).toBe(rolled.crit ? 20 : 10);
      if (rolled.crit) crits++;
    }
    expect(crits / 10_000).toBeGreaterThan(0.09);
    expect(crits / 10_000).toBeLessThan(0.11);
  });

  test("the same seed gives the same crits", () => {
    const hit: SkillHit = { ...spear, base: { physical: { min: 1, max: 9 } }, baseCrit: 30 };
    const run = () => {
      const rng = seededRng(7);
      return Array.from({ length: 50 }, () => rollHit({}, hit, rng));
    };
    expect(run()).toEqual(run());
  });
});

test("makeActor defaults thresholds to max life", () => {
  const actor = makeActor({ maxLife: 40 });
  expect(actor.life).toBe(40);
  expect(actor.stunThreshold).toBe(40);
  expect(actor.ailmentThreshold).toBe(40);
});
