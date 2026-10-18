import { describe, expect, test } from "vitest";
import { LOOT_JUICE } from "../../../tuning/juice";
import { tickerStore } from "./store";

describe("loot ticker store (H §3.1)", () => {
  test("keeps the newest lines first, at most the ticker's height, and clears for a new round", () => {
    tickerStore.clear();
    for (let i = 0; i < 6; i++)
      tickerStore.push({ text: `d${i}`, color: "#fff", at: i, shimmer: false });
    expect(tickerStore.lines().map((l) => l.text)).toEqual(
      ["d5", "d4", "d3", "d2"].slice(0, LOOT_JUICE.tickerLines),
    );
    tickerStore.clear();
    expect(tickerStore.lines()).toEqual([]);
  });
});
