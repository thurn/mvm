import { COMBAT_KNOBS } from "../../tuning/combat";
import { SPRITE_TUNING } from "../../tuning/sprites";
import { TILE } from "../scale";

interface AttackStrip {
  frames: number;
  release?: number;
}

interface AttackTiming {
  /** Seconds between actions. */
  period: number;
  /** Seconds until the next action; 0 or less means none is scheduled (no target). */
  timeToNext: number;
  /** Seconds since the last action, or null before the first. */
  sinceAction: number | null;
}

/**
 * The attack frame for an actor's action timer (G §1.3, H §5.2). The row plays
 * in at most 0.6 s, aligned so the release frame shows as the sim acts; the
 * frame before release is held for the wind-up. Outside the row: frame 0.
 */
export function attackFrame(strip: AttackStrip, timing: AttackTiming): number {
  const release = Math.min(strip.release ?? 0, strip.frames - 1);
  const hold = release > 0 ? SPRITE_TUNING.windupHoldSlots : 0;
  const duration = Math.min(SPRITE_TUNING.attackMaxSeconds, timing.period);
  const slot = duration / (strip.frames + hold);
  const releaseSlot = release + hold;
  const releaseAt = releaseSlot * slot;
  const frameOfSlot = (s: number) => (s < release ? s : s < releaseSlot ? release - 1 : s - hold);
  if (timing.sinceAction !== null && timing.sinceAction >= 0) {
    const s = releaseSlot + Math.floor(timing.sinceAction / slot);
    if (s < strip.frames + hold) return frameOfSlot(s);
  }
  if (timing.timeToNext > 0 && timing.timeToNext <= releaseAt) {
    return frameOfSlot(Math.floor((releaseAt - timing.timeToNext) / slot));
  }
  return 0;
}

/** Follows one actor's action timer and reports when its release frame first shows. */
export class AttackAnimator {
  frame = 0;
  private lastTimer: number | null = null;
  private afterAction: number | null = null;

  constructor(private readonly onRelease?: () => void) {}

  /** `timer` is the sim's seconds to the next action; it jumps up when the actor acts. */
  sample(strip: AttackStrip, timer: number, period: number): number {
    if (this.lastTimer !== null && timer > this.lastTimer + 1e-9) this.afterAction = timer;
    this.lastTimer = timer;
    const sinceAction = this.afterAction === null ? null : this.afterAction - timer;
    const frame = attackFrame(strip, { period, timeToNext: timer, sinceAction });
    const released = frame === strip.release && this.frame !== frame;
    this.frame = frame;
    if (released) this.onRelease?.();
    return frame;
  }
}

/** An actor's own animation clock: it stops while the actor is in hitstop (H §2.3). */
export class ActorClock {
  ms = 0;

  advance(ms: number, frozen: boolean): void {
    if (!frozen) this.ms += ms;
  }

  /** A looping frame: frames before `loopFrom` play once (walk frame 0 is the stand). */
  frame(frameMs: number, frames: number, loopFrom = 0): number {
    const index = Math.floor(this.ms / frameMs);
    if (index < frames) return index;
    return loopFrom + ((index - loopFrom) % (frames - loopFrom));
  }
}

/** Walk frame time for a monster's speed multiplier (G §1.3). */
export function walkFrameMs(moveSpeed: number): number {
  const pxPerSecond = (TILE * moveSpeed) / COMBAT_KNOBS.walkSecondsPerTile;
  const [min, max] = SPRITE_TUNING.walkFrameMs;
  return Math.min(max, Math.max(min, SPRITE_TUNING.walkFrameScale / pxPerSecond));
}

/** The `hurt` fall, then a fade (G §1.3). */
export function deathFrame(ms: number): { frame: number; alpha: number; done: boolean } {
  const fallMs = 6 * SPRITE_TUNING.deathFrameMs;
  const frame = Math.min(5, Math.floor(ms / SPRITE_TUNING.deathFrameMs));
  const alpha = ms <= fallMs ? 1 : Math.max(0, 1 - (ms - fallMs) / SPRITE_TUNING.deathFadeMs);
  return { frame, alpha, done: ms >= fallMs + SPRITE_TUNING.deathFadeMs };
}

/** The idle bob: 1 px every 600 ms, desynchronised by `phaseMs` (G §1.3, H §5.2). */
export function bobOffset(nowMs: number, phaseMs: number): number {
  return Math.floor((nowMs + phaseMs) / SPRITE_TUNING.bobPeriodMs) % 2;
}
