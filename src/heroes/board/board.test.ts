import { describe, expect, test } from "vitest";
import { makeActor } from "../../combat/actor";
import { COMBAT_KNOBS } from "../../tuning/combat";
import type { SimEvent } from "../../sim/events";
import { step } from "../../sim/kernel";
import { addHero, createRound, spawnMonster, type RoundState } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { id } from "../../types/ids";
import { starterCard } from "../model/starter";
import { placeHero } from "./place";

const LIGHTNING_ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";
const APR = "Metadata/Items/Gem/SkillGemArmourPiercingRounds";
const SPARK = "Metadata/Items/Gems/SkillGemSpark";
const ROLLING_SLAM = "Metadata/Items/Gems/SkillGemRollingSlam";
const FALLING_THUNDER = "Metadata/Items/Gems/SkillGemFallingThunder";
const ICE_STRIKE = "Metadata/Items/Gems/SkillGemIceStrike";
const ACOLYTE = "MvM/Heroes/EzomyteAcolyte";

/** A monster that never dies, moves or defends, to measure raw damage. */
function dummy(state: RoundState, lane: number, x: number) {
  return spawnMonster(state, {
    archetypeId: "Dummy",
    rarity: "normal",
    lane,
    x,
    moveSpeed: 0,
    actor: makeActor({ maxLife: 1e12 }),
  });
}

function run(state: RoundState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++) events.push(...step(state, []));
  return events;
}

function heroDps(skillId: string, dummyX: number, seconds = 300) {
  const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
  const hero = placeHero(state, starterCard(id<"Gem">(skillId), 1), 2, 2);
  const target = dummy(state, 2, dummyX);
  const dealt = run(state, seconds)
    .filter((e) => e.type === "hit" && e.sourceId === hero.id && e.targetId === target.id)
    .reduce((sum, e) => sum + (e.type === "hit" ? e.dealt : 0), 0);
  return dealt / seconds;
}

describe("Appendix B §4 damage per second, after K_heroActionRate", () => {
  const K = COMBAT_KNOBS.K_heroActionRate;
  // Raw PoE2 single-target DPS from the §4 table; crits add up to ~5% on top.
  test.each([
    ["Lightning Arrow", LIGHTNING_ARROW, 6, 6.5],
    ["Armour Piercing Rounds", APR, 6, 12.1],
    ["Spark", SPARK, 6, 7.9],
    ["Rolling Slam", ROLLING_SLAM, 3.5, 18.3],
    ["Ice Strike", ICE_STRIKE, 3, 11.6],
    // 11.2 from the slam, plus one 300% volley bolt per 3 slams through the target's lane.
    ["Falling Thunder", FALLING_THUNDER, 3.5, 11.2 + (9.5 * 3) / (3 * 1.19)],
  ])("%s", (_name, skillId, x, raw) => {
    const dps = heroDps(skillId, x);
    expect(dps).toBeGreaterThan(raw * K * 0.92);
    expect(dps).toBeLessThan(raw * K * 1.15);
  });
});

