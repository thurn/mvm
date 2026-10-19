import { describe, expect, test } from "vitest";
import { makeActor } from "../../combat/actor";
import { isPrimed } from "../../combat/ailments";
import type { SkillHit } from "../../combat/hit";
import { uniques } from "../../data/uniques";
import type { SimEvent } from "../../sim/events";
import { hashState } from "../../sim/hash";
import { step } from "../../sim/kernel";
import { addHero, addScripted, createRound, type RoundState } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { placeHero } from "../../heroes/board/place";
import { SKILLS } from "../../heroes/board/kit";
import { starterCard } from "../../heroes/model/starter";
import { id } from "../../types/ids";
import { buildMonster } from "../model";
import { spawnMonster } from "../../sim/state";
import { BOSS_TUNING } from "../../tuning/bosses";
import { spawnBoss, type BossMonster } from ".";

const M = BOSS_TUNING.BloatedMiller;

function board(seed = 1): RoundState {
  return createRound({ seed, lanes: [0, 1, 2, 3, 4], mana: 0 });
}

/** The Miller on lanes 2–3 at x, with its abilities far off unless a test starts one. */
function miller(state: RoundState, x = 9): BossMonster {
  const boss = spawnBoss(state, {
    bossId: "BloatedMiller",
    areaLevel: 6,
    levelIndex: 5,
    x,
    topLane: 2,
  });
  boss.boss.cooldowns = { grainSlam: 999, rottingBrood: 999 };
  return boss;
}

function wall(state: RoundState, lane: number, column: number) {
  return addHero(state, { lane, column, actor: makeActor({ maxLife: 1e9 }) });
}

function run(state: RoundState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * STEPS_PER_SECOND); i++) events.push(...step(state, []));
  return events;
}

const hammer = (physical: number): SkillHit => ({
  kind: "attack",
  tags: ["melee"],
  base: { physical: { min: physical, max: physical } },
  baseCrit: 0,
});

