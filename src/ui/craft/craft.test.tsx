import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { createAccountStore } from "../../account/store";
import type { ItemInstance } from "../../heroes/model/item";
import { ITEM_ORBS, type ItemOrb } from "../../loot/craft";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { CraftTab } from "./CraftTab";

afterEach(cleanup);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

let n = 0;
const gear = (rarity: ItemInstance["rarity"], seed = 1): ItemInstance =>
  generateGear(
    { ilvl: 10, rarity, itemClass: "Ring", newId: () => id<"Item">(`craft-ui-${n++}`) },
    streamRng(createStreams(seed), "loot"),
  );

function setup(item: ItemInstance, orbs: Partial<Record<ItemOrb, number>>) {
  const account: AccountState = newAccount("ranger");
  account.stash.items.push(item);
  for (const [orb, count] of Object.entries(orbs))
    account.currency[ITEM_ORBS[orb as ItemOrb]] = count;
  const onSave = vi.fn();
  render(<CraftTab store={createAccountStore(account, onSave)} />);
  return { account, onSave };
}

/** Picks up an orb and drops it on an item by clicks, then lets the slam and suspense play out. */
function apply(orb: ItemOrb, item: ItemInstance) {
  fireEvent.click(screen.getByTestId(`orb-${orb}`));
  fireEvent.click(screen.getByTestId(`craft-item-${item.id}`));
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

describe("the Craft tab (GDD §15, H §9.2)", () => {
  test.each([
    ["transmutation", "normal", "magic"],
    ["augmentation", "magic", "magic"],
    ["regal", "magic", "rare"],
    ["exalted", "rare", "rare"],
    ["alchemy", "normal", "rare"],
  ] as const)("%s on a %s item through the UI leaves it %s and spends the orb", (orb, from, to) => {
    let item = gear(from, 4);
    if (orb === "augmentation") item = { ...item, mods: item.mods.slice(0, 1) };
    if (orb === "exalted") item = { ...item, mods: item.mods.slice(0, 4) };
    const { account, onSave } = setup(item, { [orb]: 2 });
    const mods = item.mods.length;
    apply(orb, item);
    const crafted = account.stash.items.find((i) => i.id === item.id)!;
    expect(crafted.rarity).toBe(to);
    expect(crafted.mods.length).not.toBe(orb === "alchemy" ? mods : -1);
    expect(account.currency[ITEM_ORBS[orb]]).toBe(1);
    expect(onSave).toHaveBeenCalled();
  });

  test("valid targets pulse and invalid ones dim while an orb is held", () => {
    const normal = gear("normal");
    const { account } = setup(normal, { regal: 1 });
    account.stash.items.push(gear("magic", 2));
    fireEvent.click(screen.getByTestId("orb-regal"));
    expect(screen.getByTestId(`craft-item-${normal.id}`).dataset.target).toBe("invalid");
  });

  test("an invalid target refuses the drop and changes nothing", () => {
    const rare = gear("rare");
    const { account, onSave } = setup(rare, { transmutation: 1 });
    const before = structuredClone(account);
    apply("transmutation", rare);
    expect(account).toEqual(before);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("craft-status").textContent).toMatch(/can't/i);
  });

  test("an orb you have none of can't be picked up", () => {
    const normal = gear("normal");
    const { account } = setup(normal, {});
    fireEvent.click(screen.getByTestId("orb-transmutation"));
    fireEvent.click(screen.getByTestId(`craft-item-${normal.id}`));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(account.stash.items[0]!.rarity).toBe("normal");
  });
});
