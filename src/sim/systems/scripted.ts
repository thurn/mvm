import { dealHit } from "../combat";
import type { System } from "../system";
import { nearestMonster } from "../targeting";

/** Dev-only: each scripted actor hits the nearest monster every `everyTicks` ticks. */
export const scriptedSystem: System = {
  id: "scripted",
  phase: "heroes",
  run(ctx) {
    for (const scripted of ctx.state.scripted) {
      scripted.ticksUntilHit--;
      if (scripted.ticksUntilHit > 0) continue;
      const target = nearestMonster(ctx.state, { lane: scripted.lane, x: scripted.column });
      if (!target) {
        scripted.ticksUntilHit = 0;
        continue;
      }
      dealHit(ctx, scripted, { kind: "monster", entity: target }, scripted.hit);
      scripted.ticksUntilHit = scripted.everyTicks;
    }
  },
};