describe("bosses (Appendix D §7, §7.1)", () => {
  test("the Miller covers two lanes, and a hero in either one blocks it", () => {
    for (const lane of [2, 3]) {
      const state = board();
      const boss = miller(state, 6);
      expect(boss.boss.lanes).toEqual([2, 3]);
      wall(state, lane, 5);
      run(state, 10);
      expect(boss.x).toBeCloseTo(5.5, 1);
    }
    const state = board();
    const boss = miller(state, 6);
    wall(state, 4, 5);
    run(state, 10);
    expect(boss.x).toBeLessThan(5);
  });

  test("Grain Slam hits only its telegraphed 2×2 tiles, and only after the telegraph", () => {
    const state = board();
    const boss = miller(state, 7.2);
    // Standing still, 1.2 tiles from the nearest hero: nothing blocks it, so only the slam hits.
    boss.moveSpeed = 0;
    const onTile = [wall(state, 2, 6), wall(state, 3, 5)];
    const offTile = [wall(state, 4, 6), wall(state, 2, 4)];
    boss.boss.cooldowns.grainSlam = 0;
    const early = run(state, M.telegraphSeconds - 0.1);
    const telegraph = early.find((e) => e.type === "bossTelegraph");
    expect(telegraph).toMatchObject({ ability: "grainSlam", seconds: M.telegraphSeconds });
    expect(telegraph && "tiles" in telegraph ? telegraph.tiles : []).toEqual([
      { lane: 2, column: 5 },
      { lane: 2, column: 6 },
      { lane: 3, column: 5 },
      { lane: 3, column: 6 },
    ]);
    expect(early.filter((e) => e.type === "hit")).toEqual([]);
    const late = run(state, 0.3);
    const hitIds = late
      .filter((e) => e.type === "hit")
      .map((e) => (e as { targetId: string }).targetId);
    expect(hitIds.sort()).toEqual(onTile.map((h) => h.id).sort());
    for (const hero of offTile) expect(hitIds).not.toContain(hero.id);
  });

  test("Rotting Brood spawns three Shamblers: one per covered lane, plus one", () => {
    const state = board();
    const boss = miller(state);
    boss.boss.cooldowns.rottingBrood = 0;
    run(state, M.telegraphSeconds + 0.2);
    const brood = state.monsters.filter((m) => m.archetypeId === "Shambler");
    expect(brood).toHaveLength(3);
    const lanes = brood.map((m) => m.lane);
    expect(lanes).toContain(2);
    expect(lanes).toContain(3);
    expect(state.lanes).toContain(lanes.sort().at(-1));
  });

  test("the heavy-stun bar: a 30%-of-life threshold, Primed at 70%, then 3 s of no actions", () => {
    const state = board();
    const boss = miller(state, 7);
    expect(boss.actor.stunThreshold).toBeCloseTo(boss.actor.maxLife * M.stunThresholdOfLife);
    addScripted(state, {
      lane: 2,
      column: 3,
      everyTicks: STEPS_PER_SECOND,
      hit: hammer(boss.actor.maxLife * 0.005),
      actor: makeActor({ maxLife: 1, accuracy: 1e9 }),
    });
    boss.actor.ailments.heavyStunBuildup = 0.69;
    const primed = run(state, 1.05);
    expect(isPrimed(boss.actor, "unique")).toBe(true);
    expect(primed.filter((e) => e.type === "bossPrimed")).toHaveLength(1);

    boss.actor.ailments.heavyStunBuildup = 0.999;
    let stun: SimEvent | undefined;
    while (!stun) stun = step(state, []).find((e) => e.type === "stun");
    expect(stun).toMatchObject({ kind: "heavy", seconds: 3 });
    state.scripted = [];
    const x = boss.x;
    const cooldowns = { ...boss.boss.cooldowns };
    run(state, 2.9);
    expect(boss.x).toBe(x);
    expect(boss.boss.cooldowns).toEqual(cooldowns);
    run(state, 0.3);
    expect(boss.x).toBeLessThan(x);
  });

  test("bosses are immune to light stun", () => {
    const state = board();
    const boss = miller(state, 7);
    // 20%-of-life physical hits: anything but a boss would roll light stun on the ones that don't heavy-stun.
    addScripted(state, {
      lane: 2,
      column: 3,
      everyTicks: 5,
      hit: hammer(boss.actor.maxLife * 0.2),
      actor: makeActor({ maxLife: 1, accuracy: 1e9 }),
    });
    boss.actor.life = boss.actor.maxLife * 100;
    const events = run(state, 3);
    expect(events.some((e) => e.type === "stun" && e.kind === "heavy")).toBe(true);
    expect(events.some((e) => e.type === "stun" && e.kind === "light")).toBe(false);
  });

  test("Enrage at half life speeds the Miller up 30%, once", () => {
    const state = board();
    const boss = miller(state);
    const base = boss.moveSpeed;
    boss.actor.life = boss.actor.maxLife * 0.49;
    const events = run(state, 0.2);
    expect(events.filter((e) => e.type === "bossEnrage")).toHaveLength(1);
    expect(boss.moveSpeed).toBeCloseTo(base * (1 + M.enrageSpeedPercent / 100));
    run(state, 1);
    expect(boss.moveSpeed).toBeCloseTo(base * (1 + M.enrageSpeedPercent / 100));
  });

  test("its kill drops a unique from its pool and a rare hero, announced as one burst", () => {
    const pool = new Set(
      M.uniquePool.map((name) => uniques().find((u) => u.name === name)!.id as string),
    );
    for (const seed of [1, 2, 3, 4, 5]) {
      const state = board(seed);
      const boss = miller(state, 7);
      boss.actor.life = 1;
      addScripted(state, {
        lane: 3,
        column: 3,
        everyTicks: 1,
        hit: hammer(100),
        actor: makeActor({ maxLife: 1, accuracy: 1e9 }),
      });
      const events = run(state, 0.5);
      const drops = state.earned.map((e) => e.drop);
      const unique = drops.find((d) => d.kind === "item" && d.item.rarity === "unique");
      expect(unique && unique.kind === "item" ? pool.has(unique.item.uniqueId!) : false).toBe(true);
      expect(drops.some((d) => d.kind === "hero" && d.rarity === "rare")).toBe(true);
      const burst = events.find((e) => e.type === "lootBurst");
      expect(burst).toMatchObject({ sourceId: boss.id });
      expect(burst && "dropIds" in burst ? burst.dropIds : []).toEqual(
        state.earned.map((e) => e.dropId),
      );
    }
  });

  test("a projectile that strikes a boss beams and chains from the lane it struck (2.5r)", () => {
    const state = board(3);
    const boss = spawnBoss(state, {
      bossId: "BloatedMiller",
      areaLevel: 6,
      levelIndex: 5,
      x: 5,
      topLane: 3,
    });
    boss.boss.cooldowns = { grainSlam: 999, rottingBrood: 999 };
    boss.moveSpeed = 0;
    boss.actor.life = boss.actor.maxLife = 1e9;
    const far = spawnMonster(
      state,
      buildMonster({
        archetypeId: "Shambler",
        rarity: "normal",
        affixes: [],
        areaLevel: 1,
        levelIndex: 1,
        lane: 1,
        x: 5.2,
      }),
    );
    far.moveSpeed = 0;
    const archer = placeHero(
      state,
      starterCard(id<"Gem">(SKILLS.lightningArrow), 10, "beam"),
      4,
      1,
    );
    const events = run(state, 6);
    expect(
      events.some((e) => e.type === "hit" && e.sourceId === archer.id && e.targetId === boss.id),
    ).toBe(true);
    // Lane 1 is 3 lanes from lane 4, past the 2.67-tile beam radius; it's only 2 from the boss's top lane.
    expect(events.some((e) => e.type === "hit" && e.targetId === far.id)).toBe(false);
  });

  test("a leaked boss loses the level", () => {
    const state = board();
    miller(state, 1);
    const events = run(state, 10);
    expect(events.find((e) => e.type === "levelEnd")).toMatchObject({ result: "lost" });
    expect(state.result).toBe("lost");
  });

  test("a round saved mid-fight resumes with the boss's timers, telegraphs and bar", () => {
    const state = board(9);
    const boss = miller(state, 8);
    boss.boss.cooldowns = { grainSlam: 0.5, rottingBrood: 3 };
    wall(state, 2, 6);
    addScripted(state, {
      lane: 3,
      column: 2,
      everyTicks: 10,
      hit: hammer(boss.actor.maxLife * 0.02),
      actor: makeActor({ maxLife: 1, accuracy: 1e9 }),
    });
    run(state, 4);
    const resumed = JSON.parse(JSON.stringify(state)) as RoundState;
    run(state, 8);
    run(resumed, 8);
    expect(hashState(resumed)).toBe(hashState(state));
  });
});
