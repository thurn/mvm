import { COMBAT_KNOBS } from "../../tuning/combat";
import { SIM_TUNING } from "../../tuning/sim";
import { STEP_SECONDS } from "../time";
import type { MonsterState, RoundState } from "../state";
import type { System } from "../system";

/** Whether a hero, or a blocking scripted actor, stands on the monster's tile (Appendix A §3.2). */
function isBlocked(state: RoundState, monster: MonsterState): boolean {
  const reach = SIM_TUNING.blockReach;
  const blocks = (lane: number, column: number) =>
    lane === monster.lane && Math.abs(monster.x - column) <= reach;
  return (
    state.heroes.some((h) => blocks(h.lane, h.column)) ||
    state.scripted.some((s) => s.blocks && blocks(s.lane, s.column))
  );
}

/**
 * Monsters walk left unless blocked. One below `leakX` reaches the gate,
 * costs life by rarity and despawns (Appendix A §7). Life 0 loses the level.
 */
export const locomotionSystem: System = {
  id: "locomotion",
  phase: "monsters",
  run(ctx) {
    const { state } = ctx;
    const stepTiles = STEP_SECONDS / COMBAT_KNOBS.walkSecondsPerTile;
    const leaked: MonsterState[] = [];
    for (const monster of state.monsters) {
      if (!isBlocked(state, monster)) monster.x -= stepTiles * monster.moveSpeed;
      if (monster.x < SIM_TUNING.leakX) leaked.push(monster);
    }
    if (leaked.length === 0) return;
    state.monsters = state.monsters.filter((m) => !leaked.includes(m));
    for (const monster of leaked) {
      const cost = SIM_TUNING.leakCost[monster.rarity];
      state.life = Math.max(0, state.life - cost);
      ctx.emit({
        type: "leak",
        monsterId: monster.id,
        lane: monster.lane,
        rarity: monster.rarity,
        cost,
        lifeLeft: state.life,
      });
      if (state.life === 0) {
        state.result = "lost";
        ctx.emit({ type: "levelEnd", result: "lost" });
        return;
      }
    }
  },
};
