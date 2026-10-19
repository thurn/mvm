import { describe, expect, test } from "vitest";
import { makeActor } from "../combat/actor";
import type { SimEvent } from "../sim/events";
import { hashState } from "../sim/hash";
import { step } from "../sim/kernel";
import { addHero, type RoundState } from "../sim/state";
import { placeableAt } from "../sim/terrain";
import { STEPS_PER_SECOND } from "../sim/time";
import { STRONGBOX_TUNING } from "../tuning/loot";
import { archetype } from "./archetypes";
import { LEVEL_1 } from "./levels/level-1";
import type { LevelDefinition } from "./levels/types";
import { startLevel, waveBudget } from "./waves";

const T = STRONGBOX_TUNING;

/** A Level 4 shape that may hold a Strongbox (D §6.1, §9). */
const LEVEL_4ISH: LevelDefinition = {
  ...LEVEL_1,
  id: "test-level-4",
  index: 4,
  areaLevel: 5,
  waves: 10,
  lanes: [0, 1, 2, 3, 4],
  specialTiles: 2,
  terrainTypes: ["rock"],
  newTerrain: "rock",
  strongboxes: true,
};

/** A round of that level that rolled a box. */
function withBox(seed = 1): RoundState {
  for (let s = seed; ; s++) {
    const state = startLevel(LEVEL_4ISH, s);
    if (state.strongbox) return state;
  }
}

function run(state: RoundState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * STEPS_PER_SECOND); i++) events.push(...step(state, []));
  return events;
}

const wall = (state: RoundState, lane: number, column: number) =>
  addHero(state, { lane, column, actor: makeActor({ maxLife: 1e9 }) });

describe("Strongboxes (Appendix D §9)", () => {
  test("a 25% chance from Level 4, never where the level disallows it, on a placeable tile in columns 5–7", () => {
    let boxes = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const state = startLevel(LEVEL_4ISH, seed);
      const box = state.strongbox;
      if (!box) continue;
      boxes++;
      expect(box.column).toBeGreaterThanOrEqual(T.columns[0]);
      expect(box.column).toBeLessThanOrEqual(T.columns[1]);
      expect(LEVEL_4ISH.lanes).toContain(box.lane);
      expect(state.terrain.some((x) => x.lane === box.lane && x.column === box.column)).toBe(false);
      expect(placeableAt(state, box.lane, box.column)).toBe(false);
    }
    expect(boxes / 1000).toBeGreaterThan(T.chance - 0.04);
    expect(boxes / 1000).toBeLessThan(T.chance + 0.04);
    for (let seed = 1; seed <= 100; seed++) {
      expect(startLevel({ ...LEVEL_4ISH, strongboxes: false }, seed).strongbox).toBeNull();
      expect(startLevel(LEVEL_1, seed).strongbox).toBeNull();
    }
  });

  test("only a hero on one of the 8 squares around it triggers it", () => {
    const state = withBox();
    const box = state.strongbox!;
    wall(state, box.lane, box.column - 2);
    expect(run(state, 0.5).some((e) => e.type === "strongboxTriggered")).toBe(false);
    const lane = state.lanes.includes(box.lane - 1) ? box.lane - 1 : box.lane + 1;
    wall(state, lane, box.column + 1);
    const events = run(state, 0.2);
    expect(events.filter((e) => e.type === "strongboxTriggered")).toHaveLength(1);
    expect(state.strongbox!.phase).toBe("ambush");
  });

  test("the ambush: 60% of the flag wave's budget, at least 1 rare and 2 magic, 70% near the box", () => {
    for (const seed of [1, 40, 80, 120]) {
      const state = withBox(seed);
      const box = state.strongbox!;
      wall(state, box.lane, box.column - 1);
      run(state, 0.2);
      const ids = new Set(state.strongbox!.ambushIds);
      const ambush = state.monsters.filter((m) => ids.has(m.id));
      const budget = waveBudget(LEVEL_4ISH, LEVEL_4ISH.waves - 1, true) * T.budgetShare;
      const points = ambush.reduce((sum, m) => sum + archetype(m.archetypeId).pointCost, 0);
      expect(points).toBeLessThanOrEqual(budget + 1e-9);
      expect(points).toBeGreaterThan(budget - 2);
      expect(ambush.filter((m) => m.rarity === "rare").length).toBeGreaterThanOrEqual(1);
      expect(ambush.filter((m) => m.rarity === "magic").length).toBeGreaterThanOrEqual(2);
      const near = [...state.lanes]
        .sort((a, b) => Math.abs(a - box.lane) - Math.abs(b - box.lane) || a - b)
        .slice(0, T.nearLanes);
      const nearPoints = ambush
        .filter((m) => near.includes(m.lane))
        .reduce((sum, m) => sum + archetype(m.archetypeId).pointCost, 0);
      expect(nearPoints / points).toBeGreaterThanOrEqual(T.nearLaneShare - 1e-9);
      for (const m of ambush) expect(m.x).toBeGreaterThanOrEqual(9);
    }
  });

  test("the reward comes only once the last ambush monster dies, as one burst", () => {
    const state = withBox(7);
    const box = state.strongbox!;
    wall(state, box.lane, box.column - 1);
    run(state, 0.2);
    const ambush = () => state.monsters.filter((m) => state.strongbox!.ambushIds.includes(m.id));
    // Everything but one ambusher falls: no reward yet.
    for (const m of ambush().slice(1)) m.actor.life = -1;
    state.monsters = state.monsters.filter((m) => m.actor.life > 0);
    expect(run(state, 0.2).some((e) => e.type === "lootBurst")).toBe(false);
    expect(state.earned).toHaveLength(0);
    state.monsters = state.monsters.filter((m) => !state.strongbox!.ambushIds.includes(m.id));
    const events = run(state, 0.2);
    const burst = events.find((e) => e.type === "lootBurst");
    expect(burst).toMatchObject({ lane: box.lane, x: box.column });
    const drops = state.earned.map((e) => e.drop);
    expect(drops.some((d) => d.kind === "item" && d.item.rarity === "rare")).toBe(true);
    expect(
      drops.filter((d) => d.kind === "hero" || d.kind === "spell" || d.kind === "item").length,
    ).toBe(T.reward.rareItems + T.reward.itemRolls + T.reward.heroRolls);
    for (const d of drops)
      if (d.kind === "item") expect(d.item.itemLevel).toBe(LEVEL_4ISH.areaLevel + 1);
    expect(state.strongbox!.phase).toBe("opened");
    expect(placeableAt(state, box.lane, box.column)).toBe(true);
  });

  test("a lost level loses the reward", () => {
    const state = withBox(3);
    const box = state.strongbox!;
    wall(state, box.lane, box.column - 1);
    run(state, 0.2);
    state.life = 1;
    const events = run(state, 120);
    expect(events.find((e) => e.type === "levelEnd")).toMatchObject({ result: "lost" });
    expect(events.some((e) => e.type === "lootBurst")).toBe(false);
  });

  test("a save mid-ambush resumes with the ambush and the chest", () => {
    const state = withBox(11);
    const box = state.strongbox!;
    wall(state, box.lane, box.column - 1);
    run(state, 3);
    const resumed = JSON.parse(JSON.stringify(state)) as RoundState;
    run(state, 10);
    run(resumed, 10);
    expect(hashState(resumed)).toBe(hashState(state));
  });
});
