import { STEP_SECONDS } from "../sim/time";

const STEP_MS = STEP_SECONDS * 1000;
/** A longer frame (a background tab, a debugger pause) is clamped so the sim never spirals. */
const MAX_FRAME_MS = 250;

/** Presentation hooks the juice director (1.6) drives. */
interface DriverHooks {
  /** True during a global hitstop: no sim time passes (Appendix H §2.3). */
  frozen?: () => boolean;
  /** Slow-mo scale of sim time, 1 when off. */
  timeScale?: () => number;
}

export interface DriverOptions {
  /** Advances the sim by one fixed step. */
  step: () => void;
  hooks?: DriverHooks;
}

export interface Driver {
  /** Feeds wall-clock time; runs as many fixed steps as are due. Returns the count. */
  advance(elapsedMs: number): number;
  setSpeed(speed: 1 | 2): void;
  speed(): 1 | 2;
  /** Pauses the sim, for the resume countdown (P14). */
  setPaused(paused: boolean): void;
  /** A dev multiplier on sim time, for capturing timing. */
  setDebugSlowmo(scale: number): void;
  /** Progress toward the next step in [0, 1), for interpolation. */
  alpha(): number;
}

/**
 * The fixed-step accumulator: one 1/60 s step per tick at 1×, two at 2×
 * (Appendix A §1.2). Speed, slow-mo and hitstop only change how fast sim
 * time accrues, never the step itself.
 */
export function createDriver({ step, hooks = {} }: DriverOptions): Driver {
  let accumulator = 0;
  let speed: 1 | 2 = 1;
  let paused = false;
  let debugSlowmo = 1;

  return {
    advance(elapsedMs) {
      if (paused || hooks.frozen?.()) return 0;
      const scale = speed * debugSlowmo * (hooks.timeScale?.() ?? 1);
      accumulator += Math.min(elapsedMs, MAX_FRAME_MS) * scale;
      let steps = 0;
      while (accumulator >= STEP_MS - 1e-9) {
        accumulator -= STEP_MS;
        step();
        steps++;
      }
      if (accumulator < 0) accumulator = 0;
      return steps;
    },
    setSpeed(next) {
      speed = next;
    },
    speed: () => speed,
    setPaused(next) {
      paused = next;
    },
    setDebugSlowmo(scale) {
      debugSlowmo = scale;
    },
    alpha: () => accumulator / STEP_MS,
  };
}
