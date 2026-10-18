import { placeHero } from "../../heroes/board/place";
import { starterCard } from "../../heroes/model/starter";
import { createLayerStack } from "../../render/layers";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import { createSettings } from "../core/settings";
import { createPresentation } from "../director/systems";
import { manaSystem } from "./system";
import { describe, expect, test } from "vitest";
import { MANA_JUICE } from "../../tuning/juice";
import { ManaCounter, orbFlight, orbOffset, orbSize, placementPose, shovelPose } from "./timeline";

describe("orbs (H §3.6)", () => {
  test("a sky orb falls the last 18 px at 40 px/s and lands as the 0.5 s rest begins", () => {
    expect(orbOffset("sky", 0).dy).toBeCloseTo(-18);
    expect(orbOffset("sky", MANA_JUICE.skyFallMs)).toEqual({ dx: 0, dy: -0 });
    expect(orbOffset("sky", 2000)).toEqual({ dx: 0, dy: -0 });
  });

  test("an acolyte orb pops out in a 20 px arc", () => {
    expect(orbOffset("acolyte", MANA_JUICE.acolyteArcMs / 2).dy).toBeCloseTo(-20);
    expect(orbOffset("acolyte", MANA_JUICE.acolyteArcMs)).toMatchObject({ dx: -0 });
  });

  test("the collect flight takes 450 ms from the tile to the counter", () => {
    const from = { x: 100, y: 200 };
    const to = { x: 10, y: -10 };
    expect(orbFlight(from, to, 0)).toEqual({ ...from, done: false });
    const end = orbFlight(from, to, MANA_JUICE.flightMs);
    expect(end.done).toBe(true);
    expect(end.x).toBeCloseTo(10);
    expect(end.y).toBeCloseTo(-10);
    expect(orbFlight(from, to, 449).done).toBe(false);
  });

  test("Spirit-boosted orbs draw larger: +1 px per 10 mana over 25, up to 16 px", () => {
    expect(orbSize(25)).toBe(10);
    expect(orbSize(45)).toBe(12);
    expect(orbSize(500)).toBe(16);
  });
});

describe("mana counter (H §3.6)", () => {
  test("the displayed value rolls to the sim value over 200 ms and converges", () => {
    const counter = new ManaCounter(50);
    counter.set(75, 1000);
    expect(counter.shown(1000)).toBe(50);
    expect(counter.shown(1100)).toBeCloseTo(62.5);
    expect(counter.shown(1200)).toBe(75);
    counter.set(100, 1150);
    expect(counter.shown(1150)).toBeCloseTo(68.75);
    expect(counter.shown(1350)).toBe(100);
    counter.set(25, 2000);
    expect(counter.shown(5000)).toBe(25);
  });
});

describe("placement (H §5.2)", () => {
  test("drops in from −24 px over 150 ms, squashes 1.15 × 0.85 back to 1 over 120 ms", () => {
    expect(placementPose(0)).toEqual({ dy: -24, sx: 1, sy: 1 });
    expect(placementPose(150)).toEqual({ dy: 0, sx: 1.15, sy: 0.85 });
    expect(placementPose(210).sx).toBeCloseTo(1.075);
    expect(placementPose(270)).toEqual({ dy: 0, sx: 1, sy: 1 });
  });

  test("a shovelled hero sinks 8 px and fades out over 200 ms", () => {
    expect(shovelPose(100)).toEqual({ dy: 4, alpha: 0.5, done: false });
    expect(shovelPose(200)).toMatchObject({ dy: 8, alpha: 0, done: true });
  });
});

describe("the acolyte's crook glow (H §3.6; found by mason hv-7ic2.100)", () => {
  test("it shows in the last 0.8 s before an orb, and not before", () => {
    const state = createRound({ seed: 3, lanes: [1, 2, 3], mana: 0 });
    placeHero(state, starterCard(id<"Gem">("MvM/Heroes/EzomyteAcolyte"), 1, "a"), 2, 1);
    const kit = state.heroes[0]!.kit!;
    if (kit.behavior !== "acolyte") throw new Error("not an acolyte");
    const stack = createLayerStack();
    createPresentation({
      stack,
      settings: createSettings(null),
      now: () => 0,
      speed: () => 1,
      factories: [manaSystem],
    });
    const arcs = (orbTimer: number) => {
      kit.counters.orbTimer = orbTimer;
      let count = 0;
      const ctx = new Proxy({} as CanvasRenderingContext2D, {
        get: (_target, key) =>
          key === "arc"
            ? () => void count++
            : typeof key === "string"
              ? () => ({ addColorStop() {} })
              : undefined,
        set: () => true,
      });
      stack.draw(ctx, { state, previousX: new Map(), alpha: 0, shake: { x: 0, y: 0 }, now: 0 });
      return count;
    };
    expect(arcs(5)).toBe(0);
    expect(arcs(0.4)).toBeGreaterThan(0);
  });
});
