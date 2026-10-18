import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Scene } from "../dev/scenes";
import { createRound } from "../sim/state";
import { Board } from "./Board";

beforeEach(() => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("resizing the window rescales the canvas without restarting the round", () => {
  const create = vi.fn(() => createRound({ seed: 1, lanes: [2], mana: 0 }));
  const scene: Scene = { name: "test", create };
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 720);
  const { container } = render(<Board scene={scene} />);
  expect(container.querySelector("canvas")!.width).toBe(1152);

  vi.stubGlobal("innerWidth", 1920);
  vi.stubGlobal("innerHeight", 1080);
  act(() => void window.dispatchEvent(new Event("resize")));

  expect(container.querySelector("canvas")!.width).toBe(1728);
  expect(create).toHaveBeenCalledTimes(1);
});
