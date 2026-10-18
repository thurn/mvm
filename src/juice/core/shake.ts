import { JUICE_TUNING } from "../../tuning/juice";
import type { JuiceSettings } from "./settings";

/** Two out-of-phase sines: smooth noise in [−1, 1] (H §2.2). */
function noise(a: number, b: number): number {
  return (Math.sin(a * 1.3 + b * 0.7) + Math.sin(a * 0.71 + b * 1.9 + 1.7)) / 2;
}

/** The trauma shake (H §2.2): events add trauma; it decays linearly; offsets are integer px. */
export function createShake(settings: () => JuiceSettings) {
  let trauma = 0;
  return {
    add(amount: number) {
      trauma = Math.min(1, trauma + amount);
    },
    update(dt: number) {
      trauma = Math.max(0, trauma - dt * JUICE_TUNING.traumaDecayPerSecond);
    },
    trauma: () => trauma,
    /** The board's offset at wall time `t` seconds; the HUD never shakes. */
    offset(t: number): { x: number; y: number } {
      const s = settings();
      const mode = s.shake === "off" ? 0 : s.shake === "low" ? JUICE_TUNING.shakeLowScale : 1;
      // juice scales the amplitude (0–2); the offset is still clamped to shakeMax.
      const amplitude = s.shakeMax * trauma * trauma * mode * s.juice;
      const f = JUICE_TUNING.shakeFrequency;
      const clamp = (v: number) => Math.max(-s.shakeMax, Math.min(s.shakeMax, Math.round(v)));
      return {
        x: clamp(amplitude * noise(t * f, 0)) || 0,
        y: clamp(amplitude * noise(0, t * f)) || 0,
      };
    },
  };
}
