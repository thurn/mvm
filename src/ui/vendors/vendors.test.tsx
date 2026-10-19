import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { createAccountStore } from "../../account/store";
import { baseItems } from "../../data";
import type { ItemInstance } from "../../heroes/model/item";
import { generateGear } from "../../loot/items";
import { heroBuyPrice, itemBuyPrice, itemSellPrice } from "../../loot/prices";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { ArmorerTab, GambleTab, RecruiterTab } from "./VendorTabs";

afterEach(cleanup);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

let n = 0;
const ring = (rarity: ItemInstance["rarity"]): ItemInstance =>
  generateGear(
    { ilvl: 5, rarity, itemClass: "Ring", newId: () => id<"Item">(`vendor-ui-${n++}`) },
    streamRng(createStreams(8), "loot"),
  );

function open(tab: "armorer" | "recruiter" | "gamble", account: AccountState) {
  const onSave = vi.fn();
  const store = createAccountStore(account, onSave);
  const Tab = { armorer: ArmorerTab, recruiter: RecruiterTab, gamble: GambleTab }[tab];
  render(<Tab store={store} />);
  return onSave;
}

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2000);
  });

describe("the Armorer (GDD §15, E §5.2–§5.3, H §9.3)", () => {
  test("buying an offer pays its price and moves it into the stash", () => {
    const account = newAccount("ranger");
    const offer = account.vendorStock!.armorer[0]!;
    account.gold = 1000;
    const onSave = open("armorer", account);
    fireEvent.click(screen.getByTestId(`buy-${offer.id}`));
    // The coin pour outlives the offer it was poured over (H §9.3).
    expect(screen.getAllByTestId("coin-particle").length).toBeGreaterThan(0);
    settle();
    expect(account.gold).toBe(1000 - itemBuyPrice(offer));
    expect(account.stash.items.map((i) => i.id)).toContain(offer.id);
    expect(screen.queryByTestId(`buy-${offer.id}`)).toBeNull();
    expect(onSave).toHaveBeenCalled();
  });

  test("a purchase with too little gold is refused and changes nothing", () => {
    const account = newAccount("ranger");
    const offer = account.vendorStock!.armorer[0]!;
    account.gold = 0;
    const before = structuredClone(account);
    const onSave = open("armorer", account);
    fireEvent.click(screen.getByTestId(`buy-${offer.id}`));
    settle();
    expect(account).toEqual(before);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("vendor-status").textContent).toMatch(/gold/i);
  });

  test("selling a stash item pays 20%, and buyback returns it at that price", () => {
    const account = newAccount("ranger");
    const item = ring("rare");
    account.stash.items.push(item);
    open("armorer", account);
    fireEvent.click(screen.getByTestId(`sell-item-${item.id}`));
    settle();
    expect(account.gold).toBe(itemSellPrice(item));
    expect(account.stash.items).not.toContain(item);
    fireEvent.click(screen.getByTestId("buyback-0"));
    settle();
    expect(account.gold).toBe(0);
    expect(account.stash.items.map((i) => i.id)).toContain(item.id);
  });
});

describe("the Recruiter (GDD §15, E §5.3)", () => {
  test("hiring a hero pays its price and puts it in the stash", () => {
    const account = newAccount("ranger");
    const hero = account.vendorStock!.recruiter[0]!;
    account.gold = 5000;
    open("recruiter", account);
    fireEvent.click(screen.getByTestId(`buy-${hero.id}`));
    settle();
    expect(account.gold).toBe(5000 - heroBuyPrice(hero));
    expect(account.stash.heroes.map((h) => h.id)).toContain(hero.id);
  });
});

describe("the Gamble tab (E §5.3, B §7.6, H §9.3)", () => {
  test("an item gamble on a chosen base reveals a card of that base after the shake and flip", () => {
    const account = newAccount("ranger");
    account.gold = 1000;
    const base = baseItems().find((b) => b.itemClass === "Ring" && b.dropLevel <= 1)!;
    open("gamble", account);
    fireEvent.change(screen.getByLabelText("Base"), { target: { value: base.id } });
    fireEvent.click(screen.getByTestId("gamble-item"));
    settle();
    const won = account.stash.items[account.stash.items.length - 1]!;
    expect(won.baseId).toBe(base.id);
    expect(account.gold).toBeLessThan(1000);
    expect(screen.getByTestId("gamble-reveal").dataset.rarity).toBe(won.rarity);
  });

  test("a hero gamble by role reveals a hero, and a short purse is refused", () => {
    const account = newAccount("ranger");
    account.gold = 1000;
    open("gamble", account);
    fireEvent.change(screen.getByLabelText("Hero pick"), { target: { value: "role:ranged" } });
    const heroes = account.stash.heroes.length;
    fireEvent.click(screen.getByTestId("gamble-hero"));
    settle();
    expect(account.stash.heroes.length).toBe(heroes + 1);
    account.gold = 0;
    const before = structuredClone(account);
    fireEvent.click(screen.getByTestId("gamble-hero"));
    settle();
    expect(account).toEqual(before);
    expect(screen.getByTestId("vendor-status").textContent).toMatch(/gold/i);
  });

  test("the hero pick lists only roles and tags some unlocked hero fits", () => {
    const account = newAccount("ranger");
    open("gamble", account);
    const options = [...(screen.getByLabelText("Hero pick") as HTMLSelectElement).options].map(
      (o) => o.value,
    );
    expect(options).toContain("role:ranged");
    expect(options).not.toContain("role:curse");
    expect(options).not.toContain("role:aura");
  });
});
