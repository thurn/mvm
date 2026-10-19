import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Drop } from "../../loot/drops";
import { generateGear } from "../../loot/items";
import { createLayerStack } from "../../render/layers";
import type { MonsterInstanceId } from "../../sim/state";
import { createRound } from "../../sim/state";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { tickerStore } from "../../ui/hud/ticker/store";
import { createSettings } from "../core/settings";
import { createPresentation } from "../director/systems";

const played: { id: string; gainDb: number | undefined }[] = [];
vi.mock("../../audio", () => ({
  audioEngine: () => ({
    play: (id: string, at: { gainDb?: number } = {}) => {
      played.push({ id, gainDb: at.gainDb });
      return null;
    },
  }),
}));

const { lootSystem } = await import("./system");

beforeEach(() => {
  played.length = 0;
});

const item = (rarity: "normal" | "magic") =>
  generateGear(
    { ilvl: 3, rarity, itemClass: "Ring", newId: () => id<"Item">(`hidden-${rarity}`) },
    streamRng(createStreams(4), "loot"),
  );

/** Drops one item on a fresh board and plays its whole timeline. */
function playDrop(drop: Drop) {
  let now = 0;
  const stack = createLayerStack();
  const { director } = createPresentation({
    stack,
    settings: createSettings(null),
    now: () => now,
    speed: () => 1,
    factories: [lootSystem],
  });
  director.handle([
    {
      type: "drop",
      dropId: "d1",
      monsterId: "m1" as MonsterInstanceId,
      lane: 2,
      x: 5,
      drop,
    },
  ]);
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) => (typeof key === "string" ? () => ({ addColorStop() {} }) : undefined),
    set: () => true,
  });
  const state = createRound({ seed: 1, lanes: [1, 2, 3], mana: 0 });
  for (now = 0; now < 6000; now += 16)
    stack.draw(ctx, { state, previousX: new Map(), alpha: 0, shake: { x: 0, y: 0 }, now });
}

describe("hidden drops (H §3.7, C §C.7)", () => {
  test("a hidden drop adds no ticker line and plays no stinger, only a muted coin tick", () => {
    playDrop({ kind: "item", item: item("magic"), hidden: true });
    expect(tickerStore.lines()).toEqual([]);
    expect(played.filter((p) => p.id.startsWith("drop_"))).toEqual([]);
    expect(played).toContainEqual({ id: "coin", gainDb: expect.any(Number) });
    expect(played.find((p) => p.id === "coin")!.gainDb!).toBeLessThan(0);
  });

  test("a shown normal drop gets its ticker line and stinger, whatever the dev knobs say", () => {
    playDrop({ kind: "item", item: item("normal") });
    expect(tickerStore.lines()).toHaveLength(1);
    expect(played.map((p) => p.id)).toContain("drop_normal");
  });
});
