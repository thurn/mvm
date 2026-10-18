import { describe, expect, test } from "vitest";
import type { SimEvent } from "../sim/events";
import { DEFAULT_SETTINGS } from "./core/settings";
import { JUICE_TUNING, KILL_TUNING } from "../tuning/juice";
import { cuesFor } from "./cues";

const tiles = [
  { lane: 1, column: 4 },
  { lane: 1, column: 5 },
  { lane: 2, column: 4 },
];

function impact(part: string) {
  return cuesFor(
    { type: "spellImpact", castId: "c-1", part, tiles, hits: 3 } as unknown as SimEvent,
    DEFAULT_SETTINGS,
  );
}

describe("Level 1 feel pass (1.38)", () => {
  test("a placement lands with a dust puff and a small thunk of shake", () => {
    const batch = cuesFor(
      { type: "placed", heroId: "h-1", cardId: "c", lane: 2, column: 3 } as unknown as SimEvent,
      DEFAULT_SETTINGS,
    );
    expect(batch.cues).toContainEqual(expect.objectContaining({ kind: "shake" }));
    const dust = batch.cues.find((c) => c.kind === "particles");
    expect(dust && "scale" in dust ? dust.scale : 1).toBeGreaterThan(1);
  });

  test("a spell lands in its element on every tile, and the finishers hit at T4", () => {
    const comet = impact("comet");
    expect(comet.tier).toBe(4);
    const particles = comet.cues.filter((c) => c.kind === "particles");
    expect(particles).toHaveLength(tiles.length);
    expect(particles.every((c) => c.kind === "particles" && c.preset === "frost")).toBe(true);
    expect(
      impact("explosion").cues.some((c) => c.kind === "particles" && c.preset === "embers"),
    ).toBe(true);
    expect(impact("aftershock").tier).toBe(4);
    expect(impact("impact").tier).toBe(3);
  });
});

describe("the lane cover budget (H §1.1; 1.38 acceptance)", () => {
  test("no juice effect drawn over a lane lasts more than 250 ms", () => {
    const covers = {
      "hero death tile flash": KILL_TUNING.heroTileFlashMs,
      "T5 full-screen flash": JUICE_TUNING.screen[5]?.flash?.ms ?? 0,
    };
    for (const [name, ms] of Object.entries(covers))
      expect([name, ms <= 250]).toEqual([name, true]);
  });
});
