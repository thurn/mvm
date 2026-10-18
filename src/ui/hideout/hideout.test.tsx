import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { newAccount } from "../../account/lifecycle";
import type { AccountState } from "../../account/state";
import { newHero } from "../../heroes/model/hero";
import type { ItemInstance } from "../../heroes/model/item";
import { generateGear } from "../../loot/items";
import { createStreams, streamRng } from "../../sim/rng";
import { id } from "../../types/ids";
import { Hideout } from "./Hideout";
import { isSpell, rollUnrolled, stashView } from "./model";

afterEach(cleanup);

const rng = streamRng(createStreams(11), "loot");
let n = 0;
function gear(
  itemClass: string,
  rarity: ItemInstance["rarity"] = "magic",
  ilvl = 10,
): ItemInstance {
  return generateGear({ ilvl, rarity, itemClass, newId: () => `gear-${n++}` }, rng);
}

/** A warrior: slot 0 the acolyte (Sceptre), slot 1 Rolling Slam (Two Hand Mace), slot 2 APR (Crossbow). */
function warrior(): AccountState {
  return newAccount("warrior");
}

function setup(account: AccountState) {
  const onSave = vi.fn();
  render(<Hideout account={account} onSave={onSave} onPlay={() => {}} />);
  return onSave;
}

function drag(from: HTMLElement, to: HTMLElement) {
  fireEvent.dragStart(from);
  fireEvent.dragOver(to);
  fireEvent.drop(to);
  fireEvent.dragEnd(from);
}

