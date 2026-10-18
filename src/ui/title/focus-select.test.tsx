import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { STARTER_HEROES } from "../../heroes/model/catalog";
import { heroDescription } from "../../heroes/model/descriptions";
import { FocusSelect } from "./FocusSelect";

afterEach(cleanup);

test("focus select says what every starter hero and spell does", () => {
  render(<FocusSelect onBack={() => {}} onChoose={() => {}} />);
  for (const skillId of STARTER_HEROES)
    expect(screen.getAllByText(heroDescription(skillId).text).length).toBeGreaterThan(0);
});
