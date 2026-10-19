import { occupies } from "../sim/targeting";
import { SIM_TUNING } from "../tuning/sim";
import type { MonsterState, RoundState } from "../sim/state";
import type { Tile } from "../sim/targeting";

/** A spell's grid shape (Appendix B §6.1): whole tiles, read at a glance. */
export type SpellShape = { kind: "column" } | { kind: "square"; size: number };

/** The level's tiles a shape covers around a target tile, in lane then column order. */
export function shapeTiles(
  shape: SpellShape,
  lane: number,
  column: number,
  lanes: readonly number[],
): Tile[] {
  const tiles: Tile[] = [];
  const half = shape.kind === "square" ? Math.floor(shape.size / 2) : 0;
  for (const l of [...lanes].sort((a, b) => a - b)) {
    if (shape.kind === "square" && Math.abs(l - lane) > half) continue;
    for (let c = 1; c <= SIM_TUNING.columns; c++) {
      if (Math.abs(c - column) <= half) tiles.push({ lane: l, column: c });
    }
  }
  return tiles;
}

/** Monsters standing on any of the tiles: same lane, and x within the tile. */
export function monstersOnTiles(state: RoundState, tiles: readonly Tile[]): MonsterState[] {
  return state.monsters.filter((m) =>
    tiles.some((t) => occupies(m, t.lane) && Math.abs(m.x - t.column) <= 0.5),
  );
}
