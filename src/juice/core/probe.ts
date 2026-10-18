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

let live = 0;
let peak = empty();

export const fxProbe = {
  /** A pool emitted `count` particles of a preset. */
  emitted(preset: string, count: number): void {
    if (count <= 0) return;
    live += count;
    peak.emitted[preset] = (peak.emitted[preset] ?? 0) + count;
    peak.particles = Math.max(peak.particles, live);
  },
  /** A pool retired `count` particles. */
  retired(count: number): void {
    live = Math.max(0, live - count);
  },
  shake(amplitude: number): void {
    peak.shake = Math.max(peak.shake, amplitude);
  },
  screen(flash: number, vignette: number): void {
    peak.flash = Math.max(peak.flash, flash);
    peak.vignette = Math.max(peak.vignette, vignette);
  },
  /** The live particle count, with no peaks consumed. */
  live: (): number => live,
  /** Everything started since the last call, then starts over. */
  peaks(): FxReading {
    const read = { ...peak, emitted: { ...peak.emitted } };
    peak = empty();
    peak.particles = live;
    return read;
  },
};
