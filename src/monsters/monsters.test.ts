import { describe, expect, test } from "vitest";
import { makeActor } from "../combat/actor";
import { addScripted } from "../sim/state";
import { step } from "../sim/kernel";
import type { SimEvent } from "../sim/events";
import { STEPS_PER_SECOND } from "../sim/time";
import { COMBAT_KNOBS } from "../tuning/combat";
import { LEVEL_1 } from "./levels/level-1";
import { buildMonster } from "./model";
import { seededRng } from "../combat/test-rng";
import { MONSTER_AFFIXES } from "./affixes";
import { rollAffixes, rollRarity } from "./rarity";
import { generateWavePlan, startLevel, waveBudget } from "./waves";

describe("monster stat model (Appendix D §1)", () => {
  test("a white level 1 Shambler has 67.5 life and bites for 11.45 every second", () => {
    const m = buildMonster({
      archetypeId: "Shambler",
      rarity: "normal",
      affixes: [],
      areaLevel: 1,
      levelIndex: 1,
      lane: 2,
      x: 9.75,
    });
    expect(m.actor.maxLife).toBeCloseTo(15 * COMBAT_KNOBS.K_monsterLife);
    expect(m.attack!.hit.base.physical!.min).toBeCloseTo(9.16 * COMBAT_KNOBS.K_monsterDamage, 2);
    expect(m.attack!.seconds).toBe(1);
    expect(m.moveSpeed).toBe(1);
    expect(m.actor.armour).toBe(3);
    expect(m.actor.evasion).toBe(24);
    expect(m.actor.accuracy).toBe(32);
  });

  test("an area level 10 white Shambler has 301 life and bites for 25.6 (§1)", () => {
    const m = buildMonster({
      archetypeId: "Shambler",
      rarity: "normal",
      affixes: [],
      areaLevel: 10,
      levelIndex: 1,
      lane: 2,
      x: 9.75,
    });
    expect(Math.round(m.actor.maxLife)).toBe(302);
    expect(m.attack!.hit.base.physical!.min).toBeCloseTo(25.55, 1);
  });

  test("a magic Shambler's affixes modify its stats as listed (§3, §4)", () => {
    const m = buildMonster({
      archetypeId: "Shambler",
      rarity: "magic",
      affixes: [
        "MonsterExtraArmour1",
        "MonsterFireResistance1",
        "MonsterDamageGainedAsCold1",
        "MonsterExtraEnergyShield1",
      ],
      areaLevel: 1,
      levelIndex: 1,
      lane: 2,
      x: 9.75,
    });
    const life = 15 * 2 * COMBAT_KNOBS.K_monsterLife;
    expect(m.actor.maxLife).toBeCloseTo(life);
    expect(m.attack!.hit.base.physical!.min).toBeCloseTo(
      9.16 * 1.15 * COMBAT_KNOBS.K_monsterDamage,
      2,
    );
    expect(m.actor.armour).toBe(6);
    expect(m.actor.resist.fire).toBe(50);
    expect(m.actor.stats["maximum_fire_resistance_%"]).toBe(10);
    expect(m.actor.stats["damage_gained_as_cold_%"]).toBe(40);
    expect(m.actor.maxEs).toBeCloseTo(life * 0.25);
    expect(m.affixes).toEqual([
      "MonsterExtraArmour1",
      "MonsterFireResistance1",
      "MonsterDamageGainedAsCold1",
      "MonsterExtraEnergyShield1",
    ]);
  });
});

