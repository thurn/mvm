import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { starterCard } from "../../heroes/model/starter";
import { createLayerStack } from "../../render/layers";
import { registerTerrainLayer } from "../../render/terrain";
import { lockRoster } from "../../sim/economy/roster";
import { createRound } from "../../sim/state";
import { id } from "../../types/ids";
import { Hud } from "./Hud";
import { canUse } from "./placement";
import { createRoundStore } from "./round-store";

afterEach(cleanup);

const ARROW = "Metadata/Items/Gems/SkillGemLightningArrow";
const EARTHQUAKE = "Metadata/Items/Gems/SkillGemEarthquake";

function rockyRound() {
  const round = createRound({ seed: 1, lanes: [1, 2, 3], mana: 500 });
  round.terrain = [{ lane: 2, column: 4, kind: "rock" }];
  lockRoster(round, [
    starterCard(id<"Gem">(ARROW), 1, "arrow"),
    starterCard(id<"Gem">(EARTHQUAKE), 1, "quake"),
  ]);
  return round;
}

describe("terrain presentation (D §8, plan 2.16)", () => {
  test("the placement preview refuses a Rock tile for a hero, but a spell can target it", () => {
    const round = rockyRound();
    const hero = round.roster.find((s) => s.cardId === "arrow")!;
    const spell = round.roster.find((s) => s.cardId === "quake")!;
    expect(canUse(round, hero, { lane: 2, column: 4 })).toBe(false);
    expect(canUse(round, hero, { lane: 2, column: 5 })).toBe(true);
    expect(canUse(round, spell, { lane: 2, column: 4 })).toBe(true);
  });

  test("picking a hero marks every unplaceable tile, and a click on Rock sends nothing", () => {
    const round = rockyRound();
    const enqueue = vi.fn();
    render(<Hud store={createRoundStore(round)} enqueue={enqueue} scale={1} countdown={null} />);
    expect(screen.queryByTestId("blocked-2-4")).toBeNull();
    fireEvent.click(screen.getByTestId("card-arrow"));
    expect(screen.getByTestId("blocked-2-4")).toBeTruthy();
    const overlay = screen.getByTestId("placement-overlay");
    const at = { clientX: 3.5 * 64, clientY: 2.5 * 64 };
    fireEvent.mouseMove(overlay, at);
    expect(screen.getByTestId("ghost").dataset.valid).toBe("false");
    fireEvent.click(overlay, at);
    expect(enqueue).not.toHaveBeenCalled();
  });

  test("the planning banner shows until the first sky orb, once per round", () => {
    const round = rockyRound();
    const store = createRoundStore(round);
    render(<Hud store={store} enqueue={vi.fn()} scale={1} countdown={null} />);
    expect(screen.getByTestId("planning-banner").textContent).toMatch(/Prepare your defence/);
    act(() => {
      round.sky.count = 1;
      store.notify(0);
    });
    expect(screen.queryByTestId("planning-banner")).toBeNull();
    act(() => {
      round.sky.count = 1;
      round.tick += 600;
      store.notify(1);
    });
    expect(screen.queryByTestId("planning-banner")).toBeNull();
  });

  test("the terrain layer draws on each Rock tile", () => {
    const round = rockyRound();
    const stack = createLayerStack();
    registerTerrainLayer(stack);
    const rects: [number, number][] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_t, key) =>
        key === "fillRect"
          ? (x: number, y: number) => void rects.push([x, y])
          : typeof key === "string"
            ? () => {}
            : undefined,
      set: () => true,
    });
    stack.draw(ctx, {
      state: round,
      previousX: new Map(),
      alpha: 0,
      shake: { x: 0, y: 0 },
      now: 0,
    });
    expect(rects.length).toBeGreaterThan(0);
    expect(rects.every(([x, y]) => x >= 3 * 64 && x < 4 * 64 && y >= 2 * 64 && y < 3 * 64)).toBe(
      true,
    );
  });
});
