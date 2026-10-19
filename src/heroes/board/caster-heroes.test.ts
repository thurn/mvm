import { describe, expect, test } from "vitest";
import { makeActor } from "../../combat/actor";
import type { SimEvent } from "../../sim/events";
import { lockRoster } from "../../sim/economy/roster";
import { step } from "../../sim/kernel";
import { createRound, spawnMonster, type RoundState } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { id } from "../../types/ids";
import { spellPool, unlockAreaLevel } from "../gen/generate";
import { starterCard } from "../model/starter";
import { SKILLS } from "./kit";
import { placeHero } from "./place";

const K = COMBAT_KNOBS.K_heroActionRate;
const FROST_BOMB = "Metadata/Items/Gems/SkillGemFrostBomb";

function dummy(state: RoundState, lane: number, x: number, life = 1e12) {
  return spawnMonster(state, {
    archetypeId: "Dummy",
    rarity: "normal",
    lane,
    x,
    moveSpeed: 0,
    actor: makeActor({ maxLife: life }),
  });
}

function run(state: RoundState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * STEPS_PER_SECOND); i++) events.push(...step(state, []));
  return events;
}

const place = (state: RoundState, skill: string, lane = 2, column = 2) =>
  placeHero(state, starterCard(id<"Gem">(skill), 1, `t-${skill}-${lane}-${column}`), lane, column);

const damageTo = (events: SimEvent[], sourceId: string, targetId: string) =>
  events
    .filter(
      (e) =>
        (e.type === "hit" || e.type === "dot") &&
        e.sourceId === sourceId &&
        e.targetId === targetId,
    )
    .reduce((sum, e) => sum + (e.type === "hit" ? e.dealt : e.type === "dot" ? e.amount : 0), 0);

describe("Phase 2 spellcasters and Frost Bomb (Appendix B H20, H21, H23, H25, S1)", () => {
  test.each([
    // The fireball hits its target; the explosion hits every *other* monster.
    ["Fireball", SKILLS.fireball, 10 / 1.2, 6],
    // Ice Nova crits 12% of the time (B H23), well above the ~5% the tolerance allows for.
    ["Ice Nova", SKILLS.iceNova, (7 / 1.0) * 1.12, 3.5],
  ])("%s deals B §4's single-target damage per second", (_name, skill, raw, x) => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, skill);
    const target = dummy(state, 2, x);
    const dps = damageTo(run(state, 300), hero.id, target.id) / 300;
    expect(dps).toBeGreaterThan(raw * K * 0.92);
    expect(dps).toBeLessThan(raw * K * 1.15);
  });

  test("Fireball explodes on the monsters within 1.42 tiles of its target, not further", () => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, SKILLS.fireball);
    dummy(state, 2, 6);
    const near = dummy(state, 1, 6.3);
    const far = dummy(state, 3, 7.2);
    const events = run(state, 5);
    expect(damageTo(events, hero.id, near.id)).toBeGreaterThan(0);
    expect(damageTo(events, hero.id, far.id)).toBe(0);
  });

  test("Flame Wall burns a column 2 tiles ahead, its lane ±2, at about 1.8 fire per second; up to 3 walls", () => {
    const state = createRound({ seed: 3, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const hero = place(state, SKILLS.flameWall, 2, 1);
    const inWall = dummy(state, 0, 3);
    const outside = dummy(state, 0, 5.6);
    const events = run(state, 4);
    const dps = damageTo(events, hero.id, inWall.id) / 4;
    expect(dps).toBeGreaterThan(1.8 * 0.5);
    expect(damageTo(events, hero.id, outside.id)).toBe(0);
    const walls = state.groundEffects.filter(
      (g) => g.kind === "flameWall" && g.sourceId === hero.id,
    );
    expect(walls.length).toBeGreaterThanOrEqual(1);
    expect(walls.length).toBeLessThanOrEqual(3);
    expect(walls.map((w) => w.x).sort()).toEqual([3, 4, 5].slice(0, walls.length));
  });

  test("Ice Nova casts only with a monster in reach, and hits all around it, behind and ±2 lanes", () => {
    const state = createRound({ seed: 3, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const hero = place(state, SKILLS.iceNova, 2, 4);
    const away = dummy(state, 2, 7.5);
    expect(run(state, 3).some((e) => e.type === "hit" && e.sourceId === hero.id)).toBe(false);
    const behind = dummy(state, 2, 2);
    const twoUp = dummy(state, 0, 4.4);
    const events = run(state, 3);
    expect(damageTo(events, hero.id, behind.id)).toBeGreaterThan(0);
    expect(damageTo(events, hero.id, twoUp.id)).toBeGreaterThan(0);
    expect(damageTo(events, hero.id, away.id)).toBe(0);
  });

  test("Essence Drain adds a 4 s chaos drain and prefers a monster not yet drained", () => {
    const state = createRound({ seed: 3, lanes: [2], mana: 0 });
    const hero = place(state, SKILLS.essenceDrain);
    const first = dummy(state, 2, 5);
    const second = dummy(state, 2, 6);
    const events = run(state, 2.5);
    expect(
      events.some((e) => e.type === "dot" && e.sourceId === hero.id && e.targetId === first.id),
    ).toBe(true);
    expect(first.drain?.secondsLeft).toBeGreaterThan(0);
    expect(damageTo(events, hero.id, second.id)).toBeGreaterThan(0);
  });

  test("Frost Bomb waits 4 s, then detonates a cold hit across its 3×3", () => {
    const state = createRound({ seed: 3, lanes: [0, 1, 2, 3, 4], mana: 1000 });
    lockRoster(state, [starterCard(id<"Gem">(FROST_BOMB), 1, "fb")]);
    state.roster[0]!.rechargeLeft = 0;
    const inside = dummy(state, 3, 6);
    const outside = dummy(state, 4, 7.6);
    const cast = step(state, [{ type: "cast", spellId: "fb", lane: 2, x: 5 }]);
    expect(cast.some((e) => e.type === "cast")).toBe(true);
    const early = run(state, 3.8);
    expect(early.some((e) => e.type === "hit" && e.targetId === inside.id)).toBe(false);
    const late = run(state, 0.5);
    const hit = late.find((e) => e.type === "hit" && e.targetId === inside.id);
    expect(hit && hit.type === "hit" ? hit.breakdown.cold : 0).toBeGreaterThan(0);
    expect(late.some((e) => e.type === "hit" && e.targetId === outside.id)).toBe(false);
  });

  test("unlock levels (B §1.8), and Frost Bomb joins the spell pool", () => {
    expect(
      [SKILLS.fireball, SKILLS.flameWall, SKILLS.iceNova, SKILLS.essenceDrain].map(unlockAreaLevel),
    ).toEqual([3, 1, 1, 3]);
    expect(spellPool()).toContain(FROST_BOMB);
    expect(unlockAreaLevel(FROST_BOMB)).toBe(1);
  });
});
