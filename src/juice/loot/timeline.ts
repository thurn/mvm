import type { Drop } from "../../loot/drops";
import { LOOT_JUICE as L, type LootClass, type LootClassSpec } from "../../tuning/juice";

/** Which row of the per-class table a drop uses (H §3.2); gold is the kills system's. */
export function lootClass(drop: Exclude<Drop, { kind: "gold" }>): LootClass {
  if (drop.kind === "item") return drop.item.rarity;
  if (drop.kind !== "currency") return drop.kind;
  const suffix = drop.currencyId.split("/").pop() ?? "";
  return L.currencyTier[suffix] ?? "currencyLow";
}

export const lootSpec = (cls: LootClass): LootClassSpec => L.classes[cls];

/** The drop timeline's keyframes in ms from spawn (H §3.1), with the hold scaled by `lootHoldScale`. */
export function lootKeyframes(cls: LootClass, holdScale = 1) {
  const land = L.arcMs;
  const beamUp = land + L.beamRiseMs;
  const holdEnd = beamUp + lootSpec(cls).holdMs * holdScale;
  return { land, beamUp, holdEnd, collected: holdEnd + L.collectMs };
}

/** Multiple drops from one kill: ascending rank, 70 ms apart, so the best lands last. */
export function stagger<T>(
  drops: readonly T[],
  cls: (drop: T) => LootClass,
): { drop: T; delay: number }[] {
  return [...drops]
    .map((drop, i) => ({ drop, i, rank: lootSpec(cls(drop)).rank }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(({ drop }, i) => ({ drop, delay: i * L.staggerMs }));
}

/** A loot class's place in a fountain's launch order. */
const rankIn = (cls: LootClass) => (L.fountain.order as readonly string[]).indexOf(cls);

/**
 * A burst as a fountain (H §3.9): non-uniques launch `spacingMs` apart in
 * H §3.9's order with arcs rising across 30–50 px; the unique waits
 * `uniqueWaitMs` after the last and launches highest.
 */
export function fountain<T>(
  drops: readonly T[],
  cls: (drop: T) => LootClass,
): { drop: T; delay: number; arcPx: number }[] {
  const F = L.fountain;
  const ranked = [...drops]
    .map((drop, i) => ({ drop, i, cls: cls(drop) }))
    .sort((a, b) => rankIn(a.cls) - rankIn(b.cls) || a.i - b.i);
  const rest = ranked.filter((d) => d.cls !== "unique");
  const uniques = ranked.filter((d) => d.cls === "unique");
  const [low, high] = F.arcPx;
  const steps = Math.max(1, rest.length - 1);
  const launched = rest.map(({ drop }, i) => ({
    drop,
    delay: i * F.spacingMs,
    arcPx: low + ((high - low) * i) / steps,
  }));
  const last = launched.at(-1)?.delay ?? -F.spacingMs;
  return [
    ...launched,
    ...uniques.map(({ drop }, i) => ({
      drop,
      delay: last + F.uniqueWaitMs + i * F.spacingMs,
      arcPx: F.uniqueArcPx,
    })),
  ];
}

/** D major pentatonic, in semitones above D (H §3.3). */
const PENTATONIC = [0, 2, 4, 7, 9, 12];

/**
 * The loot ladder (H §3.4): each drop within 1.5 s of the last shifts the
 * stinger's tone one pentatonic step, to at most +5 steps; silence resets it.
 */
export class LootLadder {
  private step = -1;
  private last = -Infinity;

  /** The semitone shift for a drop at `now`. */
  next(now: number): number {
    this.step = now - this.last <= L.ladderWindowMs ? Math.min(this.step + 1, L.ladderMaxSteps) : 0;
    this.last = now;
    return PENTATONIC[this.step]!;
  }
}

/** The bounce offset after landing: 6 px then 2 px, 80 ms each (H §3.1). */
export function bounceAt(msSinceLand: number): number {
  let t = msSinceLand;
  for (const [height, ms] of L.bounces) {
    if (t < ms) return -height * Math.sin((Math.PI * t) / ms);
    t -= ms;
  }
  return 0;
}
