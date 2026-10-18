import { expect, test } from "vitest";
import { step } from "../../sim/kernel";
import { findScene, SCENES } from ".";

test.each(SCENES.map((s) => [s.name, s] as const))(
  "scene %s boots and steps 600 ticks",
  (_name, scene) => {
    const state = scene.create();
    for (let i = 0; i < 600; i++) step(state, []);
    expect(state.tick).toBeGreaterThan(0);
  },
);

test("shamblers-vs-scripted shows Shamblers dying", () => {
  const state = findScene("shamblers-vs-scripted")!.create();
  const kills = [];
  for (let i = 0; i < 60 * 60; i++) kills.push(...step(state, []).filter((e) => e.type === "kill"));
  expect(kills.length).toBeGreaterThan(0);
});
