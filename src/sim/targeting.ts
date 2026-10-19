import { SIM_TUNING } from "../tuning/sim";
import type { MonsterState, RoundState } from "./state";

/** A point on the board: a discrete lane and a continuous x in tiles. */
export interface BoardPoint {
  lane: number;
  x: number;
}

export interface Tile {
  lane: number;
  column: number;
}

/** Board distance, with lanes one tile apart (Appendix A §1.1). */
export function distance(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(a.x - b.x, a.lane - b.lane);
}

/** Whether a monster stands in a lane: a boss stands in every lane it covers (D §7). */
export function occupies(monster: MonsterState, lane: number): boolean {
  return monster.boss ? monster.boss.lanes.includes(lane) : monster.lane === lane;
}

/** Lanes between a monster and a lane: 0 for any lane a boss covers. */
export function laneGap(monster: MonsterState, lane: number): number {
  const lanes = monster.boss?.lanes ?? [monster.lane];
  return Math.min(...lanes.map((l) => Math.abs(l - lane)));
}

function mostAdvanced(monsters: MonsterState[]): MonsterState | undefined {
  let best: MonsterState | undefined;
  for (const monster of monsters) if (!best || monster.x < best.x) best = monster;
  return best;
}

/** `LaneFirst(range)`: the lane's monster with the smallest x at or ahead of `fromX`, within range. */
export function laneFirst(
  state: RoundState,
  lane: number,
  fromX: number,
  range: number,
): MonsterState | undefined {
  return mostAdvanced(
    state.monsters.filter((m) => occupies(m, lane) && m.x >= fromX && m.x - fromX <= range),
  );
}

/** `LaneMostAdvanced(range)`: the lane's monster closest to the gate, within range of `fromX`. */
export function laneMostAdvanced(
  state: RoundState,
  lane: number,
  fromX: number,
  range: number,
): MonsterState | undefined {
  return mostAdvanced(
    state.monsters.filter((m) => occupies(m, lane) && Math.abs(m.x - fromX) <= range),
  );
}

/** Every monster within `radius` of the point, across lanes. */
export function monstersWithin(
  state: RoundState,
  lane: number,
  x: number,
  radius: number,
): MonsterState[] {
  return state.monsters.filter((m) => Math.hypot(m.x - x, laneGap(m, lane)) <= radius);
}

/** `NearbyMostAdvanced(radius)`: the most advanced monster in any lane within the radius. */
export function nearbyMostAdvanced(
  state: RoundState,
  lane: number,
  x: number,
  radius: number,
): MonsterState | undefined {
  return mostAdvanced(monstersWithin(state, lane, x, radius));
}

/** The nearest monster to a point, ties broken by the more advanced. */
export function nearestMonster(state: RoundState, point: BoardPoint): MonsterState | undefined {
  let best: MonsterState | undefined;
  let bestDistance = Infinity;
  for (const monster of state.monsters) {
    const d = distance(monster, point);
    if (d < bestDistance || (d === bestDistance && best && monster.x < best.x)) {
      best = monster;
      bestDistance = d;
    }
  }
  return best;
}

/** The level's tiles whose centres lie within `radius` of the point, in lane then column order. */
export function tilesInCircle(state: RoundState, lane: number, x: number, radius: number): Tile[] {
  const tiles: Tile[] = [];
  for (const l of [...state.lanes].sort((a, b) => a - b)) {
    for (let column = 1; column <= SIM_TUNING.columns; column++) {
      if (distance({ lane: l, x: column }, { lane, x }) <= radius) tiles.push({ lane: l, column });
    }
  }
  return tiles;
}
