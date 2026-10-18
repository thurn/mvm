import { describe, expect, test } from "vitest";
import type { SkillHit } from "../../combat/hit";
import { VFX_TUNING } from "../../tuning/juice";
import { vfxProfile } from "./profile";
import { lightningPolyline, ringAt, volleyDelayMs } from "./shapes";

const arrow = (over: Partial<SkillHit> = {}): SkillHit => ({
  kind: "attack",
  tags: ["projectile"],
  base: { lightning: { min: 10, max: 20 } },
  baseCrit: 5,
  ...over,
});

describe("vfxProfile (H §5.3)", () => {
  test("a pure lightning arrow is yellow with no trail", () => {
    const p = vfxProfile(arrow(), {});
    expect(p.main).toBe("lightning");
    expect(p.color).toBe(VFX_TUNING.fx.lightning.main);
    expect(p.trail).toBeNull();
    expect(p.outline).toBeNull();
  });

  test("lightning-to-fire conversion turns the colour orange, and lightning becomes the trail", () => {
    const p = vfxProfile(arrow({ conversion: { lightning: { fire: 60 } } }), {});
    expect(p.main).toBe("fire");
    expect(p.color).toBe(VFX_TUNING.fx.fire.main);
    expect(p.core).toBe(VFX_TUNING.fx.fire.core);
    expect(p.trail).toBe(VFX_TUNING.fx.lightning.main);
  });

  test("physical converted to cold by stats recolours the projectile", () => {
    const p = vfxProfile(arrow({ base: { physical: { min: 10, max: 10 } } }), {
      "physical_converted_to_cold_%": 100,
    });
    expect(p.main).toBe("cold");
  });

  test("gained as extra draws an outline in the gained element", () => {
    const p = vfxProfile(arrow(), { "damage_gained_as_fire_%": 30 });
    expect(p.main).toBe("lightning");
    expect(p.outline).toBe(VFX_TUNING.fx.fire.main);
    expect(p.trail).toBe(VFX_TUNING.fx.fire.main);
  });

  test("ring scale tracks the area multiplier", () => {
    expect(vfxProfile(arrow(), {}).ringScale).toBe(1);
    expect(vfxProfile(arrow(), { "area_of_effect_+%": 40 }).ringScale).toBeCloseTo(1.4);
  });

  test("trail length grows with projectile speed; crit sparks above 20% crit", () => {
    expect(vfxProfile(arrow(), { "projectile_speed_+%": 50 }).trailLength).toBe(10);
    expect(vfxProfile(arrow(), {}).critSpark).toBe(false);
    expect(vfxProfile(arrow({ baseCrit: 25 }), {}).critSpark).toBe(true);
  });
});

describe("shapes (H §5.3, §2.8, §11.1)", () => {
  test("the volley offsets extra projectiles by one frame each", () => {
    expect([0, 1, 2].map(volleyDelayMs)).toEqual([0, 1000 / 60, 2000 / 60]);
  });

  test("a lightning polyline keeps its ends, subdivides 4 times, and stays within ±12 px", () => {
    let seed = 3;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const points = lightningPolyline({ x: 0, y: 0 }, { x: 100, y: 0 }, rng);
    expect(points).toHaveLength(17);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 100, y: 0 });
    for (const p of points) expect(Math.abs(p.y)).toBeLessThanOrEqual(12);
  });

  test("rings expand from 30% over 120 ms, then fade over 200 ms", () => {
    expect(ringAt(0).scale).toBeCloseTo(0.3);
    expect(ringAt(120)).toEqual({ scale: 1, alpha: 1, done: false });
    expect(ringAt(220).alpha).toBeCloseTo(0.5);
    expect(ringAt(320).done).toBe(true);
  });
});
