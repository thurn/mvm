import { describe, expect, test } from "vitest";
import { createRegistry, load, SAVE_SECTIONS, type SaveDocument } from "../../save/registry";
import { step } from "../kernel";
import { POLICIES } from "../policies/policies";
import { lockRoster } from "../economy/roster";
import { starterCard } from "../../heroes/model/starter";
import { SKILLS } from "../../heroes/board/kit";
import { startLevel } from "../../monsters/waves";
import type { LevelDefinition } from "../../monsters/levels/types";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { id } from "../../types/ids";
import type { SimEvent } from "../events";
import type { RoundState } from "../state";
import { STEPS_PER_SECOND } from "../time";
import { SIM_TUNING } from "../../tuning/sim";
import { TERRAIN_TUNING } from "../../tuning/terrain";
import roundV1 from "../../save/fixtures/round/v1.json";
import { generateTerrain, type TerrainTile } from ".";

/** A Level 4 shape (D §6.1): 5 lanes, 2 special tiles, Rock newly unlocked. */
const LEVEL_4ISH: LevelDefinition = {
  ...LEVEL_1,
  id: "test-level-4",
  index: 4,
  areaLevel: 5,
  lanes: [0, 1, 2, 3, 4],
  specialTiles: 2,
  terrainTypes: ["rock"],
  newTerrain: "rock",
};

function violations(tiles: TerrainTile[], lanes: readonly number[]): string[] {
  const t = TERRAIN_TUNING;
  const out: string[] = [];
  for (const lane of lanes) {
    const blocked = tiles.filter((x) => x.lane === lane && !t.placeable[x.kind]);
    if (SIM_TUNING.columns - blocked.length < t.minPlaceablePerLane)
      out.push(`lane ${lane}: too few placeable`);
    const early = blocked.filter((x) => x.column <= t.earlyColumns).length;
    if (t.earlyColumns - early < t.minPlaceableEarly) out.push(`lane ${lane}: too few early`);
    if (tiles.filter((x) => x.lane === lane && x.kind === "rock").length > t.maxRocksPerLane)
      out.push(`lane ${lane}: too many rocks`);
  }
  for (const x of tiles) {
    if (x.column === 1 && x.kind === "rock") out.push("rock in column 1");
    if (!lanes.includes(x.lane) || x.column < 1 || x.column > SIM_TUNING.columns)
      out.push("off board");
  }
  const keys = tiles.map((x) => `${x.lane}:${x.column}`);
  if (new Set(keys).size !== keys.length) out.push("two tiles on one square");
  return out;
}

describe("terrain and map generation (Appendix D §8)", () => {
  test("every generated map over 500 seeds keeps all four constraints, at the full count", () => {
    for (let seed = 1; seed <= 500; seed++) {
      for (const count of [2, 8]) {
        const tiles = generateTerrain({ ...LEVEL_4ISH, specialTiles: count }, seed);
        expect(violations(tiles, LEVEL_4ISH.lanes), `seed ${seed} count ${count}`).toEqual([]);
        if (count === 2) expect(tiles).toHaveLength(2);
      }
    }
  });

  test("a count that can't fit falls back to fewer tiles rather than breaking a constraint", () => {
    const tiles = generateTerrain({ ...LEVEL_4ISH, lanes: [2], specialTiles: 5 }, 3);
    expect(tiles.length).toBeLessThanOrEqual(TERRAIN_TUNING.maxRocksPerLane);
    expect(violations(tiles, [2])).toEqual([]);
  });

  test("the newest type appears on its intro level, and maps are reproducible per seed", () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(generateTerrain(LEVEL_4ISH, seed).some((x) => x.kind === "rock")).toBe(true);
      expect(generateTerrain(LEVEL_4ISH, seed)).toEqual(generateTerrain(LEVEL_4ISH, seed));
    }
    expect(generateTerrain(LEVEL_1, 1)).toEqual([]);
  });

  test("placing on Rock is refused with a reason, and the round's map is the stored one", () => {
    const state = startLevel(LEVEL_4ISH, 7);
    const rock = state.terrain[0]!;
    lockRoster(state, [starterCard(id<"Gem">(SKILLS.acolyte), 1, "terrain-acolyte")]);
    state.mana = 1000;
    const events = step(state, [
      { type: "place", cardId: "terrain-acolyte", lane: rock.lane, column: rock.column },
    ]);
    expect(events.find((e) => e.type === "placeRefused")).toMatchObject({ reason: "terrain" });
    expect(state.heroes).toHaveLength(0);
  });

  test("a round saved mid-wave reloads with the same tiles", () => {
    const state = startLevel(LEVEL_4ISH, 9);
    for (let i = 0; i < 30 * STEPS_PER_SECOND; i++) step(state, []);
    const doc: SaveDocument = {
      format: 1,
      savedAt: "",
      build: "test",
      account: { schemaVersion: 0, data: null },
      round: { schemaVersion: 1, data: JSON.parse(JSON.stringify(state)) },
    };
    const loaded = load(doc, createRegistry(SAVE_SECTIONS)).round as { data: RoundState };
    expect(loaded.data.terrain).toEqual(state.terrain);
    expect(loaded.data.terrain.length).toBe(2);
  });

  test("the v1 round fixture, which has no terrain, loads as an empty grid", () => {
    const raw = structuredClone(roundV1) as { schemaVersion: number; data: unknown };
    const doc: SaveDocument = {
      format: 1,
      savedAt: "",
      build: "test",
      account: { schemaVersion: 0, data: null },
      round: raw,
    };
    const loaded = load(doc, createRegistry(SAVE_SECTIONS)).round as { data: RoundState };
    expect(loaded.data.terrain).toEqual([]);
  });

  test("autoplay never tries to place on Rock", () => {
    for (const seed of [1, 2, 3]) {
      const state = startLevel(LEVEL_4ISH, seed);
      lockRoster(state, [starterCard(id<"Gem">(SKILLS.acolyte), 1, `rock-${seed}`)]);
      state.mana = 10_000;
      const policy = POLICIES.pvzOpener!;
      const refusals: string[] = [];
      for (let i = 0; i < 60 * STEPS_PER_SECOND; i++)
        for (const e of step(state, policy(state)))
          if (e.type === "placeRefused") refusals.push(e.reason);
      expect(refusals).not.toContain("terrain");
    }
  });

  test("about 5 s of planning: placement works from the first tick, and the first sky orb falls after 4 s", () => {
    const state = startLevel(LEVEL_4ISH, 4);
    lockRoster(state, [starterCard(id<"Gem">(SKILLS.acolyte), 1, "plan-acolyte")]);
    const lane = [0, 1, 2, 3, 4].find(
      (l) => !state.terrain.some((x) => x.lane === l && x.column === 1),
    )!;
    const first = step(state, [{ type: "place", cardId: "plan-acolyte", lane, column: 1 }]);
    expect(first.some((e) => e.type === "placed")).toBe(true);
    const events: SimEvent[] = [];
    while (!events.some((e) => e.type === "manaSpawn" && e.source === "sky"))
      events.push(...step(state, []));
    expect(state.tick / STEPS_PER_SECOND).toBeGreaterThanOrEqual(4);
  });
});
