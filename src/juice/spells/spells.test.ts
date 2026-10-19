import { describe, expect, test } from "vitest";
import { createLayerStack } from "../../render/layers";
import { createRound, type PendingSpellPart } from "../../sim/state";
import { shapeTiles } from "../../spells/shapes";
import { createSettings } from "../core/settings";
import { createPresentation } from "../director/systems";
import { spellSystem } from "./system";

const TILE = 64;

/** A canvas that records each rectangle drawn and the alpha it was drawn at. */
function recordingCtx() {
  const rects: { op: "fill" | "stroke"; x: number; y: number; alpha: number }[] = [];
  let alpha = 1;
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, key) => {
      if (key === "globalAlpha") return alpha;
      if (key === "fillRect" || key === "strokeRect")
        return (x: number, y: number) =>
          rects.push({ op: key === "fillRect" ? "fill" : "stroke", x, y, alpha });
      return typeof key === "string" ? () => {} : undefined;
    },
    set: (_t, key, value) => {
      if (key === "globalAlpha") alpha = value as number;
      return true;
    },
  });
  return { ctx, rects };
}

const tileOf = (x: number, y: number) => ({
  lane: Math.floor(y / TILE),
  column: Math.floor(x / TILE) + 1,
});

function setup(juice = 1, reduceFlashing = false) {
  let now = 0;
  const settings = createSettings(null);
  settings.set({ juice, reduceFlashing });
  const stack = createLayerStack();
  const { director } = createPresentation({
    stack,
    settings,
    now: () => now,
    speed: () => 1,
    factories: [spellSystem],
  });
  const state = createRound({ seed: 1, lanes: [0, 1, 2, 3, 4], mana: 0 });
  const draw = (at: number) => {
    now = at;
    const rec = recordingCtx();
    stack.draw(rec.ctx, { state, previousX: new Map(), alpha: 0, shake: { x: 0, y: 0 }, now });
    return rec.rects;
  };
  return { state, director, draw };
}

const SHAPE = { kind: "square", size: 3 } as const;

describe("spell telegraphs and impact flashes (H §1.1, hv-7ic2.86)", () => {
  test("from cast to landing, the telegraph outlines exactly the shape's tiles, under 45% alpha", () => {
    const { state, draw } = setup();
    state.spells.push({ lane: 2, column: 5, shape: SHAPE, part: "comet" } as PendingSpellPart);
    const rects = draw(100);
    const outlined = rects.filter((r) => r.op === "stroke").map((r) => tileOf(r.x, r.y));
    const expected = shapeTiles(SHAPE, 2, 5, state.lanes);
    expect(new Set(outlined.map((t) => `${t.lane}:${t.column}`))).toEqual(
      new Set(expected.map((t) => `${t.lane}:${t.column}`)),
    );
    expect(rects.every((r) => r.alpha <= 0.45)).toBe(true);
    state.spells.length = 0;
    expect(draw(200)).toEqual([]);
  });

  test("an impact flashes its tiles in the element's colour and is gone within 250 ms", () => {
    const { director, draw } = setup();
    const tiles = shapeTiles(SHAPE, 2, 5, [0, 1, 2, 3, 4]);
    director.handle([
      { type: "spellImpact", castId: "c" as never, part: "comet", lane: 2, column: 5, tiles },
    ]);
    const lit = draw(20).filter((r) => r.op === "fill" && r.alpha > 0);
    expect(
      new Set(lit.map((r) => `${tileOf(r.x, r.y).lane}:${tileOf(r.x, r.y).column}`)).size,
    ).toBe(tiles.length);
    expect(draw(260).filter((r) => r.op === "fill")).toEqual([]);
  });

  test("the flash is gone at juice 0 and capped under reduce flashing", () => {
    const tiles = [{ lane: 2, column: 5 }];
    const impact = {
      type: "spellImpact",
      castId: "c" as never,
      part: "impact",
      lane: 2,
      column: 5,
      tiles,
    } as const;
    const off = setup(0);
    off.director.handle([impact]);
    expect(off.draw(20).filter((r) => r.op === "fill")).toEqual([]);
    const full = setup(1);
    full.director.handle([impact]);
    const reduced = setup(1, true);
    reduced.director.handle([impact]);
    const peak = (rects: { op: string; alpha: number }[]) =>
      Math.max(0, ...rects.filter((r) => r.op === "fill").map((r) => r.alpha));
    expect(peak(reduced.draw(5))).toBeLessThan(peak(full.draw(5)));
  });
});
