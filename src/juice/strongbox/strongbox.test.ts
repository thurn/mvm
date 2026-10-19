import { describe, expect, test } from "vitest";
import { createLayerStack } from "../../render/layers";
import type { SimEvent } from "../../sim/events";
import { createRound } from "../../sim/state";
import { bannerSystem } from "../banners/system";
import { createSettings } from "../core/settings";
import { DEFAULT_SETTINGS } from "../core/settings";
import { cuesFor } from "../cues";
import { createPresentation } from "../director/systems";
import { strongboxSystem } from "./system";

function recordingCtx() {
  const calls: { op: string; x: number; y: number; text?: string }[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, key) => {
      if (key === "fillRect" || key === "strokeRect")
        return (x: number, y: number) => calls.push({ op: key, x, y });
      if (key === "fillText")
        return (text: string, x: number, y: number) => calls.push({ op: key, x, y, text });
      if (key === "createLinearGradient" || key === "createRadialGradient")
        return () => ({ addColorStop() {} });
      return typeof key === "string" ? () => {} : undefined;
    },
    set: () => true,
  });
  return { ctx, calls };
}

function setup(factories: Parameters<typeof createPresentation>[0]["factories"]) {
  let now = 0;
  const stack = createLayerStack();
  const { director } = createPresentation({
    stack,
    settings: createSettings(null),
    now: () => now,
    speed: () => 1,
    ...(factories ? { factories } : {}),
  });
  const state = createRound({ seed: 1, lanes: [0, 1, 2, 3, 4], mana: 0 });
  const draw = (at: number) => {
    now = at;
    const rec = recordingCtx();
    stack.draw(rec.ctx, { state, previousX: new Map(), alpha: 0, shake: { x: 0, y: 0 }, now });
    return rec.calls;
  };
  return { state, director, draw };
}

const TRIGGER: SimEvent = {
  type: "strongboxTriggered",
  lane: 2,
  column: 6,
  ambushIds: ["a" as never, "b" as never],
};

describe("Strongbox presentation (H §3.8, plan 2.18)", () => {
  test("the trigger row: T4, the ambush banner, the lock rattle and a dust burst at the chest", () => {
    const batch = cuesFor(TRIGGER, DEFAULT_SETTINGS);
    expect(batch.tier).toBe(4);
    expect(batch.cues).toContainEqual({ kind: "banner", text: "Strongbox ambush!" });
    const sounds = batch.cues
      .filter((c) => c.kind === "sound")
      .map((c) => (c as { id: string }).id);
    expect(sounds).toEqual(expect.arrayContaining(["lock_rattle", "flag_horn"]));
    expect(batch.cues).toContainEqual(
      expect.objectContaining({ kind: "particles", preset: "dust", lane: 2, x: 6 }),
    );
  });

  test("a closed chest draws on its tile with a glow column; an opened one bursts light for 400 ms", () => {
    const { state, draw } = setup([strongboxSystem]);
    state.strongbox = { lane: 2, column: 6, phase: "closed", ambush: [], ambushIds: [] };
    const inTile = (c: { x: number }) => c.x >= 5 * 64 - 8 && c.x < 6 * 64 + 8;
    const closed = draw(16);
    expect(closed.length).toBeGreaterThan(0);
    expect(closed.every(inTile)).toBe(true);
    state.strongbox.phase = "opened";
    const opening = draw(100).length;
    expect(opening).toBeGreaterThan(closed.length);
    expect(draw(700).length).toBeLessThan(opening);
  });

  test("banners show their text for a while: the ambush, and the flag wave's warning", () => {
    const { director, draw } = setup([bannerSystem]);
    director.handle([TRIGGER]);
    expect(draw(200).some((c) => c.text === "Strongbox ambush!")).toBe(true);
    expect(draw(5000).some((c) => c.op === "fillText")).toBe(false);
    director.handle([{ type: "flagWarning", wave: 4 }]);
    expect(draw(5200).some((c) => c.text === "A huge wave of Monsters approaches!")).toBe(true);
  });
});
