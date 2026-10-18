import { MANA_JUICE as M } from "../../tuning/juice";
import { EASINGS } from "../core/easing";

/** An orb's drawn size: 10 px, +1 per 10 mana over 25, up to 16 (H §3.6). */
export function orbSize(amount: number): number {
  return Math.min(M.orbMaxSize, M.orbSize + Math.max(0, Math.floor((amount - 25) / M.manaPerPx)));
}

/**
 * Where an orb is drawn relative to its tile, `ms` after it spawned, until
 * collection: sky orbs fall the last 18 px (40 px/s) with a sway; acolyte
 * orbs pop out in a 20 px arc from the acolyte (H §3.6).
 */
export function orbOffset(source: "sky" | "acolyte", ms: number): { dx: number; dy: number } {
  if (source === "sky") {
    const fallPx = (M.skyFallSpeedPxPerS * M.skyFallMs) / 1000;
    const p = Math.min(1, ms / M.skyFallMs);
    const sway = p < 1 ? M.swayPx * Math.sin((2 * Math.PI * ms) / M.swayPeriodMs) * (1 - p) : 0;
    return { dx: sway, dy: -fallPx * (1 - p) };
  }
  const p = Math.min(1, ms / M.acolyteArcMs);
  return { dx: -12 * (1 - p), dy: -Math.sin(Math.PI * p) * M.acolyteArcPx };
}

/** The collect flight to the mana counter: a bezier in 450 ms, `inBack` (H §3.6). */
export function orbFlight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  ms: number,
): { x: number; y: number; done: boolean } {
  const p = Math.min(1, Math.max(0, ms / M.flightMs));
  const e = EASINGS.inBack(p);
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - 60;
  const q = 1 - e;
  return {
    x: q * q * from.x + 2 * q * e * cx + e * e * to.x,
    y: q * q * from.y + 2 * q * e * cy + e * e * to.y,
    done: p >= 1,
  };
}

/** A placed hero's drop-in and landing squash (H §5.2): offset and scale by ms since placement. */
export function placementPose(ms: number): { dy: number; sx: number; sy: number } {
  const { dropPx, dropMs, squashMs, squash } = M.placement;
  if (ms < dropMs) return { dy: -dropPx * (1 - EASINGS.inQuad(ms / dropMs)), sx: 1, sy: 1 };
  if (ms < dropMs + squashMs) {
    const t = (ms - dropMs) / squashMs;
    return { dy: 0, sx: squash.x + (1 - squash.x) * t, sy: squash.y + (1 - squash.y) * t };
  }
  return { dy: 0, sx: 1, sy: 1 };
}

/** A shovelled hero sinks 8 px and fades over 200 ms (H §5.2). */
export function shovelPose(ms: number): { dy: number; alpha: number; done: boolean } {
  const t = Math.min(1, ms / M.shovel.ms);
  return { dy: M.shovel.sinkPx * t, alpha: 1 - t, done: t >= 1 };
}

/**
 * The mana counter's displayed value (H §3.6): each change rolls from the
 * value shown to the new target over 200 ms, so it always converges.
 */
export class ManaCounter {
  private from = 0;
  private to = 0;
  private at = -Infinity;

  constructor(start = 0) {
    this.from = this.to = start;
  }

  set(target: number, now: number): void {
    if (target === this.to) return;
    this.from = this.shown(now);
    this.to = target;
    this.at = now;
  }

  shown(now: number): number {
    const p = Math.min(1, (now - this.at) / M.rollMs);
    return this.from + (this.to - this.from) * p;
  }
}
