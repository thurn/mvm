import { describe, expect, test } from "vitest";
import { BAND_TUNING, NUMBER_TUNING } from "../../tuning/juice";
import { bandEffects, hitSoundId, hitstopMs } from "./bands";
import { NumberField, numberMotion, numberStyle } from "./numbers";

const hit = (over: Partial<Parameters<typeof numberStyle>[0]> = {}) => ({
  amount: 12.4,
  type: "physical" as const,
  crit: false,
  big: false,
  ...over,
});

describe("number spec (H §2.5)", () => {
  test("small and medium hits are 1.0×, big hits 1.3×, in the type's FX colour", () => {
    expect(numberStyle(hit(), "all")).toEqual({
      text: "12",
      color: NUMBER_TUNING.colors.physical,
      scale: 1,
    });
    expect(numberStyle(hit({ big: true, type: "cold" }), "all")).toEqual({
      text: "12",
      color: NUMBER_TUNING.colors.cold,
      scale: 1.3,
    });
  });

  test("crits are 1.5× with a trailing !, and stack with big", () => {
    expect(numberStyle(hit({ crit: true }), "all")).toMatchObject({ text: "12!", scale: 1.5 });
    expect(numberStyle(hit({ crit: true, big: true }), "all")!.scale).toBeCloseTo(1.95);
  });

  test("DoT ticks are 0.8× in the ailment's colour", () => {
    expect(numberStyle(hit({ type: "fire", dot: true }), "all")).toEqual({
      text: "12",
      color: NUMBER_TUNING.colors.fire,
      scale: 0.8,
    });
  });

  test("IMMUNE, EVADE and BLOCK are words in their own colours", () => {
    expect(numberStyle(hit({ amount: 0, words: "IMMUNE" }), "all")).toEqual({
      text: "IMMUNE",
      color: NUMBER_TUNING.words.IMMUNE,
      scale: 1,
    });
    expect(numberStyle(hit({ amount: 0, words: "EVADE" }), "all")!.color).toBe("#FFFFFF");
  });

  test("the numbers mode filters: crits shows only crits and big hits; off shows none", () => {
    expect(numberStyle(hit(), "crits")).toBeNull();
    expect(numberStyle(hit({ big: true }), "crits")).not.toBeNull();
    expect(numberStyle(hit({ crit: true }), "off")).toBeNull();
  });

  test("motion: pop 0.5 → 1.3 → 1.0 over 120 ms, then rise 14 px and fade in the last 200 ms", () => {
    expect(numberMotion(0).scale).toBeCloseTo(0.5);
    expect(numberMotion(0)).toMatchObject({ rise: 0, alpha: 1 });
    expect(numberMotion(120)).toMatchObject({ scale: 1, rise: 0, alpha: 1 });
    expect(Math.max(...[30, 60, 90].map((t) => numberMotion(t).scale))).toBeGreaterThan(1.1);
    const end = numberMotion(720);
    expect(end.rise).toBeCloseTo(14);
    expect(end.alpha).toBeCloseTo(0);
    expect(numberMotion(620).alpha).toBeCloseTo(0.5);
  });
});

describe("number cap (H §2.5)", () => {
  test("over 48, the oldest non-crit numbers fade early; crits are spared", () => {
    const field = new NumberField();
    field.add({ key: "crit-0", ...hit({ crit: true }) }, 0);
    for (let i = 1; i < NUMBER_TUNING.cap; i++) field.add({ key: `n${i}`, ...hit() }, i);
    expect(field.fading(100)).toEqual([]);
    field.add({ key: "late", ...hit() }, 100);
    expect(field.fading(100)).toEqual(["n1"]);
    field.add({ key: "later", ...hit() }, 101);
    expect(field.fading(101)).toEqual(["n1", "n2"]);
  });

  test("an early-faded number is gone 200 ms later", () => {
    const field = new NumberField();
    for (let i = 0; i <= NUMBER_TUNING.cap; i++) field.add({ key: `n${i}`, ...hit() }, 0);
    expect(field.live(199).map((n) => n.key)).toContain("n0");
    expect(field.live(201).map((n) => n.key)).not.toContain("n0");
  });

  test("a merged hit updates its number in place", () => {
    const field = new NumberField();
    field.add({ key: "a", ...hit({ amount: 5 }) }, 0);
    field.add({ key: "a", ...hit({ amount: 9 }) }, 50);
    expect(field.live(60)).toHaveLength(1);
    expect(field.live(60)[0]!.amount).toBe(9);
  });

  test("a merged hit keeps its first jitter, so the number never jumps sideways", () => {
    const field = new NumberField();
    field.add({ key: "a", ...hit({ amount: 5 }), jitter: 3 }, 0);
    field.add({ key: "a", ...hit({ amount: 9 }), jitter: -4 }, 50);
    expect(field.live(60)[0]!.jitter).toBe(3);
  });
});

describe("bands (H §2.6)", () => {
  test("the band chooses the sound variant and gain", () => {
    expect(hitSoundId("small")).toBe("hit_light");
    expect(hitSoundId("medium")).toBe("hit_medium");
    expect(hitSoundId("big")).toBe("hit_heavy");
    expect(bandEffects("small").gainDb).toBe(-6);
    expect(bandEffects("big").thump).toBe(true);
  });

  test("the band chooses the hitstop length: 0, 30, 60 ms; a crit is at least medium", () => {
    expect(hitstopMs("small", false)).toBe(0);
    expect(hitstopMs("medium", false)).toBe(30);
    expect(hitstopMs("big", false)).toBe(60);
    expect(hitstopMs("small", true)).toBe(BAND_TUNING.medium.hitstopMs);
  });
});
