import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { createAccountStore } from "../../account/store";
import type { GemId } from "../../data/types";
import { newHero, type HeroInstance } from "../../heroes/model/hero";
import type { ItemInstance } from "../../heroes/model/item";
import { ITEM_ORBS } from "../../loot/craft";
import { HERO_ORBS, SHARDS } from "../../loot/craft/heroes";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { Hideout } from "../hideout/Hideout";
import { CraftTab } from "./CraftTab";

afterEach(cleanup);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

let n = 0;
const ring = (rarity: ItemInstance["rarity"]): ItemInstance =>
  generateGear(
    { ilvl: 10, rarity, itemClass: "Ring", newId: () => id<"Item">(`hero-craft-${n++}`) },
    streamRng(createStreams(5), "loot"),
  );

const hero = (supports: string[] = []): HeroInstance => ({
  ...newHero(
    id<"OwnedHero">(`jewel-${n++}`),
    "Metadata/Items/Gems/SkillGemLightningArrow" as GemId,
    10,
  ),
  supports: supports as HeroInstance["supports"],
});

function hideout(account: AccountState) {
  const onSave = vi.fn();
  render(<Hideout store={createAccountStore(account, onSave)} onPlay={() => {}} />);
  fireEvent.click(screen.getByRole("tab", { name: "Stash" }));
  return onSave;
}

function salvageByDrag(testId: string) {
  const tile = screen.getByTestId(testId);
  const bin = screen.getByTestId("stash-salvage");
  fireEvent.dragStart(tile);
  fireEvent.dragOver(bin);
  fireEvent.drop(bin);
  fireEvent.dragEnd(tile);
}

describe("the Jeweller's Orb in the Craft tab (H §9.2)", () => {
  test("dropping it on a hero opens a socket, fills it, and spends the orb", () => {
    const account = newAccount("ranger");
    const target = hero();
    account.stash.heroes.push(target);
    account.currency[HERO_ORBS.lesser] = 2;
    const onSave = vi.fn();
    render(<CraftTab store={createAccountStore(account, onSave)} />);
    fireEvent.click(screen.getByTestId("orb-jeweller"));
    expect(screen.getByTestId(`craft-hero-${target.id}`).dataset.target).toBe("valid");
    fireEvent.click(screen.getByTestId(`craft-hero-${target.id}`));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const crafted = account.stash.heroes.find((h) => h.id === target.id)!;
    expect(crafted.supports).toHaveLength(1);
    expect(account.currency[HERO_ORBS.lesser]).toBe(1);
    expect(screen.getByTestId("socket-open")).toBeTruthy();
    expect(onSave).toHaveBeenCalled();
  });

  test("a hero at the Lesser Jeweller's ceiling dims and refuses it", () => {
    const account = newAccount("ranger");
    const full = hero([
      "Metadata/Items/Gem/SupportGemBrink",
      "Metadata/Items/Gem/SupportGemChargedShots",
      "Metadata/Items/Gem/SupportGemConsideredCasting",
    ]);
    account.stash.heroes.push(full);
    account.currency[HERO_ORBS.lesser] = 1;
    render(<CraftTab store={createAccountStore(account, vi.fn())} />);
    fireEvent.click(screen.getByTestId("orb-jeweller"));
    expect(screen.getByTestId(`craft-hero-${full.id}`).dataset.target).toBe("invalid");
    fireEvent.click(screen.getByTestId(`craft-hero-${full.id}`));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(account.currency[HERO_ORBS.lesser]).toBe(1);
    expect(screen.getByTestId("craft-status").textContent).toMatch(/can't/i);
  });
});

describe("salvage in the stash (C §C.5.6)", () => {
  test("dragging a magic item onto Salvage turns it into a shard and shows the count", () => {
    const account = newAccount("ranger");
    const item = ring("magic");
    account.stash.items.push(item);
    const onSave = hideout(account);
    salvageByDrag(`stash-item-${item.id}`);
    expect(account.stash.items).not.toContain(item);
    expect(account.currency[SHARDS.transmutation]).toBe(1);
    expect(screen.getByTestId("shard-transmutation").textContent).toContain("1/10");
    expect(screen.getByTestId("hideout-status").textContent).toMatch(/Transmutation Shard/);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("the tenth shard merges into its orb, and the stash says so", () => {
    const account = newAccount("ranger");
    const item = ring("magic");
    account.stash.items.push(item);
    account.currency[SHARDS.transmutation] = 9;
    const orbs = account.currency[ITEM_ORBS.transmutation] ?? 0;
    hideout(account);
    salvageByDrag(`stash-item-${item.id}`);
    expect(account.currency[ITEM_ORBS.transmutation]).toBe(orbs + 1);
    expect(screen.getByTestId("shard-transmutation").textContent).toContain("0/10");
    expect(screen.getByTestId("hideout-status").textContent).toMatch(/merged/i);
  });

  test("a hero salvages into a Jeweller's Shard, and a normal item is refused", () => {
    const account = newAccount("ranger");
    const magicHero = { ...hero(), rarity: "magic" as const };
    const normal = ring("normal");
    account.stash.heroes.push(magicHero);
    account.stash.items.push(normal);
    hideout(account);
    salvageByDrag(`stash-hero-${magicHero.id}`);
    expect(account.currency[SHARDS.jeweller]).toBe(1);
    const before = structuredClone(account);
    salvageByDrag(`stash-item-${normal.id}`);
    expect(account).toEqual(before);
    expect(screen.getByTestId("hideout-status").textContent).toMatch(/sell/i);
  });
});
