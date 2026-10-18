import { describe, expect, test } from "vitest";
import { damageMap } from "../../combat/damage";
import type { SimEvent } from "../../sim/events";
import { DEFAULT_SETTINGS } from "../core/settings";
import { createDirector, type PresentationSystem } from "./director";
import { createNumberAggregator } from "./numbers";

const hit = (dealt: number, maxLife: number, crit = false): SimEvent => ({
  type: "hit",
  sourceId: "s" as never,
  targetId: "t" as never,
  lane: 2,
  x: 5,
  dealt,
  targetMaxLife: maxLife,
  breakdown: damageMap({ physical: dealt }),
  crit,
  avoidedBy: null,
});

describe("damage-number aggregation (H §2.5)", () => {
  const number = (amount: number, targetId = "t", sourceId = "s") =>
    ({
      kind: "number",
      sourceId,
      targetId,
      amount,
      type: "physical",
      crit: false,
      big: false,
      lane: 2,
      x: 5,
    }) as const;

  test("hits from one source on one target within 150 ms merge; later ones split", () => {
    const numbers = createNumberAggregator();
    const a = numbers.add(number(5), 0);
    const b = numbers.add(number(7), 140);
    expect(b).toBe(a);
    expect(a.amount).toBe(12);
    const c = numbers.add(number(3), 300);
    expect(c).not.toBe(a);
    expect(c.amount).toBe(3);
    expect(numbers.add(number(4, "other"), 310)).not.toBe(c);
  });

  test("DoT ticks are summed and shown every 0.5 s", () => {
    const numbers = createNumberAggregator();
    numbers.addDot("t", "fire", 1, 0);
    numbers.addDot("t", "fire", 1.5, 200);
    expect(numbers.flushDots(400)).toEqual([]);
    expect(numbers.flushDots(500)).toEqual([{ targetId: "t", type: "fire", amount: 2.5 }]);
    expect(numbers.flushDots(1000)).toEqual([]);
  });
});

describe("the dispatcher", () => {
  test("applies tier effects through the controllers and fans cues out to systems", () => {
    const seen: string[] = [];
    const system: PresentationSystem = { id: "test", consume: (cue) => void seen.push(cue.kind) };
    let now = 0;
    const director = createDirector({
      settings: () => DEFAULT_SETTINGS,
      now: () => now,
      speed: () => 1,
      systems: [system],
    });
    director.handle([{ type: "levelEnd", result: "won" }]);
    expect(director.frozen(now + 60)).toBe(true);
    expect(director.timeScale(now + 300)).toBeCloseTo(0.35);
    expect(director.shakeOffset(0.05)).not.toEqual({ x: 0, y: 0 });
    expect(seen).toContain("banner");
    expect(director.cueLog().at(-1)).toMatchObject({ event: "levelEnd", tier: 5 });
    now = 500;
    director.handle([{ type: "flagWarning", wave: 4 }]);
    expect(director.frozen(510)).toBe(false);
  });

  test("records T3+ events in the tier log when tierLog is on", () => {
    const director = createDirector({
      settings: () => ({ ...DEFAULT_SETTINGS, tierLog: true }),
      now: () => 0,
      speed: () => 1,
      systems: [],
    });
    director.handle([
      hit(1, 100),
      {
        type: "leak",
        monsterId: "m",
        lane: 2,
        rarity: "normal",
        cost: 1,
        lifeLeft: 19,
      } as SimEvent,
    ]);
    expect(director.tierLog()).toEqual([{ event: "leak", tier: 3 }]);
  });
});
