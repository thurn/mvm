import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { App } from "./App";

afterEach(cleanup);

test("the default page loads the persisted game", () => {
  render(<App />);
  expect(screen.getByText("Loading…")).toBeTruthy();
});
