import { KILL_TUNING } from "../../tuning/juice";

const C = KILL_TUNING.coins;

/** How many coins a gold pile splits into: 3–8, more for richer piles; rare kills shower 15 (H §3.5). */
export function coinCount(amount: number, rareKill: boolean): number {
  if (rareKill) return C.rareShower;
  return Math.max(C.min, Math.min(C.max, Math.round(amount / C.goldPerCoin)));
}

/** When each coin of a pile starts its flight to the gold readout, and lands there. */
export function coinTimeline(
  count: number,
  spawnedAt: number,
): { flyAt: number; arriveAt: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const flyAt = spawnedAt + C.magnetiseAfterMs + i * C.staggerMs;
    return { flyAt, arriveAt: flyAt + C.flightMs };
  });
}

/**
 * A pitch ladder (H §3.4): each step within `windowMs` of the last climbs one
 * step, wrapping after `max`; silence resets it.
 */
export class Ladder {
  private step = -1;
  private last = -Infinity;

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  next(now: number): number {
    this.step = now - this.last <= this.windowMs ? (this.step + 1) % (this.max + 1) : 0;
    this.last = now;
    return this.step;
  }
}
