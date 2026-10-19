import { catalogEntry } from "../heroes/model/catalog";
import { streamRng } from "../sim/rng";
import { newInstanceId } from "../sim/state";
import type { System } from "../sim/system";
import { BOSS_TUNING } from "../tuning/bosses";
import { rollDrops } from "./drops";

/**
 * Rolls each kill's drops at kill time (Appendix E §3–§5, P16): every
 * outcome is stored in `round.earned` and announced as a `drop` event, which
 * the lifecycle credits to the account in the same step.
 */
export const lootSystem: System = {
  id: "loot",
  phase: "loot",
  run(ctx) {
    const { state } = ctx;
    if (state.kills.length === 0) return;
    const rng = streamRng(state.rng, "loot");
    const areaLevel = state.waves?.plan.areaLevel ?? 1;
    const rosterWeaponClasses = [
      ...new Set(state.roster.flatMap((slot) => catalogEntry(slot.card.hero.skillId).weapon ?? [])),
    ];
    for (const kill of state.kills) {
      const killer = state.heroes.find((h) => h.id === kill.killerId);
      const drops = rollDrops(
        {
          rarity: kill.rarity,
          affixCount: kill.affixCount,
          areaLevel,
          ...(kill.bossId ? { uniquePool: BOSS_TUNING[kill.bossId].uniquePool } : {}),
        },
        {
          killerStats: killer?.actor.stats ?? {},
          rosterWeaponClasses,
          newId: () => newInstanceId<"Item">(state),
        },
        rng,
      );
      const dropIds: string[] = [];
      for (const drop of drops) {
        const dropId = newInstanceId<"Drop">(state);
        dropIds.push(dropId);
        state.earned.push({ dropId, monsterId: kill.monsterId, tick: state.tick, drop });
        ctx.emit({
          type: "drop",
          dropId,
          monsterId: kill.monsterId,
          lane: kill.lane,
          x: kill.x,
          drop,
        });
      }
      // A boss's drops also go out as one burst, for the loot fountain (H §3.9).
      if (kill.bossId)
        ctx.emit({
          type: "lootBurst",
          sourceId: kill.monsterId,
          dropIds,
          lane: kill.lane,
          x: kill.x,
        });
    }
    state.kills = [];
  },
};
