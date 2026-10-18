import { expect, test } from "vitest";
import { createIntentQueue, drain, enqueue } from "./intents";

test("the intent queue drains in order and empties", () => {
  const queue = createIntentQueue();
  enqueue(queue, { type: "place", cardId: "card-1", lane: 2, column: 3 });
  enqueue(queue, { type: "setSpeed", speed: 2 });
  expect(drain(queue).map((i) => i.type)).toEqual(["place", "setSpeed"]);
  expect(drain(queue)).toEqual([]);
});
