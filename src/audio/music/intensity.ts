import { MUSIC_TUNING } from "../../tuning/audio";

/**
 * Whether the intensity layer plays (H §10.4): it comes in on a flag warning
 * and while more than 12 monsters are on the board, and leaves 6 s after the
 * last of either. Times are seconds.
 */
export class IntensityState {
  private lastTrigger = -Infinity;

  flagWarning(t: number): void {
    this.lastTrigger = Math.max(this.lastTrigger, t);
  }

  update(t: number, monsters: number): boolean {
    if (monsters > MUSIC_TUNING.intensityMonsters) this.lastTrigger = t;
    return t - this.lastTrigger < MUSIC_TUNING.intensityHoldSeconds;
  }
}
