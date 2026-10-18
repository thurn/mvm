import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { installQaSurface } from "../dev/qa-surface";
import { Game } from "./Game";

afterEach(cleanup);

const click = (name: string) => act(() => screen.getByRole("button", { name }).click());

/** mason hv-7ic2.106: one call takes QA back to a fresh title, with nothing saved. */
test("window.__mvm.reset() returns to a title with New game and no Continue", async () => {
  installQaSurface();
  render(<Game />);
  await screen.findByRole("button", { name: "New game" });
  await click("New game");
  await click("Choose Warrior");
  await screen.findByRole("button", { name: "Play Level 1" });

  await act(() => window.__mvm!.reset!());

  expect(await screen.findByRole("button", { name: "New game" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
});
