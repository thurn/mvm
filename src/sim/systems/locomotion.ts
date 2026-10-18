import { COMBAT_KNOBS } from "../../tuning/combat";
import { SIM_TUNING } from "../../tuning/sim";
import { dealHit } from "../combat";
import type { HeroState, MonsterState, RoundState } from "../state";
import type { System } from "../system";
import { STEP_SECONDS } from "../time";

type Blocker = { kind: "hero"; hero: HeroState } | { kind: "scripted" };

/** The hero, or blocking scripted actor, on the monster's tile (Appendix A §3.2). */
function blockerOf(state: RoundState, monster: MonsterState): Blocker | null {
  const reach = SIM_TUNING.blockReach;
  const blocks = (lane: number, column: number) =>
    lane === monster.lane && Math.abs(monster.x - column) <= reach;
  const hero = state.heroes.find((h) => blocks(h.lane, h.column));
  if (hero) return { kind: "hero", hero };
  return state.scripted.some((s) => s.blocks && blocks(s.lane, s.column))
    ? { kind: "scripted" }
    : null;
}

/**
 * Monsters walk left unless blocked; a blocked monster with an attack hits
 * the hero in front of it. One below `leakX` reaches the gate, costs life by
 * rarity and despawns (Appendix A §7). Life 0 loses the level.
 */
export const locomotionSystem: System = {
  id: "locomotion",
  phase: "monsters",
  run(ctx) {
    const { state } = ctx;
    const stepTiles = STEP_SECONDS / COMBAT_KNOBS.walkSecondsPerTile;
    const leaked: MonsterState[] = [];
    for (const monster of [...state.monsters]) {
      const blocker = blockerOf(state, monster);
      if (!blocker) {
        monster.x -= stepTiles * monster.moveSpeed;
        if (monster.x < SIM_TUNING.leakX) leaked.push(monster);
        continue;
      }
      const attack = monster.attack;
      if (!attack || blocker.kind !== "hero") continue;
      attack.timer -= STEP_SECONDS;
      if (attack.timer > 0) continue;
      attack.timer = attack.seconds;
      dealHit(ctx, monster, { kind: "hero", entity: blocker.hero }, attack.hit);
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
