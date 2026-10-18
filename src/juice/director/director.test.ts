import { describe, expect, test } from "vitest";
import { damageMap } from "../../combat/damage";
import type { SimEvent } from "../../sim/events";
import { DEFAULT_SETTINGS } from "../core/settings";
import { cuesFor } from "../cues";
import { createDirector, type PresentationSystem } from "./director";
import { createNumberAggregator } from "./numbers";
import type { Cue } from "./cue";

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

const kinds = (cues: readonly Cue[]) => [...new Set(cues.map((c) => c.kind))].sort();

describe("the cue table (H §1.3, §2.6)", () => {
  test.each([
    ["a small hit", hit(2, 100), 1, ["flash", "number", "particles", "sound"]],
    ["a medium hit", hit(10, 100), 1, ["flash", "hitstop", "number", "particles", "sound"]],
    ["a big hit", hit(30, 100), 2, ["flash", "hitstop", "number", "particles", "sound"]],
    ["a crit", hit(2, 100, true), 2, ["flash", "hitstop", "number", "particles", "sound"]],
    [
      "a normal kill",
      { type: "kill", sourceId: "s", targetId: "t", lane: 2, x: 5, rarity: "normal" } as SimEvent,
      2,
      ["death", "sound"],
    ],
    [
      "a rare kill",
      { type: "kill", sourceId: "s", targetId: "t", lane: 2, x: 5, rarity: "rare" } as SimEvent,
      3,
      ["death", "shake", "sound"],
    ],
    [
      "a leak",
      {
        type: "leak",
        monsterId: "m",
        lane: 2,
        rarity: "normal",
        cost: 1,
        lifeLeft: 19,
      } as SimEvent,
      3,
      ["hudBump", "shake", "sound"],
    ],
    [
      "a placement",
      { type: "placed", heroId: "h", lane: 2, column: 3 } as SimEvent,
      2,
      ["particles", "sound"],
    ],
    [
      "a flag warning",
      { type: "flagWarning", wave: 4 } as SimEvent,
      4,
      ["banner", "duck", "hitstop", "shake", "sound"],
    ],
    [
      "a won level",
      { type: "levelEnd", result: "won" } as SimEvent,
      5,
      ["banner", "duck", "hitstop", "shake", "slowmo", "sound"],
    ],
    [
      "mana collected",
      { type: "manaCollect", orbId: "o", amount: 25 } as SimEvent,
      0,
      ["hudBump", "sound"],
    ],
  ])("%s", (_name, event, tier, expected) => {
    const batch = cuesFor(event, DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    expect(kinds(batch.cues)).toEqual([...expected].sort());
  });

  test.each([
    ["normal", 1],
    ["magic", 2],
    ["rare", 3],
    ["unique", 5],
  ] as const)("a %s item drop is tier %d with a loot timeline", (rarity, tier) => {
    const event: SimEvent = {
      type: "drop",
      dropId: "d",
      monsterId: "m" as never,
      lane: 2,
      x: 5,
      drop: {
        kind: "item",
        item: { id: "i", baseId: "b" as never, rarity, itemLevel: 1, quality: 0, mods: [] },
      },
    };
    const batch = cuesFor(event, DEFAULT_SETTINGS);
    expect(batch.tier).toBe(tier);
    expect(batch.cues.some((c) => c.kind === "lootTimeline")).toBe(true);
  });
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
