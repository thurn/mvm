import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { LEVEL_1 } from "../../monsters/levels/level-1";
import { Campaign } from "./Campaign";
import { elementPreview } from "./element";

afterEach(cleanup);

describe("the level element preview (GDD §15 campaign map)", () => {
  test("Grassland shows no element; a biome element shows the team's resistance against the cap", () => {
    const account = newAccount("warrior");
    expect(elementPreview(LEVEL_1, account)).toBeNull();
    account.roster.slots[0]!.accessory = {
      id: "r" as never,
      baseId: "Metadata/Items/Rings/Ring1" as never,
      rarity: "magic",
      itemLevel: 5,
      quality: 0,
      mods: [{ modId: "TeamFireResist1" as never, values: [12] }],
    };
    const preview = elementPreview({ ...LEVEL_1, element: "fire" }, account);
    expect(preview).toEqual({ label: "Fire", resist: 12, cap: 75 });
    render(
      <Campaign
        level={1}
        cleared={false}
        element={preview}
        onPlay={() => {}}
        onHideout={() => {}}
      />,
    );
    expect(screen.getByTestId("level-element").textContent).toBe("Fire 12% / 75%");
  });
});
