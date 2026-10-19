import { describe, expect, test } from "vitest";
import { makeActor } from "../../combat/actor";
import { buildMonster } from "../../monsters/model";
import type { SimEvent } from "../../sim/events";
import { step } from "../../sim/kernel";
import { createRound, spawnMonster, type RoundState } from "../../sim/state";
import { STEPS_PER_SECOND } from "../../sim/time";
import { COMBAT_KNOBS } from "../../tuning/combat";
import { id } from "../../types/ids";
import { createStreams, streamRng } from "../../sim/rng";
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

const place = (state: RoundState, skill: string, lane = 2, column = 2, level = 1) =>
  placeHero(
    state,
    starterCard(id<"Gem">(skill), level, `t-${skill}-${lane}-${column}`),
    lane,
    column,
  );

describe("Phase 2 melee and acolyte heroes (Appendix B H03, H05, H06, H11)", () => {
  // Raw PoE2 single-target DPS from each hero's level 1 reference row; crits add up to ~5%.
  test.each([
    ["Armour Breaker", SKILLS.armourBreaker, 4 / 0.86],
    ["Boneshatter's strike", SKILLS.boneshatter, 15.5 / 1.52],
    ["Fangs of Frost", SKILLS.fangsOfFrost, 6.65 / 0.74],
  ])("%s deals B §4's damage per second", (_name, skill, raw) => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, skill);
    const target = dummy(state, 2, 3);
    const dealt = run(state, 300)
      .filter((e) => e.type === "hit" && e.sourceId === hero.id && e.targetId === target.id)
      .reduce((sum, e) => sum + (e.type === "hit" ? e.dealt : 0), 0);
    expect(dealt / 300).toBeGreaterThan(raw * K * 0.92);
    expect(dealt / 300).toBeLessThan(raw * K * 1.15);
  });

  test("the Shrinewarden makes an orb every 30 s (37.5 mana with its sceptre's 100 Spirit) and has B's ×4 life (200 at hero 1)", () => {
    const state = createRound({ seed: 3, lanes: [2], mana: 0 });
    const warden = place(state, SKILLS.shrinewarden);
    expect(warden.actor.maxLife).toBeCloseTo(200, 5);
    const orbs = run(state, 125).filter(
      (e) => e.type === "manaSpawn" && e.source === "acolyte" && e.x === warden.column,
    );
    const times = orbs.length;
    expect(times).toBeGreaterThanOrEqual(4);
    expect(times).toBeLessThanOrEqual(5);
    for (const orb of orbs)
      expect(orb.type === "manaSpawn" && orb.amount).toBeCloseTo(25 * (1 + 100 / 200));
  });

  test("Armour Breaker's strikes take a Helmed Skeleton to Fully Broken", () => {
    const state = createRound({ seed: 3, lanes: [2], mana: 0 });
    place(state, SKILLS.armourBreaker, 2, 2, 3);
    const skeleton = spawnMonster(
      state,
      buildMonster({
        archetypeId: "ArmouredLight",
        rarity: "normal",
        affixes: [],
        areaLevel: 2,
        levelIndex: 2,
        lane: 2,
        x: 3,
      }),
    );
    skeleton.moveSpeed = 0;
    skeleton.actor.life = skeleton.actor.maxLife = 1e9;
    const events = run(state, 20);
    expect(
      events.some(
        (e) =>
          e.type === "ailmentApplied" && e.ailment === "fullyBroken" && e.targetId === skeleton.id,
      ),
    ).toBe(true);
  });

  test("Boneshatter builds no stun itself, but heavy-stuns a Primed target and shockwaves around it", () => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, SKILLS.boneshatter);
    const target = dummy(state, 2, 3);
    const neighbour = dummy(state, 3, 3.2);
    run(state, 6);
    expect(target.actor.ailments.heavyStunBuildup).toBe(0);
    target.actor.ailments.heavyStunBuildup = 0.45; // Primed at 40% for a normal monster
    const events = run(state, 3);
    expect(events.find((e) => e.type === "stun" && e.targetId === target.id)).toMatchObject({
      kind: "heavy",
    });
    expect(
      events.some((e) => e.type === "hit" && e.sourceId === hero.id && e.targetId === neighbour.id),
    ).toBe(true);
  });

  test("Fangs of Frost: a blocked attacker is Off Balance, and the next stab explodes around it", () => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    const hero = place(state, SKILLS.fangsOfFrost);
    const target = dummy(state, 2, 3);
    const neighbour = dummy(state, 1, 3.2);
    const quiet = run(state, 3);
    expect(quiet.some((e) => e.type === "hit" && e.targetId === neighbour.id)).toBe(false);
    target.offBalance = true;
    const events = run(state, 3);
    expect(
      events.some((e) => e.type === "hit" && e.sourceId === hero.id && e.targetId === neighbour.id),
    ).toBe(true);
    expect(target.offBalance).toBe(false);

    // A hero with a shield marks the monster whose attack it blocks.
    const blockState = createRound({ seed: 4, lanes: [2], mana: 0 });
    const shielded = place(blockState, SKILLS.fangsOfFrost);
    shielded.actor.blockChance = 100;
    delete shielded.kit;
    const biter = spawnMonster(
      blockState,
      buildMonster({
        archetypeId: "Shambler",
        rarity: "normal",
        affixes: [],
        areaLevel: 1,
        levelIndex: 1,
        lane: 2,
        x: 2.4,
      }),
    );
    run(blockState, 3);
    expect(biter.offBalance).toBe(true);
  });

  test("each hero drops only from its unlock area level (B §1.8)", () => {
    expect(unlockAreaLevel(SKILLS.boneshatter)).toBe(1);
    expect(unlockAreaLevel(SKILLS.armourBreaker)).toBe(3);
    expect(unlockAreaLevel(SKILLS.fangsOfFrost)).toBe(3);
    expect(unlockAreaLevel(SKILLS.shrinewarden)).toBe(5);
    for (const skill of [
      SKILLS.boneshatter,
      SKILLS.armourBreaker,
      SKILLS.fangsOfFrost,
      SKILLS.shrinewarden,
    ])
      expect(heroPool()).toContain(skill);
    const rng = streamRng(createStreams(5), "heroGen");
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const hero = generateHero({
        areaLevel: 2,
        highestUnlocked: 2,
        rarityBonus: 0,
        roster: [],
        rng,
        id: id<"OwnedHero">(`g-${i}`),
      });
      seen.add(hero.skillId);
    }
    expect(seen).toContain(SKILLS.boneshatter);
    for (const late of [SKILLS.armourBreaker, SKILLS.fangsOfFrost, SKILLS.shrinewarden])
      expect(seen).not.toContain(late);
  });
});
