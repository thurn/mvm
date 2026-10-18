import type { DamageType } from "../../combat/stats";
import { NUMBER_TUNING as T } from "../../tuning/juice";
import { EASINGS } from "../core/easing";
import type { JuiceSettings } from "../core/settings";

export interface NumberInput {
  amount: number;
  type: DamageType;
  crit: boolean;
  big: boolean;
  /** A summed DoT tick (0.8×, ailment colour). */
  dot?: boolean;
  words?: "IMMUNE" | "EVADE" | "BLOCK";
}

/** How a number reads: its text, colour and size (H §2.5), or null when the mode hides it. */
export function numberStyle(
  n: NumberInput,
  mode: JuiceSettings["numbers"],
): { text: string; color: string; scale: number } | null {
  if (mode === "off" || (mode === "crits" && !n.crit && !n.big)) return null;
  if (n.words) return { text: n.words, color: T.words[n.words], scale: 1 };
  const scale = n.dot ? T.dotScale : (n.crit ? T.critScale : 1) * (n.big ? 1.3 : 1);
  return {
    text: `${Math.round(n.amount)}${n.crit ? "!" : ""}`,
    color: T.colors[n.type],
    scale,
  };
}

/** A number's pop, rise and fade `ageMs` after it appeared (H §2.5). */
export function numberMotion(ageMs: number): { scale: number; rise: number; alpha: number } {
  if (ageMs < T.popMs) {
    // 0.5 → 1.3 over the first two thirds (outBack), then settle to 1.0.
    const up = (T.popMs * 2) / 3;
    const scale =
      ageMs < up
        ? T.popFrom + (T.popPeak - T.popFrom) * EASINGS.outBack(ageMs / up)
        : T.popPeak + (1 - T.popPeak) * ((ageMs - up) / (T.popMs - up));
    return { scale, rise: 0, alpha: 1 };
  }
  const t = Math.min(1, (ageMs - T.popMs) / T.riseMs);
  const end = T.popMs + T.riseMs;
  const alpha = ageMs <= end - T.fadeMs ? 1 : Math.max(0, (end - ageMs) / T.fadeMs);
  return { scale: 1, rise: T.risePx * EASINGS.outQuad(t), alpha };
}

export interface LiveNumber extends NumberInput {
  key: string;
  bornAt: number;
  /** Set when the cap fades it early. */
  fadeFrom?: number;
  lane?: number;
  x?: number;
  jitter?: number;
}

/**
 * The live numbers (H §2.5): at most 48; over the cap the oldest non-crit
 * numbers fade out early over 200 ms. A merged hit (same key) updates in place.
 */
export class NumberField {
  private numbers: LiveNumber[] = [];

  add(number: Omit<LiveNumber, "bornAt">, now: number): void {
    const existing = this.numbers.find((n) => n.key === number.key && n.fadeFrom === undefined);
    if (existing) {
      Object.assign(existing, number);
      return;
    }
    this.numbers.push({ ...number, bornAt: now });
    let over = this.numbers.filter((n) => n.fadeFrom === undefined).length - T.cap;
    for (const n of this.numbers) {
      if (over <= 0) break;
      if (n.crit || n.fadeFrom !== undefined) continue;
      n.fadeFrom = now;
      over--;
    }
  }

  /** Keys fading early at `now`, oldest first. */
  fading(now: number): string[] {
    return this.live(now)
      .filter((n) => n.fadeFrom !== undefined)
      .map((n) => n.key);
  }

  /** The numbers still showing at `now`; expired ones are dropped. */
  live(now: number): LiveNumber[] {
    this.numbers = this.numbers.filter((n) =>
      n.fadeFrom !== undefined ? now - n.fadeFrom < T.fadeMs : now - n.bornAt < T.popMs + T.riseMs,
    );
    return this.numbers;
  }
}
