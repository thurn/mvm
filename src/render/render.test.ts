import { describe, expect, test } from "vitest";
import { createLayerStack, LAYERS } from "./layers";
import { chooseScale } from "./scale";

describe("integer scale chooser", () => {
  test.each([
    [1280, 720, 2],
    [1920, 1080, 3],
    [800, 400, 1],
    [500, 300, 1],
  ])("%dx%d picks %d", (w, h, scale) => {
    expect(chooseScale(w, h)).toBe(scale);
  });
});

describe("layer stack", () => {
  test("draws layers in Appendix H §1.4 order, then registration order", () => {
    const stack = createLayerStack();
    const drawn: string[] = [];
    const draw = (name: string) => () => void drawn.push(name);
    stack.register({ id: "numbers", layer: "numbers", draw: draw("numbers") });
    stack.register({ id: "hud", layer: "hud", draw: draw("hud") });
    stack.register({ id: "lawn", layer: "lawn", draw: draw("lawn") });
    stack.register({ id: "monsters", layer: "actors", draw: draw("monsters") });
    stack.register({ id: "heroes", layer: "actors", draw: draw("heroes") });
    stack.draw({} as never, { shake: { x: 0, y: 0 } } as never);
    expect(drawn).toEqual(["lawn", "monsters", "heroes", "numbers", "hud"]);
  });

  test("the HUD is the only layer outside the shaken board", () => {
    expect(LAYERS.filter((l) => !l.shaken).map((l) => l.id)).toEqual(["hud"]);
  });

  test("registering the same id twice is refused", () => {
    const stack = createLayerStack();
    stack.register({ id: "x", layer: "lawn", draw: () => {} });
    expect(() => stack.register({ id: "x", layer: "lawn", draw: () => {} })).toThrow();
  });
});
