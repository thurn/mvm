import { describe, expect, test } from "vitest";
import { makeActor } from "../../combat/actor";
import { createStreams, streamRng } from "../../sim/rng";
import type { SimEvent } from "../../sim/events";
import { step } from "../../sim/kernel";
import { createRound, spawnMonster, type RoundState } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { id } from "../../types/ids";
import { generateHero, heroPool, unlockAreaLevel } from "../gen/generate";
import { starterCard } from "../model/starter";
import { SKILLS } from "./kit";
import { placeHero } from "./place";

const K = COMBAT_KNOBS.K_heroActionRate;

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
  for (let i = 0; i < seconds * STEPS_PER_SECOND; i++) events.push(...step(state, []));
  return events;
}

const place = (state: RoundState, skill: string, lane = 2, column = 2) =>
  placeHero(state, starterCard(id<"Gem">(skill), 1, `t-${skill}-${lane}`), lane, column);

const hitsOn = (events: SimEvent[], sourceId: string, targetId: string) =>
  events.filter((e) => e.type === "hit" && e.sourceId === sourceId && e.targetId === targetId);

describe("Phase 2 ranged heroes (Appendix B H16, H17, H19)", () => {
  test.each([
    // Spear only: its bolts never return to the main target.
    ["Lightning Spear", SKILLS.lightningSpear, 7.7 / 1.04],
    // 10 fragments of 1.2–2 per shot, one bolt per clip then a 0.8 s reload.
    ["Permafrost Bolts", SKILLS.permafrostBolts, (10 * 1.6) / (0.625 + 0.8)],
  ])("%s deals B §4's damage per second to one target", (_name, skill, raw) => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, skill);
    const target = dummy(state, 2, 6);
    const dealt = hitsOn(run(state, 300), hero.id, target.id).reduce(
      (sum, e) => sum + (e.type === "hit" ? e.dealt : 0),
      0,
    );
    expect(dealt / 300).toBeGreaterThan(raw * K * 0.92);
    expect(dealt / 300).toBeLessThan(raw * K * 1.15);
  });

  test("Lightning Spear's bolts strike up to 5 other monsters within 4.17 tiles, in any lane", () => {
    const state = createRound({ seed: 3, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const hero = place(state, SKILLS.lightningSpear);
    dummy(state, 2, 6);
    const near = [
      dummy(state, 0, 6),
      dummy(state, 1, 7),
      dummy(state, 3, 5),
      dummy(state, 4, 8),
      dummy(state, 2, 9),
    ];
    const far = dummy(state, 4, 9.9);
    const events = run(state, 3);
    for (const other of near)
      expect(hitsOn(events, hero.id, other.id).length, other.id).toBeGreaterThan(0);
    expect(hitsOn(events, hero.id, far.id)).toHaveLength(0);
  });

  test("Explosive Spear lodges, then detonates 2.5 s later across 2.33 tiles; one spear at a time", () => {
    const state = createRound({ seed: 3, lanes: [0, 1, 2, 3, 4], mana: 0 });
    const hero = place(state, SKILLS.explosiveSpear);
    const target = dummy(state, 2, 6);
    const twoLanesUp = dummy(state, 0, 6.2);
    const outside = dummy(state, 2, 8.6);
    const early = run(state, 2);
    expect(state.groundEffects.filter((g) => g.kind === "explosiveSpear")).toHaveLength(1);
    expect(hitsOn(early, hero.id, twoLanesUp.id)).toHaveLength(0);
    const late = run(state, 1.5);
    expect(hitsOn(late, hero.id, twoLanesUp.id).length).toBeGreaterThan(0);
    expect(hitsOn([...early, ...late], hero.id, outside.id)).toHaveLength(0);
    expect(hitsOn([...early, ...late], hero.id, target.id).length).toBeGreaterThan(0);
  });

  test("Permafrost Bolts' fragments carry 200% more freeze buildup: one volley builds half a Shambler's threshold", () => {
    const state = createRound({ seed: 3, lanes: [2], mana: 0 });
    const hero = place(state, SKILLS.permafrostBolts);
    expect(
      hero.kit?.behavior === "permafrostBolts" && hero.kit.hits.fragment.freezeMorePercent,
    ).toBe(200);
    // A Level 1 Shambler's life (15 × K_monsterLife), which is also its ailment threshold.
    const target = dummy(state, 2, 6, 15 * COMBAT_KNOBS.K_monsterLife);
    let volley = false;
    while (!volley)
      volley = step(state, []).some((e) => e.type === "hit" && e.targetId === target.id);
    expect(target.actor.ailments.freezeBuildup).toBeGreaterThan(0.45);
  });

  test("each hero drops only from its unlock area level (B §1.8)", () => {
    expect(unlockAreaLevel(SKILLS.lightningSpear)).toBe(3);
    expect(unlockAreaLevel(SKILLS.explosiveSpear)).toBe(1);
    expect(unlockAreaLevel(SKILLS.permafrostBolts)).toBe(1);
    for (const skill of [SKILLS.lightningSpear, SKILLS.explosiveSpear, SKILLS.permafrostBolts])
      expect(heroPool()).toContain(skill);
    const rng = streamRng(createStreams(6), "heroGen");
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++)
      seen.add(
        generateHero({
          areaLevel: 2,
          highestUnlocked: 2,
          rarityBonus: 0,
          roster: [],
          rng,
          id: id<"OwnedHero">(`g${i}`),
        }).skillId,
      );
    expect(seen).toContain(SKILLS.explosiveSpear);
    expect(seen).not.toContain(SKILLS.lightningSpear);
  });
});
