import { JUICE_TUNING } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

/** Slow-mo (H §1.3): scales sim time for a while, at most once per 4 s; halved at 2×. */
export function createSlowmo(settings: () => JuiceSettings) {
  let until = -Infinity;
  let scale = 1;
  let lastStart = -Infinity;
  return {
    start(slowScale: number, ms: number, now: number, speed: number): boolean {
      if (settings().juice <= 0) return false;
      if (now - lastStart < JUICE_TUNING.slowmoCooldownMs) return false;
      lastStart = now;
      scale = slowScale;
      until = now + ms / speed;
      return true;
    },
    timeScale: (now: number) => (now < until ? scale : 1),
  };
}
