import { describe, expect, test } from "vitest";
import { seededRng } from "../../combat/test-rng";
import { JUICE_TUNING } from "../../tuning/juice";
import { EASINGS } from "./easing";
import { createHitstop } from "./hitstop";
import { createParticlePool } from "./particles";
import { createSettings, DEFAULT_SETTINGS, type JuiceSettings } from "./settings";
import { createShake } from "./shake";
import { significance } from "./significance";
import { createSlowmo } from "./slowmo";

const settings = (overrides: Partial<JuiceSettings> = {}) => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

describe("easings (H §2.1)", () => {
  test.each(Object.keys(EASINGS))("%s runs from 0 to 1", (name) => {
    const ease = EASINGS[name as keyof typeof EASINGS];
    expect(ease(0)).toBeCloseTo(0, 6);
    expect(ease(1)).toBeCloseTo(1, 6);
  });

  test("outBack overshoots and inBack dips", () => {
    expect(
      Math.max(...Array.from({ length: 101 }, (_, i) => EASINGS.outBack(i / 100))),
    ).toBeGreaterThan(1);
    expect(
      Math.min(...Array.from({ length: 101 }, (_, i) => EASINGS.inBack(i / 100))),
    ).toBeLessThan(0);
  });
});

describe("the trauma shake (H §2.2)", () => {
  test("trauma decays linearly at 1.6 per second and is clamped to 1", () => {
    const shake = createShake(() => settings());
    shake.add(0.6);
    shake.add(0.6);
    expect(shake.trauma()).toBe(1);
    shake.update(0.25);
    expect(shake.trauma()).toBeCloseTo(1 - 0.4);
    shake.update(10);
    expect(shake.trauma()).toBe(0);
  });

  test("offsets are integers of at most shakeMax", () => {
    for (const shakeMax of [6, 3, 12]) {
      const shake = createShake(() => settings({ shakeMax }));
      shake.add(1);
      for (let t = 0; t < 2; t += 0.013) {
        const { x, y } = shake.offset(t);
        expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        expect(Math.abs(x)).toBeLessThanOrEqual(shakeMax);
        expect(Math.abs(y)).toBeLessThanOrEqual(shakeMax);
      }
    }
  });

  test("Low halves the shake and Off removes it", () => {
    const full = createShake(() => settings());
    const low = createShake(() => settings({ shake: "low" }));
    const off = createShake(() => settings({ shake: "off" }));
    for (const s of [full, low, off]) s.add(1);
    let maxFull = 0;
    let maxLow = 0;
    for (let t = 0; t < 1; t += 0.01) {
      maxFull = Math.max(maxFull, Math.abs(full.offset(t).x));
      maxLow = Math.max(maxLow, Math.abs(low.offset(t).x));
      expect(off.offset(t)).toEqual({ x: 0, y: 0 });
    }
    expect(maxLow).toBeLessThanOrEqual(Math.ceil(maxFull / 2));
  });
});

describe("hitstop (H §2.3)", () => {
  test("a global hitstop freezes for its tier's duration", () => {
    const hitstop = createHitstop(() => settings());
    expect(hitstop.global(4, 1000, 1)).toBe(true);
    expect(hitstop.frozen(1000 + 59)).toBe(true);
    expect(hitstop.frozen(1000 + 61)).toBe(false);
  });

  test("a second global hitstop within 1.0 s is refused, so the caller adds shake only", () => {
    const hitstop = createHitstop(() => settings());
    expect(hitstop.global(5, 0, 1)).toBe(true);
    expect(hitstop.global(4, 900, 1)).toBe(false);
    expect(hitstop.global(4, 1001, 1)).toBe(true);
  });

  test("at 2× speed hitstops halve", () => {
    const hitstop = createHitstop(() => settings());
    hitstop.global(5, 0, 2);
    expect(hitstop.frozen(59)).toBe(true);
    expect(hitstop.frozen(61)).toBe(false);
    hitstop.actor("m1", 2, false, 5000, 2);
    expect(hitstop.actorFrozen("m1", 5014)).toBe(true);
    expect(hitstop.actorFrozen("m1", 5016)).toBe(false);
  });

  test("actor hitstop holds only that actor's clock: T2 30 ms, T3 50 ms, +30 ms for big hits", () => {
    const hitstop = createHitstop(() => settings());
    hitstop.actor("a", 3, true, 0, 1);
    expect(hitstop.actorFrozen("a", 79)).toBe(true);
    expect(hitstop.actorFrozen("a", 81)).toBe(false);
    expect(hitstop.actorFrozen("b", 10)).toBe(false);
  });
});

