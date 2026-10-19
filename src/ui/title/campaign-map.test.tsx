import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { Campaign } from "./Campaign";

afterEach(cleanup);

function setup() {
  const account = newAccount("ranger");
  account.firstClears = ["level-1"];
  const onPlay = vi.fn();
  render(<Campaign account={account} onPlay={onPlay} onHideout={() => {}} />);
  return { onPlay };
}

describe("the campaign map (GDD §15, plan 2.24)", () => {
  test("one node per level, each with its area level, monster types and first-clear reward", () => {
    setup();
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`node-level-${n}`)).toBeTruthy();
    const two = screen.getByTestId("node-level-2").textContent!;
    expect(two).toContain("Area level 2");
    expect(two).toContain("Helmed Skeleton");
    expect(two).toMatch(/slot 5/i);
    expect(screen.getByTestId("node-level-4").textContent).toMatch(/Strongbox possible/);
    expect(screen.getByTestId("node-level-5").textContent).toContain("The Bloated Miller");
  });

  test("locked levels can't start, the next level plays, and cleared ones replay", () => {
    const { onPlay } = setup();
    const locked = screen.getByTestId("play-level-3");
    expect(locked).toHaveProperty("disabled", true);
    fireEvent.click(locked);
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("play-level-2"));
    expect(onPlay).toHaveBeenLastCalledWith("level-2");
    const replay = screen.getByTestId("play-level-1");
    expect(replay.textContent).toMatch(/Replay/);
    fireEvent.click(replay);
    expect(onPlay).toHaveBeenLastCalledWith("level-1");
  });

  test("selecting a node draws the path to it", () => {
    setup();
    fireEvent.click(screen.getByTestId("node-level-2"));
    expect(screen.getByTestId("map-path").dataset.to).toBe("2");
  });
});
