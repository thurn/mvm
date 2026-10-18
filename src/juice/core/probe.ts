/**
 * Juice measurements for QA (window.__mvm.fx; mason hv-7ic2.108). Screenshots
 * miss effects shorter than their own latency, so presentation reports what
 * it starts here, where it happens, and a probe reads numbers instead.
 * Write-only from presentation: nothing in the game reads it back.
 */
export interface FxReading {
  /** Live particles across every pool. */
  particles: number;
  /** Particles emitted per preset. */
  emitted: Record<string, number>;
  /** The largest shake amplitude in px (after the juice knob and shake mode). */
  shake: number;
  /** The strongest full-screen flash and vignette alpha. */
  flash: number;
  vignette: number;
}

const empty = (): FxReading => ({ particles: 0, emitted: {}, shake: 0, flash: 0, vignette: 0 });

/** A pool that hasn't updated for this long is gone (its board unmounted); it stops counting. */
const STALE_MS = 1000;

/** Each pool's alive count and when it last reported it. */
const pools = new Map<number, { alive: number; at: number }>();
let nextPool = 0;
let peak = empty();

function live(now = performance.now()): number {
  let total = 0;
  for (const [id, pool] of pools)
    if (now - pool.at > STALE_MS) pools.delete(id);
    else total += pool.alive;
  return total;
}

export const fxProbe = {
  /** A new pool's id, for its reports. */
  pool: (): number => nextPool++,
  /** A pool emitted `count` particles of a preset and now holds `alive`. */
  emitted(pool: number, preset: string, count: number, alive: number): void {
    if (count <= 0) return;
    peak.emitted[preset] = (peak.emitted[preset] ?? 0) + count;
    fxProbe.alive(pool, alive);
  },
  /** A pool's alive count after an update. */
  alive(pool: number, alive: number): void {
    pools.set(pool, { alive, at: performance.now() });
    peak.particles = Math.max(peak.particles, live());
  },
  shake(amplitude: number): void {
    peak.shake = Math.max(peak.shake, amplitude);
  },
  screen(flash: number, vignette: number): void {
    peak.flash = Math.max(peak.flash, flash);
    peak.vignette = Math.max(peak.vignette, vignette);
  },
  /** Live particles across the pools still updating, with no peaks consumed. */
  live: (): number => live(),
  /** Everything started since the last call, then starts over. */
  peaks(): FxReading {
    const read = { ...peak, emitted: { ...peak.emitted } };
    peak = empty();
    peak.particles = live();
    return read;
  },
};
