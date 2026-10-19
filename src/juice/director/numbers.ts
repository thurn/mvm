import type { DamageType } from "../../combat/stats";
import type { Cue } from "./cue";

type NumberCue = Extract<Cue, { kind: "number" }>;

/** A live damage number: a hit, or several merged hits, counting up. */
export interface NumberSpec {
  sourceId: string;
  targetId: string;
  amount: number;
  type: DamageType;
  crit: boolean;
  big: boolean;
  lane: number;
  x: number;
  words?: NumberCue["words"];
  /** Resistance reduced one of its hits (GDD §15's shield). */
  resisted?: boolean;
  /** Wall-clock ms of the latest merged hit. */
  lastAt: number;
}

const MERGE_MS = 150;
const DOT_MS = 500;

/**
 * Damage-number aggregation (H §2.5): hits from one source on one target
 * within 150 ms merge into one counting number; DoT ticks are summed and
 * shown every 0.5 s.
 */
export function createNumberAggregator() {
  const live = new Map<string, NumberSpec>();
  const dots = new Map<string, { targetId: string; type: DamageType; amount: number }>();
  let lastDotFlush = 0;
  return {
    add(cue: NumberCue, now: number): NumberSpec {
      const key = `${cue.sourceId}>${cue.targetId}`;
      const existing = live.get(key);
      if (existing && !cue.words && !existing.words && now - existing.lastAt <= MERGE_MS) {
        existing.amount += cue.amount;
        existing.crit ||= cue.crit;
        existing.big ||= cue.big;
        if (cue.resisted) existing.resisted = true;
        existing.lastAt = now;
        return existing;
      }
      const spec: NumberSpec = { ...cue, lastAt: now };
      live.set(key, spec);
      return spec;
    },
    addDot(targetId: string, type: DamageType, amount: number, now: number) {
      void now;
      const key = `${targetId}:${type}`;
      const dot = dots.get(key) ?? { targetId, type, amount: 0 };
      dot.amount += amount;
      dots.set(key, dot);
    },
    /** The summed DoT numbers due at `now`, every 0.5 s. */
    flushDots(now: number): { targetId: string; type: DamageType; amount: number }[] {
      if (now - lastDotFlush < DOT_MS) return [];
      lastDotFlush = now;
      const out = [...dots.values()].filter((d) => d.amount > 0);
      dots.clear();
      return out;
    },
  };
}
