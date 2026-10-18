import { describe, expect, test } from "vitest";
import { createDriver } from "./driver";

function counting() {
  let steps = 0;
  return {
    step: () => void steps++,
    get steps() {
      return steps;
    },
  };
}

describe("fixed-step driver", () => {
  test("runs exactly 60 steps per simulated second at 1x", () => {
    const sim = counting();
    const driver = createDriver({ step: sim.step });
    for (let i = 0; i < 144; i++) driver.advance(1000 / 144);
    expect(sim.steps).toBe(60);
  });

  test("runs 120 steps per second at 2x", () => {
    const sim = counting();
    const driver = createDriver({ step: sim.step });
    driver.setSpeed(2);
    for (let i = 0; i < 60; i++) driver.advance(1000 / 60);
    expect(sim.steps).toBe(120);
  });

  test("runs no steps during a global hitstop, then resumes", () => {
    const sim = counting();
    let frozen = true;
    const driver = createDriver({ step: sim.step, hooks: { frozen: () => frozen } });
    for (let i = 0; i < 30; i++) driver.advance(1000 / 60);
    expect(sim.steps).toBe(0);
    frozen = false;
    for (let i = 0; i < 60; i++) driver.advance(1000 / 60);
    expect(sim.steps).toBe(60);
  });

  test("slow-mo and debugSlowmo scale sim time", () => {
    const sim = counting();
    const driver = createDriver({ step: sim.step, hooks: { timeScale: () => 0.5 } });
    driver.setDebugSlowmo(0.5);
    for (let i = 0; i < 240; i++) driver.advance(1000 / 60);
    expect(sim.steps).toBe(60);
  });

  test("pausing stops steps and a long frame is clamped", () => {
    const sim = counting();
    const driver = createDriver({ step: sim.step });
    driver.setPaused(true);
    driver.advance(1000);
    expect(sim.steps).toBe(0);
    driver.setPaused(false);
    driver.advance(5000);
    expect(sim.steps).toBeLessThanOrEqual(15);
  });

  test("alpha reports progress toward the next step", () => {
    const driver = createDriver({ step: () => {} });
    driver.advance(1000 / 120);
    expect(driver.alpha()).toBeCloseTo(0.5, 6);
  });
});
