import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS, type JuiceSettings } from "../core/settings";
import { createDirector } from "../director/director";
import { flashAlpha, ScreenEffects } from "./screen";
import { createTierSystem } from "./system";
import type { Tier } from "../../tuning/juice";

function setup(
  options: { speed?: number; settings?: Partial<JuiceSettings>; telegraph?: boolean } = {},
) {
  let now = 0;
  const ducks: [string, number, number][] = [];
  const screen = new ScreenEffects();
  const settings = { ...DEFAULT_SETTINGS, ...options.settings };
  const tiers = createTierSystem({
    audio: () => ({ duck: (bus, db, seconds) => void ducks.push([bus, db, seconds]) }),
    screen,
    now: () => now,
    settings: () => settings,
  });
  const director = createDirector({
    settings: () => settings,
    now: () => now,
    speed: () => options.speed ?? 1,
    systems: [tiers],
    telegraph: () => options.telegraph ?? false,
  });
  return {
    director,
    ducks,
    screen,
    settings,
    at: (ms: number) => (now = ms),
  };
}

/** How long the sim stays frozen after a fire at t = 0, in ms (1 ms resolution). */
function frozenMs(director: ReturnType<typeof createDirector>, from: number): number {
  let ms = 0;
  while (director.frozen(from + ms)) ms++;
  return ms;
}

describe("tier effects over the dispatcher (H §1.3)", () => {
  test.each([0, 1, 2] as Tier[])("T%d has no global effects", (tier) => {
    const { director, ducks, screen } = setup();
    director.fire(tier);
    director.update(0);
    expect(director.shakeOffset(0.1)).toEqual({ x: 0, y: 0 });
    expect(director.frozen(1)).toBe(false);
    expect(director.timeScale(1)).toBe(1);
    expect(ducks).toEqual([]);
    expect(screen.sample(1)).toEqual({ flash: 0, vignette: 0 });
  });

  test("T3 shakes only", () => {
    const { director, ducks } = setup();
    director.fire(3);
    expect(director.frozen(1)).toBe(false);
    expect(ducks).toEqual([]);
    expect(
      director
        .cueLog()
        .at(-1)!
        .cues.map((c) => c.kind),
    ).toEqual(["shake"]);
  });

  test("T4 freezes 60 ms, ducks music −4 dB for 1 s and pulses the vignette; a second T4 inside 1 s only shakes", () => {
    const { director, ducks, screen, at } = setup();
    director.fire(4);
    expect(frozenMs(director, 0)).toBe(60);
    expect(ducks).toEqual([["music", -4, 1]]);
    expect(screen.sample(0).vignette).toBeGreaterThan(0);
    expect(screen.sample(0).flash).toBe(0);
    at(500);
    director.fire(4);
    expect(director.frozen(500)).toBe(false);
    at(1100);
    director.fire(4);
    expect(director.frozen(1100)).toBe(true);
  });

  test("T5 freezes 120 ms, slows to 0.35× for 600 ms, ducks music and sfx, and flashes; slow-mo at most once per 4 s", () => {
    const { director, ducks, screen, at } = setup();
    director.fire(5);
    expect(frozenMs(director, 0)).toBe(120);
    expect(director.timeScale(300)).toBe(0.35);
    expect(director.timeScale(601)).toBe(1);
    expect(ducks).toEqual([
      ["music", -8, 2],
      ["sfx", -6, 1],
    ]);
    expect(screen.sample(0).flash).toBeCloseTo(0.6);
    at(2000);
    director.fire(5);
    expect(director.timeScale(2100)).toBe(1);
    at(4100);
    director.fire(5);
    expect(director.timeScale(4200)).toBe(0.35);
  });

  test("slow-mo never starts during a telegraph", () => {
    const { director } = setup({ telegraph: true });
    director.fire(5);
    expect(director.timeScale(100)).toBe(1);
    expect(director.frozen(1)).toBe(true);
  });

  test("at 2× speed, hitstop and slow-mo halve", () => {
    const { director } = setup({ speed: 2 });
    director.fire(5);
    expect(frozenMs(director, 0)).toBe(60);
    expect(director.timeScale(299)).toBe(0.35);
    expect(director.timeScale(301)).toBe(1);
  });
});

describe("screen flash (H accessibility)", () => {
  test('"reduce flashing" caps white flashes at 40% alpha', () => {
    expect(flashAlpha(0.6, { ...DEFAULT_SETTINGS, reduceFlashing: true })).toBeCloseTo(0.4);
    expect(flashAlpha(0.3, { ...DEFAULT_SETTINGS, reduceFlashing: true })).toBeCloseTo(0.3);
    expect(flashAlpha(0.6, DEFAULT_SETTINGS)).toBeCloseTo(0.6);
    const { director, screen } = setup({ settings: { reduceFlashing: true } });
    director.fire(5);
    expect(screen.sample(0).flash).toBeLessThanOrEqual(0.4);
  });

  test("a T4 vignette never cuts a stronger T5 vignette short", () => {
    const screen = new ScreenEffects();
    screen.start(5, 0, DEFAULT_SETTINGS);
    const deep = screen.sample(50).vignette;
    screen.start(4, 50, DEFAULT_SETTINGS);
    expect(screen.sample(50).vignette).toBeCloseTo(deep);
  });

  test("the juice knob scales the flash, and 0 turns it off", () => {
    expect(flashAlpha(0.6, { ...DEFAULT_SETTINGS, juice: 0 })).toBe(0);
  });
});
