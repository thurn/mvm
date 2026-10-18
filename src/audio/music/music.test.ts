import { describe, expect, test } from "vitest";
import { MUSIC_TUNING } from "../../tuning/audio";
import { crossfadeGains } from "./crossfade";
import { IntensityState } from "./intensity";

describe("intensity state (H §10.4)", () => {
  test("enters on a flag warning and leaves 6 s after it", () => {
    const state = new IntensityState();
    expect(state.update(0, 0)).toBe(false);
    state.flagWarning(1);
    expect(state.update(1, 3)).toBe(true);
    expect(state.update(6.9, 3)).toBe(true);
    expect(state.update(7.01, 3)).toBe(false);
  });

  test("enters above 12 monsters, holds while they stay, and leaves 6 s after they drop", () => {
    const state = new IntensityState();
    expect(state.update(0, MUSIC_TUNING.intensityMonsters)).toBe(false);
    expect(state.update(1, 13)).toBe(true);
    for (let t = 2; t <= 30; t++) expect(state.update(t, 20)).toBe(true);
    expect(state.update(31, 5)).toBe(true);
    expect(state.update(35.9, 5)).toBe(true);
    expect(state.update(36.1, 5)).toBe(false);
  });

  test("a new trigger during the hold extends it", () => {
    const state = new IntensityState();
    state.flagWarning(0);
    state.update(4, 0);
    state.flagWarning(5);
    expect(state.update(10, 0)).toBe(true);
    expect(state.update(11.1, 0)).toBe(false);
  });
});

describe("crossfade (H §10.4)", () => {
  const T = MUSIC_TUNING.crossfadeSeconds;

  test("starts on the old track and ends on the new one", () => {
    expect(crossfadeGains(0, T)).toEqual({ from: 1, to: 0 });
    const end = crossfadeGains(T, T);
    expect(end.from).toBeCloseTo(0);
    expect(end.to).toBeCloseTo(1);
    expect(crossfadeGains(T * 2, T)).toEqual(end);
  });

  test("is equal-power: the summed power stays 1, and the midpoint is about −3 dB each", () => {
    for (let t = 0; t <= T; t += T / 20) {
      const { from, to } = crossfadeGains(t, T);
      expect(from ** 2 + to ** 2).toBeCloseTo(1);
    }
    const mid = crossfadeGains(T / 2, T);
    expect(mid.from).toBeCloseTo(Math.SQRT1_2);
    expect(mid.to).toBeCloseTo(Math.SQRT1_2);
  });

  test("the new track rises and the old one falls monotonically", () => {
    let last = crossfadeGains(0, T);
    for (let t = T / 30; t <= T; t += T / 30) {
      const g = crossfadeGains(t, T);
      expect(g.to).toBeGreaterThanOrEqual(last.to);
      expect(g.from).toBeLessThanOrEqual(last.from);
      last = g;
    }
  });
});
