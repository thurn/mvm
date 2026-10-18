import { JUICE_TUNING, type Tier } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

/**
 * Hitstop (H §2.3): actor hitstop holds only animation clocks; global
 * hitstop pauses the sim's fixed step in wall time, at most once per
 * second. At 2× everything halves. Times are wall-clock ms.
 */
export function createHitstop(settings: () => JuiceSettings) {
  let globalUntil = -Infinity;
  let lastGlobal = -Infinity;
  const actors = new Map<string, number>();
  const scaled = (ms: number, speed: number) => (ms * settings().juice) / speed;
  return {
    /** Starts a tier's global hitstop; false when inside the rate limit, so the caller adds shake only. */
    global(tier: Tier, now: number, speed: number): boolean {
      const ms = scaled(JUICE_TUNING.tiers[tier].globalHitstopMs, speed);
      if (ms <= 0) return false;
      if (now - lastGlobal < JUICE_TUNING.globalHitstopCooldownMs) return false;
      lastGlobal = now;
      globalUntil = now + ms;
      return true;
    },
    frozen: (now: number) => now < globalUntil,
    /** Holds one actor's animation clock for `ms` (H §2.3, sized by the hit's band in §2.6). */
    actor(id: string, ms: number, now: number, speed: number) {
      const held = scaled(ms, speed);
      if (held > 0) actors.set(id, Math.max(actors.get(id) ?? -Infinity, now + held));
    },
    actorFrozen: (id: string, now: number) => now < (actors.get(id) ?? -Infinity),
  };
}