describe("drag to equip (GDD §15, H §4.5)", () => {
  test("a matching weapon equips, writes the account, returns the old weapon to the stash and saves", () => {
    const account = warrior();
    const mace = gear("Two Hand Mace");
    account.stash.items.push(mace);
    const old = account.roster.slots[1]!.weapon;
    const onSave = setup(account);
    drag(screen.getByTestId(`stash-item-${mace.id}`), screen.getByTestId("slot-1-weapon"));
    expect(account.roster.slots[1]!.weapon).toBe(mace);
    expect(account.stash.items).not.toContain(mace);
    if (old) expect(account.stash.items).toContain(old);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("a weapon outside the hero's locked class is refused and nothing changes", () => {
    const account = warrior();
    const bow = gear("Bow");
    account.stash.items.push(bow);
    const before = JSON.stringify(account);
    const onSave = setup(account);
    drag(screen.getByTestId(`stash-item-${bow.id}`), screen.getByTestId("slot-1-weapon"));
    expect(JSON.stringify(account)).toBe(before);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("slot-1-weapon").dataset.denied).toBe("true");
  });

  test("an equipped item dragged back to the stash unequips it", () => {
    const account = warrior();
    const weapon = account.roster.slots[2]!.weapon!;
    const onSave = setup(account);
    drag(screen.getByTestId("slot-2-weapon"), screen.getByTestId("stash-drop"));
    expect(account.roster.slots[2]!.weapon).toBeNull();
    expect(account.stash.items).toContain(weapon);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("the roster", () => {
  test("a stash hero dragged into an empty unlocked slot joins the roster; a locked slot refuses", () => {
    const account = warrior();
    account.roster.unlocked = 4;
    const hero = newHero("h-1", id<"Gem">("Metadata/Items/Gems/SkillGemLightningArrow"), 3);
    account.stash.heroes.push(hero);
    setup(account);
    drag(screen.getByTestId("stash-hero-h-1"), screen.getByTestId("roster-slot-4"));
    expect(account.roster.slots[4]).toBeNull();
    expect(account.stash.heroes).toContain(hero);
    drag(screen.getByTestId("stash-hero-h-1"), screen.getByTestId("roster-slot-3"));
    expect(account.roster.slots[3]!.hero).toBe(hero);
    expect(account.stash.heroes).not.toContain(hero);
  });

  test("the roster cannot drop below one hero", () => {
    const account = warrior();
    account.roster.slots[1] = null;
    account.roster.slots[2] = null;
    const acolyte = account.roster.slots[0]!;
    const onSave = setup(account);
    drag(screen.getByTestId("roster-hero-0"), screen.getByTestId("stash-drop"));
    expect(account.roster.slots[0]).toBe(acolyte);
    expect(account.stash.heroes).toEqual([]);
    expect(onSave).not.toHaveBeenCalled();
  });

  test("benching one of several heroes moves it and its items to the stash", () => {
    const account = warrior();
    const card = account.roster.slots[2]!;
    setup(account);
    drag(screen.getByTestId("roster-hero-2"), screen.getByTestId("stash-drop"));
    expect(account.roster.slots[2]).toBeNull();
    expect(account.stash.heroes).toContain(card.hero);
    if (card.weapon) expect(account.stash.items).toContain(card.weapon);
  });

  test("locked slots render locked, and six slots plus the spell slot show", () => {
    setup(warrior());
    for (let i = 0; i < 6; i++) expect(screen.getByTestId(`roster-slot-${i}`)).toBeTruthy();
    expect(screen.getByTestId("roster-slot-3").dataset.locked).toBe("true");
    expect(screen.getByTestId("roster-spell")).toBeTruthy();
    expect(within(screen.getByTestId("roster-slot-1")).getByTestId("dps")).toBeTruthy();
  });
});

describe("the stash view (GDD §15)", () => {
  function stocked() {
    const account = warrior();
    const items = [
      gear("Ring", "rare", 5),
      gear("Two Hand Mace", "normal", 8),
      gear("Body Armour", "magic", 12),
      gear("Crossbow", "rare", 3),
      gear("Amulet", "normal", 20),
    ];
    account.stash.items.push(...items);
    account.stash.heroes.push(newHero("h-2", id<"Gem">("Metadata/Items/Gems/SkillGemSpark"), 4));
    return { account, items };
  }

  test("filters by slot and by rarity", () => {
    const { account, items } = stocked();
    const ids = (filter: Parameters<typeof stashView>[1]) =>
      stashView(account, filter).map((e) => (e.kind === "item" ? e.item.id : e.hero.id));
    // The starter weapons are in the roster, not the stash.
    expect(ids({ slot: "weapon", rarity: "all", upgradeOnly: false, sort: "newest" })).toEqual([
      items[3]!.id,
      items[1]!.id,
    ]);
    expect(ids({ slot: "accessory", rarity: "all", upgradeOnly: false, sort: "newest" })).toEqual([
      items[4]!.id,
      items[0]!.id,
    ]);
    expect(ids({ slot: "hero", rarity: "all", upgradeOnly: false, sort: "newest" })).toEqual([
      "h-2",
    ]);
    expect(ids({ slot: "all", rarity: "rare", upgradeOnly: false, sort: "newest" })).toEqual([
      items[3]!.id,
      items[0]!.id,
    ]);
  });

  test("sorts by rarity (rarest first, then level) and by level (highest first)", () => {
    const { account, items } = stocked();
    const ids = (sort: "rarity" | "level") =>
      stashView(account, { slot: "all", rarity: "all", upgradeOnly: false, sort })
        .filter((e) => e.kind === "item")
        .map((e) => (e.kind === "item" ? e.item.id : ""));
    expect(ids("rarity")).toEqual([
      items[0]!.id,
      items[3]!.id,
      items[2]!.id,
      items[4]!.id,
      items[1]!.id,
    ]);
    expect(ids("level")).toEqual([
      items[4]!.id,
      items[2]!.id,
      items[1]!.id,
      items[0]!.id,
      items[3]!.id,
    ]);
  });

  test("Upgrade only keeps the items flagged as upgrades", () => {
    const { account } = stocked();
    const all = stashView(account, {
      slot: "all",
      rarity: "all",
      upgradeOnly: false,
      sort: "newest",
    });
    const upgrades = stashView(account, {
      slot: "all",
      rarity: "all",
      upgradeOnly: true,
      sort: "newest",
    });
    expect(upgrades.every((e) => e.kind === "item" && e.upgrade)).toBe(true);
    expect(upgrades.length).toBe(all.filter((e) => e.kind === "item" && e.upgrade).length);
  });
});

describe("unrolled hero drops (1.18)", () => {
  test("roll into stash heroes with their drop's rarity, the same way from the same save", () => {
    const make = () => {
      const account = warrior();
      account.stash.unrolled.push(
        { kind: "hero", rarity: "magic", itemLevel: 2 },
        { kind: "spell", rarity: "normal", itemLevel: 1 },
      );
      return account;
    };
    const a = make();
    expect(rollUnrolled(a)).toBe(2);
    expect(a.stash.unrolled).toEqual([]);
    expect(a.stash.heroes.map((h) => h.rarity)).toEqual(["magic", "normal"]);
    expect(isSpell(a.stash.heroes[1]!)).toBe(true);
    const b = make();
    rollUnrolled(b);
    expect(b.stash.heroes).toEqual(a.stash.heroes);
  });
});
