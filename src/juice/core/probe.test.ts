import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS, type JuiceSettings } from "./settings";
import { createDirector } from "../director/director";
import { createParticlePool } from "./particles";
import { fxProbe } from "./probe";
import { ScreenEffects } from "../tiers/screen";

/** What one T5 moment (a won level) and one dust burst start, at a juice setting. */
function measure(juice: number) {
  const settings: JuiceSettings = { ...DEFAULT_SETTINGS, juice };
  fxProbe.peaks();
  const director = createDirector({
    settings: () => settings,
    now: () => 0,
    speed: () => 1,
    systems: [],
  });
  director.handle([{ type: "levelEnd", result: "won" }]);
  createParticlePool(() => settings).emit("dust", 0, 0);
  new ScreenEffects().start(5, 0, settings);
  return fxProbe.peaks();
}

describe("window.__mvm.fx (mason hv-7ic2.108)", () => {
  test("the juice A/B reads as numbers: juice 1 starts particles, shake and a flash; juice 0 none", () => {
    const on = measure(1);
    expect(on.emitted.dust).toBeGreaterThan(0);
    expect(on.shake).toBeGreaterThan(0);
    expect(on.flash).toBeGreaterThan(0);
    const off = measure(0);
    expect(off.emitted).toEqual({});
    expect(off.shake).toBe(0);
    expect(off.flash).toBe(0);
  });

  test("peaks() consumes what it reports; live particles fall as pools retire them", () => {
    const pool = createParticlePool(() => DEFAULT_SETTINGS);
    fxProbe.peaks();
    const start = fxProbe.live();
    pool.emit("dust", 0, 0);
    expect(fxProbe.live()).toBeGreaterThan(start);
    expect(fxProbe.peaks().emitted.dust).toBeGreaterThan(0);
    expect(fxProbe.peaks().emitted).toEqual({});
    pool.update(10);
    expect(fxProbe.live()).toBe(start);
  });
});

test("a pool that stops updating (its board unmounted) stops counting as live", () => {
  vi.useFakeTimers();
  try {
    const pool = createParticlePool(() => DEFAULT_SETTINGS);
    pool.emit("dust", 0, 0);
    expect(fxProbe.live()).toBeGreaterThan(0);
    vi.advanceTimersByTime(1500);
    expect(fxProbe.live()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
