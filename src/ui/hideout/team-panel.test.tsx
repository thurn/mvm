import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import { createAccountStore } from "../../account/store";
import type { ItemInstance } from "../../heroes/model/item";
import { teamSheet } from "../../heroes/model/team";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { itemName } from "../cards/ItemCard";
import { Hideout } from "./Hideout";

afterEach(cleanup);

let n = 0;
const ring = (mods: { modId: string; values: number[] }[]): ItemInstance => ({
  ...generateGear(
    { ilvl: 5, rarity: "magic", itemClass: "Ring", newId: () => id<"Item">(`team-${n++}`) },
    streamRng(createStreams(n + 1), "loot"),
  ),
  mods: mods as ItemInstance["mods"],
});

describe("the Team panel (GDD §15, A §2.1)", () => {
  test("it sums the roster's team stats, and hovering a line lists exactly the items it comes from", () => {
    const account = newAccount("warrior");
    const fire = [0, 1, 2].map(() => ring([{ modId: "TeamFireResist1", values: [4] }]));
    fire.forEach((item, i) => (account.roster.slots[i]!.accessory = item));
    account.roster.slots[0]!.accessory = ring([
      { modId: "TeamFireResist1", values: [4] },
      { modId: "TeamColdResist1", values: [5] },
    ]);
    const sources = [account.roster.slots[0]!.accessory!, fire[1]!, fire[2]!];
    render(<Hideout store={createAccountStore(account, vi.fn())} onPlay={() => {}} />);
    const sheet = teamSheet(account.roster.slots.flatMap((c) => (c ? [c] : [])));
    const line = screen.getByTestId("team-line-fire_resistance_%");
    expect(line.textContent).toContain(`+${sheet["fire_resistance_%"]}% team fire resistance`);
    expect(screen.getByTestId("team-line-cold_resistance_%").textContent).toContain("+5%");
    fireEvent.mouseEnter(line);
    const tip = screen.getByTestId("team-sources");
    for (const item of sources) expect(tip.textContent).toContain(itemName(item).name);
    expect(tip.querySelectorAll("li")).toHaveLength(3);
  });

  test("a roster with no team affixes says so", () => {
    render(<Hideout store={createAccountStore(newAccount("ranger"), vi.fn())} onPlay={() => {}} />);
    expect(screen.getByTestId("team-panel").textContent).toMatch(/no team stats/i);
  });
});