describe("Level 1's wave plan (Appendix D §5)", () => {
  const plan = generateWavePlan(LEVEL_1, 42);

  test("has 5 waves, the last a flag wave, with the first at 25 s", () => {
    expect(plan.waves).toHaveLength(5);
    expect(plan.waves.map((w) => w.flag)).toEqual([false, false, false, false, true]);
    expect(plan.waves[0]!.startSeconds).toBe(25);
    for (let i = 1; i < plan.waves.length; i++) {
      const gap = plan.waves[i]!.startSeconds - plan.waves[i - 1]!.startSeconds;
      expect(gap).toBeGreaterThanOrEqual(25);
      expect(gap).toBeLessThanOrEqual(31);
    }
  });

  test("spends each wave's budget on Shamblers within the level's lanes", () => {
    plan.waves.forEach((wave, w) => {
      expect(wave.monsters).toHaveLength(waveBudget(LEVEL_1, w, wave.flag));
      for (const m of wave.monsters) {
        expect(LEVEL_1.lanes).toContain(m.lane);
        expect(m.spawnOffsetSeconds).toBeGreaterThanOrEqual(0);
        expect(m.spawnOffsetSeconds).toBeLessThanOrEqual(4);
        expect(m.x).toBeGreaterThanOrEqual(9.75);
        expect(m.x).toBeLessThanOrEqual(10.25);
      }
    });
  });

  test("no lane gets more than 40% of a wave's points, or an even split where 40% can't hold the wave", () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const wave of generateWavePlan(LEVEL_1, seed).waves) {
        const total = wave.monsters.length;
        const cap = Math.max(0.4 * total, Math.ceil(total / LEVEL_1.lanes.length));
        for (const lane of LEVEL_1.lanes) {
          expect(wave.monsters.filter((m) => m.lane === lane).length).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  test("the same seed gives the same plan, and a different seed a different one", () => {
    expect(generateWavePlan(LEVEL_1, 42)).toEqual(plan);
    expect(generateWavePlan(LEVEL_1, 43)).not.toEqual(plan);
  });

  test("rarity rolls follow the level 1–3 mix (12% magic, 2% rare)", () => {
    const rng = seededRng(5);
    const counts = { normal: 0, magic: 0, rare: 0 };
    for (let i = 0; i < 20_000; i++) counts[rollRarity(LEVEL_1.index, rng)]++;
    expect(counts.magic / 20_000).toBeGreaterThan(0.11);
    expect(counts.magic / 20_000).toBeLessThan(0.13);
    expect(counts.rare / 20_000).toBeGreaterThan(0.015);
    expect(counts.rare / 20_000).toBeLessThan(0.025);
  });

  test("affixes roll once each, within the area level gate (§4)", () => {
    const rng = seededRng(6);
    for (let i = 0; i < 500; i++) {
      const magic = rollAffixes("magic", "Shambler", 1, rng);
      expect(magic).toHaveLength(1);
      const rare = rollAffixes("rare", "Shambler", 1, rng);
      expect(rare.length).toBeGreaterThanOrEqual(2);
      expect(rare.length).toBeLessThanOrEqual(4);
      expect(new Set(rare).size).toBe(rare.length);
      for (const affix of [...magic, ...rare])
        expect(MONSTER_AFFIXES[affix]!.requiredLevel).toBeLessThanOrEqual(1);
    }
    expect(rollAffixes("normal", "Shambler", 1, rng)).toEqual([]);
  });
});

function runUntil(
  state: ReturnType<typeof startLevel>,
  seconds: number,
  stop?: (e: SimEvent) => boolean,
) {
  const events: SimEvent[] = [];
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++) {
    const stepEvents = step(state, []);
    events.push(...stepEvents);
    if (stop && stepEvents.some(stop)) break;
    if (state.result) break;
  }
  return events;
}

describe("the wave runtime", () => {
  test("spawns exactly the stored plan, even after it was edited (P16)", () => {
    const state = startLevel(LEVEL_1, 7);
    const wave = state.waves!.plan.waves[0]!;
    for (const m of wave.monsters) m.lane = 3;
    const events = runUntil(state, 32);
    expect(events).toContainEqual({ type: "waveStart", wave: 0, flag: false });
    expect(state.monsters.length).toBe(wave.monsters.length);
    expect(state.monsters.every((m) => m.lane === 3)).toBe(true);
  });

  test("the early trigger fires at the life threshold, but never before 4 s", () => {
    const state = startLevel(LEVEL_1, 7);
    const plan = state.waves!.plan;
    const wave0 = plan.waves[0]!.startSeconds;
    runUntil(state, wave0 + 0.5);
    // Clear the wave half a second in: the trigger fires now, but the next wave waits 4 s after the first.
    state.monsters = [];
    state.waves!.pending = [];
    const events = runUntil(state, 10, (e) => e.type === "waveStart");
    expect(events.find((e) => e.type === "waveStart")).toEqual({
      type: "waveStart",
      wave: 1,
      flag: false,
    });
    const at = state.tick / STEPS_PER_SECOND;
    expect(at - wave0).toBeGreaterThanOrEqual(4 - 0.02);
    expect(at - wave0).toBeLessThan(4.1);
  });

  test("the early trigger waits until the wave falls to its life threshold, then 2 s", () => {
    const state = startLevel(LEVEL_1, 7);
    const plan = state.waves!.plan;
    runUntil(state, plan.waves[0]!.startSeconds + 4.5);
    const threshold = plan.waves[0]!.earlyTriggerFraction;
    expect(threshold).toBeGreaterThanOrEqual(0.5);
    expect(threshold).toBeLessThanOrEqual(0.65);
    expect(
      runUntil(state, 3, (e) => e.type === "waveStart").some((e) => e.type === "waveStart"),
    ).toBe(false);
    state.monsters = [];
    const killedAt = state.tick / STEPS_PER_SECOND;
    runUntil(state, 5, (e) => e.type === "waveStart");
    expect(state.tick / STEPS_PER_SECOND - killedAt).toBeCloseTo(2, 1);
  });

  test("warns 7.5 s before the flag wave", () => {
    const state = startLevel(LEVEL_1, 7);
    for (const wave of state.waves!.plan.waves) wave.monsters = [];
    const events: { e: SimEvent; t: number }[] = [];
    for (let i = 0; i < 200 * STEPS_PER_SECOND && !state.result; i++) {
      for (const e of step(state, [])) events.push({ e, t: state.tick / STEPS_PER_SECOND });
    }
    const warn = events.find((x) => x.e.type === "flagWarning")!;
    const flag = events.find((x) => x.e.type === "waveStart" && x.e.flag)!;
    expect(flag.t - warn.t).toBeCloseTo(7.5, 1);
  });

  test("scenario: Level 1's waves against a scripted wall end in levelEnd won", () => {
    const state = startLevel(LEVEL_1, 21);
    for (const lane of LEVEL_1.lanes) {
      addScripted(state, {
        lane,
        column: 3,
        everyTicks: 20,
        blocks: true,
        actor: makeActor({ maxLife: 1e9, accuracy: 500 }),
        hit: {
          kind: "attack",
          tags: ["projectile"],
          base: { physical: { min: 40, max: 40 } },
          baseCrit: 0,
        },
      });
    }
    const events = runUntil(state, 300);
    expect(events.filter((e) => e.type === "waveStart")).toHaveLength(5);
    expect(events.at(-1)).toEqual({ type: "levelEnd", result: "won" });
    expect(state.result).toBe("won");
    expect(state.life).toBe(20);
  });
});
