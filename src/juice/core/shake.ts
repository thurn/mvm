import { fxProbe } from "./probe";
import { JUICE_TUNING } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

/** Two out-of-phase sines: smooth noise in [−1, 1] (H §2.2). */
function noise(a: number, b: number): number {
  return (Math.sin(a * 1.3 + b * 0.7) + Math.sin(a * 0.71 + b * 1.9 + 1.7)) / 2;
}

/** The trauma shake (H §2.2): events add trauma; it decays linearly; offsets are integer px. */
export function createShake(settings: () => JuiceSettings) {
  let trauma = 0;
  /** The shake's size in px now: shakeMax × trauma² × shake mode × juice. */
  const amplitude = () => {
    const s = settings();
    const mode = s.shake === "off" ? 0 : s.shake === "low" ? JUICE_TUNING.shakeLowScale : 1;
    return Math.min(s.shakeMax, s.shakeMax * trauma * trauma * mode * s.juice);
  };
  return {
    add(amount: number) {
      trauma = Math.min(1, trauma + amount);
      fxProbe.shake(amplitude());
    },
    update(dt: number) {
      trauma = Math.max(0, trauma - dt * JUICE_TUNING.traumaDecayPerSecond);
    },
    trauma: () => trauma,
    /** The board's offset at wall time `t` seconds; the HUD never shakes. */
    offset(t: number): { x: number; y: number } {
      const s = settings();
      // juice scales the amplitude (0–2); the offset is still clamped to shakeMax.
      const size = amplitude();
      const f = JUICE_TUNING.shakeFrequency;
      const clamp = (v: number) => Math.max(-s.shakeMax, Math.min(s.shakeMax, Math.round(v)));
      return {
        x: clamp(size * noise(t * f, 0)) || 0,
        y: clamp(size * noise(0, t * f)) || 0,
      };
    },
  };
}
