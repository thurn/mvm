import { describe, expect, test } from "vitest";
import type { SimEvent } from "../sim/events";
import { DEFAULT_SETTINGS } from "./core/settings";
import { cuesFor } from "./cues";

const hit = (resisted: boolean): SimEvent => ({
  type: "hit",
  sourceId: "m1" as never,
  targetId: "h1" as never,
  lane: 2,
  x: 3,
  dealt: 10,
  targetMaxLife: 100,
  breakdown: { physical: 0, fire: 10, cold: 0, lightning: 0, chaos: 0 },
  crit: false,
  avoidedBy: null,
  resisted,
});

describe("the resisted-hit icon (GDD §15 In level)", () => {
  test("a hit resistance reduced marks its number; an unresisted one doesn't", () => {
    const number = (e: SimEvent) =>
      cuesFor(e, DEFAULT_SETTINGS).cues.find((c) => c.kind === "number") as { resisted?: boolean };
    expect(number(hit(true)).resisted).toBe(true);
    expect(number(hit(false)).resisted).toBeFalsy();
  });
});

describe("which hits count as resisted (A §5.3)", () => {
  test("only elemental or chaos damage that resistance cut", async () => {
    const { resisted } = await import("../sim/combat");
    const map = (fire: number, physical = 0) => ({
      physical,
      fire,
      cold: 0,
      lightning: 0,
      chaos: 0,
    });
    expect(resisted({ preMitigation: map(10), dealt: map(7) })).toBe(true);
    expect(resisted({ preMitigation: map(10), dealt: map(10) })).toBe(false);
    expect(resisted({ preMitigation: map(0, 10), dealt: map(0, 6) })).toBe(false);
  });
});
