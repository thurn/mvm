import { describe, expect, test } from "vitest";
import type { SpriteEntry } from "../../assets/manifest";
import { SPRITE_TUNING } from "../../tuning/sprites";
import { ActorClock, AttackAnimator, attackFrame, deathFrame, walkFrameMs } from "./animation";
import { chooseFrame } from "./choose";

const hero: SpriteEntry = {
  kind: "hero",
  facing: "right",
  placeholderColor: "#fff",
  animations: {
    attack: { x: 0, y: 0, frameSize: 64, frames: 13, release: 9 },
    death: { x: 0, y: 64, frameSize: 64, frames: 6 },
  },
};
const hammer: SpriteEntry = {
  ...hero,
  animations: { attack: { x: 0, y: 128, frameSize: 128, frames: 9, release: 4 } },
};
const monster: SpriteEntry = {
  kind: "monster",
  facing: "left",
  placeholderColor: "#fff",
  animations: {
    walk: { x: 832, y: 0, frameSize: 64, frames: 9, loopFrom: 1 },
    attack: { x: 832, y: 64, frameSize: 64, frames: 6, release: 4 },
    death: { x: 832, y: 128, frameSize: 64, frames: 6 },
  },
};

describe("frame chooser (G §1.1, §1.3)", () => {
  test("a hero idles on attack frame 0, drawn at its cell lifted 6 px", () => {
    expect(chooseFrame(hero, "idle", 0, 100, 200)).toEqual({
      sx: 0,
      sy: 0,
      size: 64,
      dx: 100 - 32,
      dy: 200 - 32 - SPRITE_TUNING.anchorLiftPx,
    });
  });

  test("an attack frame steps along the strip; oversize frames centre the body", () => {
    expect(chooseFrame(hero, "attack", 9, 100, 200)).toMatchObject({ sx: 9 * 64, sy: 0 });
    expect(chooseFrame(hammer, "attack", 2, 100, 200)).toEqual({
      sx: 256,
      sy: 128,
      size: 128,
      dx: 100 - 32 - 32,
      dy: 200 - 32 - SPRITE_TUNING.anchorLiftPx - 32,
    });
  });

  test("monsters use their left-facing walk, attack and death strips", () => {
    expect(monster.facing).toBe("left");
    expect(chooseFrame(monster, "walk", 3, 0, 0)).toMatchObject({ sx: 832 + 3 * 64, sy: 0 });
    expect(chooseFrame(monster, "attack", 4, 0, 0)).toMatchObject({ sx: 832 + 4 * 64, sy: 64 });
    expect(chooseFrame(monster, "death", 5, 0, 0)).toMatchObject({ sx: 832 + 5 * 64, sy: 128 });
  });

  test("a frame past the strip clamps to its last frame; a missing strip is null", () => {
    expect(chooseFrame(monster, "death", 99, 0, 0)).toMatchObject({ sx: 832 + 5 * 64 });
    expect(chooseFrame(hammer, "death", 0, 0, 0)).toBeNull();
  });
});

describe("attack timeline (H §5.2)", () => {
  const strip = { frames: 6, release: 4 };
  // 0.6 s over 6 frames + 1 held slot: each slot ~85.7 ms; release at slot 5.
  const slot = 0.6 / 7;

  test("idles while the next action is far off", () => {
    expect(attackFrame(strip, { period: 2, timeToNext: 1.5, sinceAction: null })).toBe(0);
  });

  test("winds up toward the release, holding the frame before it", () => {
    const releaseAt = 5 * slot;
    expect(
      attackFrame(strip, { period: 2, timeToNext: releaseAt - 0.001, sinceAction: null }),
    ).toBe(0);
    expect(attackFrame(strip, { period: 2, timeToNext: 1.5 * slot, sinceAction: null })).toBe(3);
    expect(attackFrame(strip, { period: 2, timeToNext: 0.5 * slot, sinceAction: null })).toBe(3);
  });

  test("shows the release frame as the action lands, then follows through to idle", () => {
    expect(attackFrame(strip, { period: 2, timeToNext: 2, sinceAction: 0 })).toBe(4);
    expect(attackFrame(strip, { period: 2, timeToNext: 2 - slot, sinceAction: slot })).toBe(5);
    expect(attackFrame(strip, { period: 2, timeToNext: 1, sinceAction: 1 })).toBe(0);
  });

  test("the release-frame callback fires once, on the release frame", () => {
    const seen: number[] = [];
    const animator = new AttackAnimator(() => seen.push(animator.frame));
    // The timer counts down, the action fires and resets it, and it counts down again.
    let timer = 0.8;
    for (let i = 0; i < 100; i++) {
      timer -= 1 / 60;
      if (timer <= 0) timer += 1;
      animator.sample(strip, timer, 1);
    }
    expect(seen).toEqual([4]);
  });
});

describe("clocks", () => {
  test("actor hitstop holds an actor's frame while the sim advances", () => {
    const clock = new ActorClock();
    const frameMs = walkFrameMs(1);
    const frames: number[] = [];
    for (let ms = 0; ms < 2000; ms += 16) {
      const frozen = ms >= 500 && ms < 1000;
      clock.advance(16, frozen);
      frames.push(clock.frame(frameMs, 9, 1));
    }
    const held = frames.slice(500 / 16 + 1, 1000 / 16);
    expect(new Set(held).size).toBe(1);
    expect(new Set(frames).size).toBeGreaterThan(2);
  });

  test("a 4.7 s/tile Shambler walks at 220 ms a frame (G §1.3)", () => {
    expect(walkFrameMs(1)).toBeCloseTo(220, 0);
    expect(walkFrameMs(10)).toBe(80);
  });

  test("death plays hurt, then fades over 400 ms", () => {
    expect(deathFrame(0)).toEqual({ frame: 0, alpha: 1, done: false });
    expect(deathFrame(550)).toEqual({ frame: 5, alpha: 1, done: false });
    expect(deathFrame(800).alpha).toBeCloseTo(0.5);
    expect(deathFrame(1001).done).toBe(true);
  });
});
