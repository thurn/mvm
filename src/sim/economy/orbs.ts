import { ECONOMY_TUNING } from "../../tuning/economy";
import { newInstanceId } from "../state";
import type { StepContext } from "../system";
import { STEPS_PER_SECOND } from "../time";

/** A mana orb waiting to be auto-collected (GDD §6.2). */
export interface ManaOrb {
  id: string;
  amount: number;
  source: "sky" | "acolyte";
  lane: number;
  x: number;
  collectAtSeconds: number;
}

/** Drops a mana orb on the board; it collects itself after the auto-collect delay. */
export function spawnOrb(ctx: StepContext, orb: Omit<ManaOrb, "id" | "collectAtSeconds">): ManaOrb {
  const { state } = ctx;
  const spawned: ManaOrb = {
    ...orb,
    id: newInstanceId<"ManaOrb">(state),
    collectAtSeconds: state.tick / STEPS_PER_SECOND + ECONOMY_TUNING.autoCollectSeconds,
  };
  state.orbs.push(spawned);
  ctx.emit({
    type: "manaSpawn",
    orbId: spawned.id,
    amount: orb.amount,
    lane: orb.lane,
    x: orb.x,
    source: orb.source,
  });
  return spawned;
}
