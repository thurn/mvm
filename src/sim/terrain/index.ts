import type { LevelDefinition } from "../../monsters/levels/types";
import { TERRAIN_TUNING } from "../../tuning/terrain";
import { createStreams, streamRng } from "../rng";
import type { RoundState } from "../state";

/** A special tile type (Appendix D §8.1). Later phases add Water, Shrine, Burning, Chilled and Grave. */
export type TileKind = keyof typeof TERRAIN_TUNING.placeable;

/** One special tile on the board; every other tile is plain ground. */
export interface TerrainTile {
  lane: number;
  column: number;
  kind: TileKind;
}

type Rng = () => number;

/** A seed per (round seed, level, count, attempt), so each try is reproducible (§8.2). */
function attemptRng(seed: number, levelIndex: number, count: number, attempt: number): Rng {
  const mixed = Math.imul(seed ^ (levelIndex * 0x9e3779b1) ^ (count << 16) ^ attempt, 0x85ebca6b);
  return streamRng(createStreams(mixed >>> 0), "waves");
}

/** Whether the map keeps every constraint of §8.2 step 3. */
function fits(tiles: readonly TerrainTile[], lanes: readonly number[]): boolean {
  const t = TERRAIN_TUNING;
  return lanes.every((lane) => {
    const own = tiles.filter((x) => x.lane === lane);
    const blocked = own.filter((x) => !t.placeable[x.kind]);
    const earlyBlocked = blocked.filter((x) => x.column <= t.earlyColumns).length;
    return (
      t.columns - blocked.length >= t.minPlaceablePerLane &&
      t.earlyColumns - earlyBlocked >= t.minPlaceableEarly &&
      own.filter((x) => x.kind === "rock").length <= t.maxRocksPerLane &&
      !own.some((x) => x.column === 1 && x.kind === "rock")
    );
  });
}

/** One try at placing `count` tiles: each draw retries its square until the map still fits. */
function attempt(level: LevelDefinition, count: number, rng: Rng): TerrainTile[] | null {
  const pick = <T>(values: readonly T[]) => values[Math.floor(rng() * values.length)]!;
  const kinds = Array.from({ length: count }, (_, i) =>
    i === 0 && level.newTerrain ? level.newTerrain : pick(level.terrainTypes),
  );
  const tiles: TerrainTile[] = [];
  for (const kind of kinds) {
    const open = level.lanes.flatMap((lane) =>
      Array.from({ length: TERRAIN_TUNING.columns }, (_, c) => ({
        lane,
        column: c + 1,
        kind,
      })).filter((tile) => !tiles.some((x) => x.lane === tile.lane && x.column === tile.column)),
    );
    let placed = false;
    while (open.length > 0) {
      const tile = open.splice(Math.floor(rng() * open.length), 1)[0]!;
      if (fits([...tiles, tile], level.lanes)) {
        tiles.push(tile);
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }
  return tiles;
}

/**
 * Generates a level's special tiles (Appendix D §8.2): draw the level's
 * count of types (the newest guaranteed once on its intro level), place
 * each without breaking a constraint, retry, then fall back to one fewer.
 * Called once at level start; the result is stored in the round (P16).
 */
export function generateTerrain(level: LevelDefinition, seed: number): TerrainTile[] {
  if (level.terrainTypes.length === 0) return [];
  for (let count = level.specialTiles; count > 0; count--)
    for (let i = 0; i < TERRAIN_TUNING.retries; i++) {
      const tiles = attempt(level, count, attemptRng(seed, level.index, count, i));
      if (tiles) return tiles.sort((a, b) => a.lane - b.lane || a.column - b.column);
    }
  return [];
}

/** Whether a hero may be placed on a square: not on a blocking special tile. */
export function placeableAt(state: RoundState, lane: number, column: number): boolean {
  const tile = state.terrain.find((x) => x.lane === lane && x.column === column);
  return !tile || TERRAIN_TUNING.placeable[tile.kind];
}
