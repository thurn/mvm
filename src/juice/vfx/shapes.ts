import { VFX_TUNING as V } from "../../tuning/juice";
import { EASINGS } from "../core/easing";

/** Extra projectiles in a volley show one frame later each (H §5.3). */
export function volleyDelayMs(index: number): number {
  return index * V.frameMs;
}

/**
 * A jagged lightning polyline between two points (H §11.1): midpoint
 * displacement, 4 subdivisions, each midpoint offset up to ±6 px.
 */
export function lightningPolyline(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rng: () => number,
): { x: number; y: number }[] {
  let points = [from, to];
  let offset = V.polyline.offsetPx;
  for (let i = 0; i < V.polyline.subdivisions; i++) {
    const next: { x: number; y: number }[] = [points[0]!];
    for (let j = 1; j < points.length; j++) {
      const a = points[j - 1]!;
      const b = points[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const shift = (rng() * 2 - 1) * offset;
      next.push({
        x: (a.x + b.x) / 2 + (-dy / len) * shift,
        y: (a.y + b.y) / 2 + (dx / len) * shift,
      });
      next.push(b);
    }
    points = next;
    offset /= 2;
  }
  return points;
}

/** An AoE ring `ms` after it started: radius scale and alpha (H §2.8). */
export function ringAt(ms: number): { scale: number; alpha: number; done: boolean } {
  const { fromScale, expandMs, fadeMs } = V.ring;
  if (ms < expandMs)
    return {
      scale: fromScale + (1 - fromScale) * EASINGS.outQuad(ms / expandMs),
      alpha: 1,
      done: false,
    };
  const fade = (ms - expandMs) / fadeMs;
  return { scale: 1, alpha: Math.max(0, 1 - fade), done: fade >= 1 };
}
