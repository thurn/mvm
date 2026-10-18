import type { AilmentState } from "../../combat/ailments";
import { AILMENT_JUICE as A, type OverlayAilment } from "../../tuning/juice";

/** The overlay-bearing ailments active on an actor, in no particular order. */
export function activeAilments(a: AilmentState): OverlayAilment[] {
  const out: OverlayAilment[] = [];
  if (a.frozenSeconds > 0) out.push("freeze");
  if (a.shock) out.push("shock");
  if (a.chill) out.push("chill");
  if (a.ignite) out.push("ignite");
  return out;
}

/** The single tint to draw: the highest-priority active ailment, capped at 45% alpha (H §8, §1.1). */
export function topTint(
  active: readonly OverlayAilment[],
): { color: string; alpha: number } | null {
  const top = A.priority.find((name) => active.includes(name));
  if (!top) return null;
  const tint = A.tints[top];
  return { color: tint.color, alpha: Math.min(A.maxOverlayAlpha, tint.alpha) };
}

/** Particles emit at half rate once three or more ailments are active (H §8). */
export function particleRate(activeCount: number): number {
  return activeCount >= A.crowdedCount ? 0.5 : 1;
}

/** Apply sounds: one voice per ailment type per 80 ms, board-wide (H §8). */
export class ApplyGate {
  private last = new Map<string, number>();

  allow(ailment: string, now: number): boolean {
    const prev = this.last.get(ailment) ?? -Infinity;
    if (now - prev < A.applySoundGapMs) return false;
    this.last.set(ailment, now);
    return true;
  }
}
