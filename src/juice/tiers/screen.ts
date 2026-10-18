import { fxProbe } from "../core/probe";
import { JUICE_TUNING, type Tier } from "../../tuning/juice";
import type { JuiceSettings } from "../core/settings";

/** A white flash's alpha after the juice knob and "reduce flashing" (H §13). */
export function flashAlpha(alpha: number, settings: JuiceSettings): number {
  const scaled = alpha * Math.min(1, settings.juice);
  return settings.reduceFlashing ? Math.min(JUICE_TUNING.reduceFlashingMaxAlpha, scaled) : scaled;
}

interface Pulse {
  alpha: number;
  start: number;
  ms: number;
}

const fade = (pulse: Pulse | null, now: number) =>
  pulse && now >= pulse.start && now < pulse.start + pulse.ms
    ? pulse.alpha * (1 - (now - pulse.start) / pulse.ms)
    : 0;

/** The full-screen flash and edge vignette that T4 and T5 start; each fades linearly. */
export class ScreenEffects {
  private flash: Pulse | null = null;
  private vignette: Pulse | null = null;

  start(tier: Tier, now: number, settings: JuiceSettings): void {
    const row = JUICE_TUNING.screen[tier];
    if (!row) return;
    // A weaker pulse never replaces a stronger one still showing.
    const stronger = (current: Pulse | null, next: Pulse) =>
      fade(current, now) > next.alpha ? current : next;
    if (row.flash)
      this.flash = stronger(this.flash, {
        alpha: flashAlpha(row.flash.alpha, settings),
        start: now,
        ms: row.flash.ms,
      });
    if (row.vignette)
      this.vignette = stronger(this.vignette, {
        alpha: row.vignette.alpha * Math.min(1, settings.juice),
        start: now,
        ms: row.vignette.ms,
      });
    fxProbe.screen(fade(this.flash, now), fade(this.vignette, now));
  }

  sample(now: number): { flash: number; vignette: number } {
    return { flash: fade(this.flash, now), vignette: fade(this.vignette, now) };
  }
}
