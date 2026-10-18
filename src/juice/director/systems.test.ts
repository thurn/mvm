import { expect, test } from "vitest";
import { createLayerStack } from "../../render/layers";
import { createSettings } from "../core/settings";
import { createPresentation, type PresentationFactory } from "./systems";

test("registered presentation factories get the board's stack and receive every cue", () => {
  const stack = createLayerStack();
  const seen: string[] = [];
  const factory: PresentationFactory = ({ stack: s }) => {
    s.register({ id: "test-layer", layer: "impacts", draw: () => {} });
    return { id: "test", consume: (cue) => void seen.push(cue.kind) };
  };
  const { director } = createPresentation({
    stack,
    settings: createSettings(null),
    now: () => 0,
    speed: () => 1,
    factories: [factory],
  });
  director.handle([{ type: "placed", heroId: "h" as never, lane: 2, column: 3 }]);
  expect(seen).toContain("sound");
  expect(() => stack.register({ id: "test-layer", layer: "impacts", draw: () => {} })).toThrow();
});
