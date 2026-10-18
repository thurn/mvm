import { expect, test } from "vitest";
import { createStreams, draw, RNG_STREAMS } from "./rng";

test("draws are in [0, 1) and repeat for the same seed", () => {
  const a = createStreams(42);
  const b = createStreams(42);
  for (let i = 0; i < 1000; i++) {
    const value = draw(a, "combat");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
    expect(draw(b, "combat")).toBe(value);
  }
});

test("different seeds and different streams diverge", () => {
  expect(draw(createStreams(1), "combat")).not.toBe(draw(createStreams(2), "combat"));
  const streams = createStreams(1);
  expect(draw(streams, "combat")).not.toBe(draw(streams, "loot"));
});

test("drawing from one stream leaves every other stream's state unchanged", () => {
  for (const name of RNG_STREAMS) {
    const streams = createStreams(7);
    const before = structuredClone(streams);
    for (let i = 0; i < 100; i++) draw(streams, name);
    for (const other of RNG_STREAMS) {
      if (other === name) expect(streams[other]).not.toEqual(before[other]);
      else expect(streams[other]).toEqual(before[other]);
    }
  }
});

test("stream state is plain JSON numbers", () => {
  const streams = createStreams(3);
  draw(streams, "waves");
  const copy = JSON.parse(JSON.stringify(streams)) as typeof streams;
  expect(draw(copy, "waves")).toBe(draw(streams, "waves"));
});
