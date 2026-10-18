import { killTarget, type HitTarget } from "../../sim/combat";
import type { EntityId } from "../../sim/state";
import type { System } from "../../sim/system";
import { STEP_SECONDS } from "../../sim/time";
import { tickAilments } from ".";

/** Ticks every actor's ailments: durations, expiry events, freeze decay and ignite damage (Appendix A §6). */
export const ailmentSystem: System = {
  id: "ailments",
  phase: "ailments",
  run(ctx) {
    const { state } = ctx;
    const targets: HitTarget[] = [
      ...state.monsters.map((entity) => ({ kind: "monster" as const, entity })),
      ...state.heroes.map((entity) => ({ kind: "hero" as const, entity })),
    ];
    for (const target of targets) {
      const actor = target.entity.actor;
      const tick = tickAilments(actor, STEP_SECONDS);
      for (const ailment of tick.expired)
        ctx.emit({ type: "ailmentExpired", targetId: target.entity.id, ailment });
      if (tick.dotDamage <= 0) continue;
      actor.life -= tick.dotDamage;
      ctx.emit({
        type: "dot",
        sourceId: (tick.dotSourceId ?? target.entity.id) as EntityId,
        targetId: target.entity.id,
        ailment: "ignite",
        amount: tick.dotDamage,
        lane: target.entity.lane,
        x: target.kind === "monster" ? target.entity.x : target.entity.column,
      });
      if (actor.life <= 0)
        killTarget(ctx, (tick.dotSourceId ?? target.entity.id) as EntityId, target);
    }
  },
};
