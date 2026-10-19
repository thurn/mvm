import { catalogEntry } from "../heroes/model/catalog";
import { rollStrongboxReward } from "../loot/drops";
import { streamRng } from "../sim/rng";
import { newInstanceId, type MonsterInstanceId, type RoundState } from "../sim/state";
import type { System } from "../sim/system";
import { placeableAt } from "../sim/terrain";
import { STRONGBOX_TUNING } from "../tuning/loot";
import { WAVE_TUNING } from "../tuning/waves";
import { archetype } from "./archetypes";
import type { LevelDefinition } from "./levels/types";
import { spawnRoll } from "./model";
import { rollAffixes, rollRarity, type SpawnRarity } from "./rarity";
import { drawArchetype, waveBudget } from "./waves";

type Rng = () => number;

/**
 * A level's Strongbox (Appendix D §9), rolled at level start and stored
 * (P16): where it sits, its phase, and the ambush it releases, whose
 * rarity floors are fixed here; other rarities and affixes roll at spawn.
 */
export interface StrongboxState {
  lane: number;
  column: number;
  phase: "closed" | "ambush" | "opened";
  ambush: { archetypeId: string; lane: number; rarity: SpawnRarity | null }[];
  ambushIds: MonsterInstanceId[];
}

/** The lanes nearest the box, nearest first, the lower lane winning ties. */
function nearestLanes(lanes: readonly number[], lane: number): number[] {
  return [...lanes]
    .sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || a - b)
    .slice(0, STRONGBOX_TUNING.nearLanes);
}

/** The ambush (D §9): 60% of the flag wave's points, its floors, and 70% of its points near the box. */
function rollAmbush(level: LevelDefinition, boxLane: number, rng: Rng): StrongboxState["ambush"] {
  const t = STRONGBOX_TUNING;
  let remaining = waveBudget(level, level.waves - 1, true) * t.budgetShare;
  const picks: string[] = [];
  for (
    let id = drawArchetype(level, remaining, rng);
    id;
    id = drawArchetype(level, remaining, rng)
  ) {
    picks.push(id);
    remaining -= archetype(id).pointCost;
  }
  const total = picks.reduce((sum, id) => sum + archetype(id).pointCost, 0);
  const near = nearestLanes(level.lanes, boxLane);
  let nearPoints = 0;
  return picks.map((archetypeId, i) => {
    const pool = nearPoints < t.nearLaneShare * total - 1e-9 ? near : level.lanes;
    const lane = pool[Math.floor(rng() * pool.length)]!;
    if (near.includes(lane)) nearPoints += archetype(archetypeId).pointCost;
    const rarity: SpawnRarity | null =
      i < t.minRare ? "rare" : i < t.minRare + t.minMagic ? "magic" : null;
    return { archetypeId, lane, rarity };
  });
}

/**
 * Rolls a level's Strongbox at level start (D §9): a 25% chance where the
 * level allows one, on a placeable tile in columns 5–7, with its ambush.
 */
export function rollStrongbox(level: LevelDefinition, state: RoundState): StrongboxState | null {
  if (!level.strongboxes) return null;
  const rng = streamRng(state.rng, "waves");
  if (rng() >= STRONGBOX_TUNING.chance) return null;
  const [from, to] = STRONGBOX_TUNING.columns;
  const tiles = level.lanes.flatMap((lane) =>
    Array.from({ length: to - from + 1 }, (_, i) => ({ lane, column: from + i })).filter((t) =>
      placeableAt(state, t.lane, t.column),
    ),
  );
  if (tiles.length === 0) return null;
  const tile = tiles[Math.floor(rng() * tiles.length)]!;
  return { ...tile, phase: "closed", ambush: rollAmbush(level, tile.lane, rng), ambushIds: [] };
}

/**
 * The Strongbox's life (D §9): a hero placed on any of the 8 squares around
 * the closed chest releases the ambush from the right edge; once every
 * ambusher is dead, its reward drops as one burst on the box's tile.
 */
export const strongboxSystem: System = {
  id: "strongbox",
  phase: "loot",
  run(ctx) {
    const { state } = ctx;
    const box = state.strongbox;
    const plan = state.waves?.plan;
    if (!box || !plan || state.result !== null) return;
    if (box.phase === "closed") {
      const adjacent = state.heroes.some(
        (h) =>
          Math.abs(h.lane - box.lane) <= 1 &&
          Math.abs(h.column - box.column) <= 1 &&
          !(h.lane === box.lane && h.column === box.column),
      );
      if (!adjacent) return;
      const rng = streamRng(state.rng, "waves");
      box.phase = "ambush";
      for (const planned of box.ambush) {
        const rarity = planned.rarity ?? rollRarity(plan.levelIndex, rng);
        const pack = spawnRoll(state, {
          archetypeId: planned.archetypeId,
          rarity,
          affixes: rollAffixes(rarity, planned.archetypeId, plan.areaLevel, rng),
          areaLevel: plan.areaLevel,
          levelIndex: plan.levelIndex,
          lane: planned.lane,
          x: WAVE_TUNING.spawnX + rng() * WAVE_TUNING.spawnJitter,
        });
        for (const monster of pack) box.ambushIds.push(monster.id);
      }
      ctx.emit({
        type: "strongboxTriggered",
        lane: box.lane,
        column: box.column,
        ambushIds: [...box.ambushIds],
      });
      return;
    }
    if (box.phase !== "ambush") return;
    if (state.monsters.some((m) => box.ambushIds.includes(m.id))) return;
    box.phase = "opened";
    const rosterWeaponClasses = [
      ...new Set(state.roster.flatMap((slot) => catalogEntry(slot.card.hero.skillId).weapon ?? [])),
    ];
    const drops = rollStrongboxReward(
      plan.areaLevel,
      { rosterWeaponClasses, newId: () => newInstanceId<"Item">(state) },
      streamRng(state.rng, "loot"),
    );
    const dropIds: string[] = [];
    for (const drop of drops) {
      const dropId = newInstanceId<"Drop">(state);
      dropIds.push(dropId);
      const monsterId = box.ambushIds.at(-1)!;
      state.earned.push({ dropId, monsterId, tick: state.tick, drop });
      ctx.emit({ type: "drop", dropId, monsterId, lane: box.lane, x: box.column, drop });
    }
    ctx.emit({ type: "lootBurst", sourceId: "strongbox", dropIds, lane: box.lane, x: box.column });
  },
};