describe("slow-mo", () => {
  test("slows time for its duration, at most once per 4 s, halved at 2×", () => {
    const slowmo = createSlowmo(() => settings());
    expect(slowmo.start(0.35, 600, 0, 1)).toBe(true);
    expect(slowmo.timeScale(300)).toBe(0.35);
    expect(slowmo.timeScale(601)).toBe(1);
    expect(slowmo.start(0.35, 600, 3999, 1)).toBe(false);
    expect(slowmo.start(0.35, 600, 4001, 2)).toBe(true);
    expect(slowmo.timeScale(4001 + 299)).toBe(0.35);
    expect(slowmo.timeScale(4001 + 301)).toBe(1);
  });
});

describe("the particle pool (H §2.7)", () => {
  test("never exceeds its capacity", () => {
    const pool = createParticlePool(() => settings(), seededRng(1));
    for (let i = 0; i < 1000; i++) pool.emit("sparks", 10, 10);
    expect(pool.alive()).toBeLessThanOrEqual(JUICE_TUNING.particleCapacity);
  });

  test("presets emit half their count above 80% full unless they are loot", () => {
    const pool = createParticlePool(() => settings(), seededRng(2));
    while (pool.alive() < JUICE_TUNING.particleCapacity * 0.8 + 1) pool.emit("dust", 0, 0);
    let before = pool.alive();
    pool.emit("embers", 0, 0);
    expect(pool.alive() - before).toBe(Math.floor(JUICE_TUNING.presets.embers.count / 2));
    before = pool.alive();
    pool.emit("embers", 0, 0, { loot: true });
    expect(pool.alive() - before).toBe(JUICE_TUNING.presets.embers.count);
  });

  test("particles age out", () => {
    const pool = createParticlePool(() => settings(), seededRng(3));
    pool.emit("sparks", 0, 0);
    expect(pool.alive()).toBe(JUICE_TUNING.presets.sparks.count);
    pool.update(1);
    expect(pool.alive()).toBe(0);
  });
});

describe("hit significance (H §2.6)", () => {
  test.each([
    [0.049, "small"],
    [0.05, "medium"],
    [0.249, "medium"],
    [0.25, "big"],
  ])("a hit of %d of max life is %s", (fraction, band) => {
    expect(significance(fraction * 100, 100, false, settings())).toBe(band);
  });

  test("bosses count ×10", () => {
    expect(significance(1, 100, true, settings())).toBe("medium");
    expect(significance(1, 100, false, settings())).toBe("small");
    expect(significance(3, 100, true, settings())).toBe("big");
  });
});

describe("juice = 0, the A/B (H §14)", () => {
  test("zeroes shake, hitstop, slow-mo and particle counts", () => {
    const zero = () => settings({ juice: 0 });
    const shake = createShake(zero);
    shake.add(1);
    expect(shake.offset(0.1)).toEqual({ x: 0, y: 0 });
    const hitstop = createHitstop(zero);
    hitstop.global(5, 0, 1);
    hitstop.actor("a", 3, true, 0, 1);
    expect(hitstop.frozen(1)).toBe(false);
    expect(hitstop.actorFrozen("a", 1)).toBe(false);
    const slowmo = createSlowmo(zero);
    slowmo.start(0.35, 600, 0, 1);
    expect(slowmo.timeScale(100)).toBe(1);
    const pool = createParticlePool(zero, seededRng(4));
    pool.emit("sparks", 0, 0);
    expect(pool.alive()).toBe(0);
  });
});

describe("the settings store (P21)", () => {
  test("persists in its storage and falls back to defaults", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
    };
    const a = createSettings(storage);
    expect(a.get()).toEqual(DEFAULT_SETTINGS);
    a.set({ juice: 0, shake: "low" });
    expect(createSettings(storage).get()).toMatchObject({
      juice: 0,
      shake: "low",
      shakeMax: DEFAULT_SETTINGS.shakeMax,
    });
    memory.set("mvm-juice-settings", "{broken");
    expect(createSettings(storage).get()).toEqual(DEFAULT_SETTINGS);
  });
});
