import { catalogEntry } from "../../heroes/model/catalog";
import type { RosterSlot } from "../../sim/economy/roster";
import type { RoundState } from "../../sim/state";
import { placeableAt } from "../../sim/terrain";
import type { Tile } from "../../sim/targeting";
import { SPELL_DEFINITIONS } from "../../spells/catalog";
import { shapeTiles } from "../../spells/shapes";
import { HERO_BOARD_TUNING } from "../../tuning/heroes";
import { SIM_TUNING } from "../../tuning/sim";

const TILE = 64;

/** The board tile under a point in the overlay, in screen px at the board's scale. */
export function tileAt(x: number, y: number, scale: number): Tile {
  return { lane: Math.floor(y / (TILE * scale)), column: Math.floor(x / (TILE * scale)) + 1 };
}

const onBoard = (round: RoundState, tile: Tile) =>
  round.lanes.includes(tile.lane) && tile.column >= 1 && tile.column <= SIM_TUNING.columns;

const occupied = (round: RoundState, tile: Tile) =>
  round.heroes.some((h) => h.lane === tile.lane && h.column === tile.column) ||
  round.scripted.some((s) => s.lane === tile.lane && s.column === tile.column);

/** Every on-board tile no hero can stand on (Rock, a closed Strongbox), marked while a hero is picked. */
export function blockedTiles(round: RoundState): Tile[] {
  return round.lanes.flatMap((lane) =>
    Array.from({ length: SIM_TUNING.columns }, (_, i) => ({ lane, column: i + 1 })).filter(
      (tile) => !placeableAt(round, tile.lane, tile.column),
    ),
  );
}

/** Whether the picked card, or the shovel, can act on this tile. */
export function canUse(round: RoundState, picked: RosterSlot | "shovel", tile: Tile): boolean {
  if (!onBoard(round, tile)) return false;
  if (picked === "shovel")
    return round.heroes.some((h) => h.lane === tile.lane && h.column === tile.column);
  if (picked.kind === "spell") return true;
  // The sim refuses Rock and a closed Strongbox (D §8.1, §9); the preview agrees.
  return !occupied(round, tile) && placeableAt(round, tile.lane, tile.column);
}

function laneTiles(round: RoundState, lane: number, from: number, to: number): Tile[] {
  const tiles: Tile[] = [];
  if (!round.lanes.includes(lane)) return tiles;
  for (let column = Math.max(1, from); column <= Math.min(SIM_TUNING.columns, to); column++)
    tiles.push({ lane, column });
  return tiles;
}

/**
 * The reach a card would have from this tile (Appendix H §5.2): a lane line
 * for shooters, the strike or slam tiles for melee, Spark's three lanes, a
 * spell's shape, and the acolyte's own tile.
 */
export function rangePreview(round: RoundState, picked: RosterSlot, tile: Tile): Tile[] {
  const skillId = picked.card.hero.skillId;
  if (picked.kind === "spell") {
    const definition = SPELL_DEFINITIONS[skillId];
    if (!definition) return [];
    const rollsLeft = skillId.endsWith("ExplosiveGrenade");
    return shapeTiles(
      definition.shape,
      tile.lane,
      rollsLeft ? Math.max(1, tile.column - 1) : tile.column,
      round.lanes,
    );
  }
  const role = catalogEntry(skillId).role;
  const t = HERO_BOARD_TUNING;
  if (role === "acolyte") return [tile];
  if (skillId.endsWith("SkillGemSpark")) {
    return [-1, 0, 1].flatMap((d) =>
      laneTiles(round, tile.lane + d, tile.column, tile.column + t.spark.range),
    );
  }
  if (skillId.endsWith("SkillGemRollingSlam"))
    return laneTiles(round, tile.lane, tile.column, tile.column + t.rollingSlam.reach);
  if (skillId.endsWith("SkillGemFallingThunder")) {
    return [
      ...laneTiles(round, tile.lane, tile.column + 1, tile.column + t.fallingThunder.reach),
      ...laneTiles(round, tile.lane - 1, tile.column + 2, tile.column + t.fallingThunder.reach),
      ...laneTiles(round, tile.lane + 1, tile.column + 2, tile.column + t.fallingThunder.reach),
    ];
  }
  if (role === "striker" || role === "wall")
    return laneTiles(round, tile.lane, tile.column, tile.column + t.meleeReach);
  return laneTiles(round, tile.lane, tile.column, SIM_TUNING.columns);
}