describe("projectile modifiers (Appendix A §3.4)", () => {
  function shooter(numbers: Record<string, number>) {
    const state = createRound({ seed: 5, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const hero = placeHero(state, starterCard(id<"Gem">(APR), 1), 2, 1);
    Object.assign(hero.kit!.numbers, numbers);
    return { state, hero };
  }
  const hitTargets = (events: SimEvent[], sourceId: string) =>
    new Set(
      events
        .filter((e) => e.type === "hit" && e.sourceId === sourceId)
        .map((e) => e.type === "hit" && e.targetId),
    );

  test("pierce 1 hits the first two monsters in the lane, not the third", () => {
    const { state, hero } = shooter({ pierce: 1, clip: 1 });
    const a = dummy(state, 2, 4);
    const b = dummy(state, 2, 5);
    const c = dummy(state, 2, 6);
    const hit = hitTargets(run(state, 1.5), hero.id);
    expect(hit.has(a.id) && hit.has(b.id)).toBe(true);
    expect(hit.has(c.id)).toBe(false);
  });

  test("fork splits into the lanes above and below at the hit point", () => {
    const { state, hero } = shooter({ fork: 1, clip: 1 });
    const first = dummy(state, 2, 4);
    const above = dummy(state, 1, 5);
    const below = dummy(state, 3, 5);
    const behindLane = dummy(state, 2, 6);
    const hit = hitTargets(run(state, 1.5), hero.id);
    expect([...hit].sort()).toEqual([first.id, above.id, below.id].sort());
    expect(hit.has(behindLane.id)).toBe(false);
  });

  test("chain jumps to the nearest unhit monster within 2 tiles, in any lane", () => {
    const { state, hero } = shooter({ chain: 1, clip: 1 });
    const first = dummy(state, 2, 4);
    const near = dummy(state, 3, 4.5);
    const far = dummy(state, 0, 7);
    const hit = hitTargets(run(state, 1.5), hero.id);
    expect(hit.has(first.id) && hit.has(near.id)).toBe(true);
    expect(hit.has(far.id)).toBe(false);
  });

  test("+2 projectiles fan into the lanes above and below", () => {
    const { state, hero } = shooter({ additionalProjectiles: 2, clip: 1 });
    const own = dummy(state, 2, 4);
    const above = dummy(state, 1, 4);
    const below = dummy(state, 3, 4);
    const hit = hitTargets(run(state, 1.5), hero.id);
    expect([...hit].sort()).toEqual([own.id, above.id, below.id].sort());
  });

  test("Lightning Arrow beams reach two extra monsters near the target", () => {
    const state = createRound({ seed: 5, lanes: [1, 2, 3], mana: 0 });
    const hero = placeHero(state, starterCard(id<"Gem">(LIGHTNING_ARROW), 1), 2, 1);
    const target = dummy(state, 2, 5);
    const n1 = dummy(state, 1, 5.5);
    const n2 = dummy(state, 3, 5.5);
    const hit = hitTargets(run(state, 3), hero.id);
    expect(hit.has(target.id) && hit.has(n1.id) && hit.has(n2.id)).toBe(true);
  });
});

describe("the Ezomyte Acolyte (Appendix B H01)", () => {
  test("drops a Spirit-scaled orb every 24 s after a 3–12.5 s first orb", () => {
    const state = createRound({ seed: 9, lanes: [2], mana: 0 });
    const hero = placeHero(state, starterCard(id<"Gem">(ACOLYTE), 1), 2, 1);
    const orbs: { tick: number; amount: number }[] = [];
    for (let i = 0; i < 100 * STEPS_PER_SECOND; i++) {
      for (const e of step(state, [])) {
        if (e.type === "manaSpawn") {
          expect(e).toMatchObject({ source: "acolyte", lane: 2, x: 1 });
          orbs.push({ tick: state.tick, amount: e.amount });
        }
      }
    }
    expect(hero.kit!.behavior).toBe("acolyte");
    const first = orbs[0]!.tick / STEPS_PER_SECOND;
    expect(first).toBeGreaterThanOrEqual(3);
    expect(first).toBeLessThanOrEqual(12.5 + 1 / STEPS_PER_SECOND);
    for (let i = 1; i < orbs.length; i++) {
      expect((orbs[i]!.tick - orbs[i - 1]!.tick) / STEPS_PER_SECOND).toBeCloseTo(24, 1);
    }
    // A starter Rattling Sceptre has 100 Spirit: 25 × (1 + 100 / 200).
    expect(orbs[0]!.amount).toBe(37.5);
  });
});

describe("heroes taking damage", () => {
  test("a wall holds a Shambler for roughly 40 s, then dies and frees the tile", () => {
    const state = createRound({ seed: 2, lanes: [2], mana: 0 });
    // A level 1 wall (Armour Breaker, ×8 life): 464 life (Appendix B §1.4).
    const wall = addHero(state, { lane: 2, column: 3, actor: makeActor({ maxLife: 464 }) });
    spawnMonster(state, {
      archetypeId: "Shambler",
      rarity: "normal",
      lane: 2,
      x: 4,
      moveSpeed: 1,
      actor: makeActor({ maxLife: 67.5 }),
      attack: {
        seconds: 1,
        timer: 1,
        hit: {
          kind: "attack",
          tags: ["melee"],
          base: {
            physical: {
              min: 9.16 * COMBAT_KNOBS.K_monsterDamage,
              max: 9.16 * COMBAT_KNOBS.K_monsterDamage,
            },
          },
          baseCrit: 0,
        },
      },
    });
    let diedAt = -1;
    for (let i = 0; i < 60 * STEPS_PER_SECOND && diedAt < 0; i++) {
      for (const e of step(state, []))
        if (e.type === "kill" && e.targetId === wall.id) diedAt = state.tick;
    }
    const seconds = diedAt / STEPS_PER_SECOND;
    expect(seconds).toBeGreaterThan(36);
    expect(seconds).toBeLessThan(44);
    expect(state.heroes).toHaveLength(0);
    const xAtDeath = state.monsters[0]!.x;
    run(state, 2);
    expect(state.monsters[0]!.x).toBeLessThan(xAtDeath);
  });
});

test("ranged heroes hold fire until a monster is on the lawn", () => {
  const state = createRound({ seed: 5, lanes: [2], mana: 0 });
  const hero = placeHero(state, starterCard(id<"Gem">(LIGHTNING_ARROW), 1), 2, 2);
  dummy(state, 2, 9.75);
  expect(run(state, 2).some((e) => e.type === "hit" && e.sourceId === hero.id)).toBe(false);
});
