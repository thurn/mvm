import { describe, expect, test } from "vitest";
import { baseItems } from "../data";
import { uniques } from "../data/uniques";
import type { GemId } from "../data/types";
import { catalogEntry } from "../heroes/model/catalog";
import { generateGear } from "../loot/items";
import { heroBuyPrice, itemBuyPrice } from "../loot/prices";
import { LEVEL_1 } from "../monsters/levels/level-1";
import { startLevel } from "../monsters/waves";
import type { SaveDocument } from "../save/registry";
import m1 from "../save/fixtures/milestones/m1.json";
import { createStreams, streamRng } from "../sim/rng";
import { id } from "../types/ids";
import { finishLevel, newAccount, resumeFromDocument, saveDocument } from "./lifecycle";
import type { AccountState } from "./state";
import { buyBack, buyOffer, gambleHero, gambleItem, sellHero, sellItem } from "./vendors";

/** Ends a level with this result, as finishLevel sees it. */
function finish(account: AccountState, result: "won" | "lost", seed = 1) {
  const round = startLevel(LEVEL_1, seed);
  round.result = result;
  return finishLevel(account, round);
}

const ring = (ilvl: number, rarity: "normal" | "magic" | "rare") =>
  generateGear(
    { ilvl, rarity, itemClass: "Ring", newId: () => id<"Item">(`v-test-${ilvl}-${rarity}`) },
    streamRng(createStreams(3), "loot"),
  );

describe("vendor prices (Appendix E §5.2)", () => {
  test("E §5.2's worked prices at level 10 (ilvl 14)", () => {
    expect(itemBuyPrice({ ...ring(14, "magic"), rarity: "magic" })).toBe(95);
    expect(itemBuyPrice({ ...ring(14, "rare"), rarity: "rare" })).toBe(266);
    expect(
      heroBuyPrice({ level: 14, rarity: "rare", skillId: "MvM/Heroes/EzomyteAcolyte" as GemId }),
    ).toBe(399);
  });

  test("a spell costs 1.2× the hero price, and selling pays 20%, in whole gold", () => {
    const account = newAccount("ranger");
    const spell = account.roster.spell!.hero;
    const asHero = heroBuyPrice({ ...spell, skillId: "MvM/Heroes/EzomyteAcolyte" as GemId });
    expect(heroBuyPrice(spell)).toBe(Math.round(asHero * 1.2));
    const item = ring(3, "magic");
    account.stash.items.push(item);
    expect(sellItem(account, item.id)).toBe(true);
    expect(account.gold).toBe(Math.round(itemBuyPrice(item) * 0.2));
    expect(Number.isInteger(account.gold)).toBe(true);
  });
});

describe("vendor stock (Appendix E §5.3)", () => {
  test("a new account's Armorer holds 4 weapons, 3 armours or shields and 3 accessories at the unlocked area level", () => {
    const account = newAccount("warrior");
    const { armorer, recruiter, spells } = account.vendorStock!;
    const slot = (itemClass: string) =>
      ["Body Armour", "Shield"].includes(itemClass)
        ? "armour"
        : ["Ring", "Amulet", "Belt"].includes(itemClass)
          ? "accessory"
          : "weapon";
    const classes = armorer.map((i) => slot(baseItems().find((b) => b.id === i.baseId)!.itemClass));
    expect(classes.filter((c) => c === "weapon")).toHaveLength(4);
    expect(classes.filter((c) => c === "armour")).toHaveLength(3);
    expect(classes.filter((c) => c === "accessory")).toHaveLength(3);
    expect(armorer.every((i) => i.itemLevel === 1 && i.rarity !== "unique")).toBe(true);
    expect(recruiter).toHaveLength(6);
    expect(recruiter.every((h) => catalogEntry(h.skillId).role !== "spell")).toBe(true);
    expect(spells).toHaveLength(2);
    expect(spells.every((h) => catalogEntry(h.skillId).role === "spell")).toBe(true);
  });

  test("the stock refreshes after a win and after a loss, and not on reload", () => {
    const account = newAccount("ranger");
    const first = structuredClone(account.vendorStock);
    finish(account, "lost");
    const afterLoss = structuredClone(account.vendorStock);
    expect(afterLoss).not.toEqual(first);
    finish(account, "won", 2);
    expect(account.vendorStock).not.toEqual(afterLoss);

    const doc = saveDocument(account, null, "test", "2026-10-18T00:00:00.000Z");
    const resumed = resumeFromDocument(doc).account;
    expect(resumed.vendorStock).toEqual(account.vendorStock);
    expect(resumeFromDocument(doc).account.vendorStock).toEqual(account.vendorStock);
  });

  test("a stored offer whose base the data no longer has is dropped on load, with no gold", () => {
    const account = newAccount("ranger");
    const offer = account.vendorStock!.armorer[0]!;
    offer.baseId = "Metadata/Items/Retired/Gone" as typeof offer.baseId;
    const doc = saveDocument(account, null, "test", "2026-10-18T00:00:00.000Z");
    const resumed = resumeFromDocument(doc).account;
    expect(resumed.vendorStock!.armorer.map((i) => i.id)).not.toContain(offer.id);
    expect(resumed.gold).toBe(account.gold);
  });

  test("a save with malformed stock loads with fresh stock", () => {
    const account = newAccount("ranger");
    const doc = saveDocument(account, null, "test", "2026-10-18T00:00:00.000Z");
    (doc.account.data as Record<string, unknown>).vendorStock = { armorer: "broken" };
    expect(resumeFromDocument(doc).account.vendorStock?.armorer).toHaveLength(10);
  });

  test("the M1 fixture loads with fresh stock and an empty buyback", () => {
    const { account } = resumeFromDocument(m1 as unknown as SaveDocument);
    expect(account.vendorStock?.armorer).toHaveLength(10);
    expect(account.vendorStock?.recruiter).toHaveLength(6);
    expect(account.buyback).toEqual([]);
  });
});

describe("buying, selling and buyback (Appendix E §5.2–§5.3)", () => {
  test("a purchase with too little gold is refused and changes nothing", () => {
    const account = newAccount("ranger");
    const offer = account.vendorStock!.armorer[0]!;
    account.gold = itemBuyPrice(offer) - 1;
    const before = structuredClone(account);
    expect(buyOffer(account, offer.id)).toBe(false);
    expect(account).toEqual(before);
  });

  test("a purchase pays the price and moves the offer into the stash", () => {
    const account = newAccount("ranger");
    const offer = account.vendorStock!.recruiter[0]!;
    account.gold = 10_000;
    expect(buyOffer(account, offer.id)).toBe(true);
    expect(account.gold).toBe(10_000 - heroBuyPrice(offer));
    expect(account.stash.heroes.map((h) => h.id)).toContain(offer.id);
    expect(account.vendorStock!.recruiter.map((h) => h.id)).not.toContain(offer.id);
  });

  test("buyback keeps the last 10 things sold, at their sell price", () => {
    const account = newAccount("ranger");
    for (let i = 0; i < 12; i++) {
      const item = { ...ring(5, "rare"), id: id<"Item">(`sold-${i}`) };
      account.stash.items.push(item);
      sellItem(account, item.id);
    }
    expect(account.buyback).toHaveLength(10);
    expect(account.buyback[0]!.kind === "item" && account.buyback[0]!.item.id).toBe("sold-11");
    const hero = account.roster.slots[0]!.hero;
    account.stash.heroes.push({ ...hero, id: id<"OwnedHero">("sold-hero") });
    expect(sellHero(account, id<"OwnedHero">("sold-hero"))).toBe(true);
    const entry = account.buyback[0]!;
    expect(entry.price).toBe(Math.round(heroBuyPrice(hero) * 0.2));

    const gold = account.gold;
    expect(buyBack(account, 0)).toBe(true);
    expect(account.gold).toBe(gold - entry.price);
    expect(account.stash.heroes.map((h) => h.id)).toContain("sold-hero");
    expect(account.buyback).toHaveLength(9);
  });
});

describe("gambling (Appendix E §5.3)", () => {
  const share = (values: string[], value: string) =>
    values.filter((v) => v === value).length / values.length;

  test("an item gamble costs 1.5× the magic price and reveals Magic 75% / Rare 22% / Unique 3% over 10,000 rolls", () => {
    const unique = uniques().find((u) => {
      const base = baseItems().find((b) => b.id === u.baseId);
      return base !== undefined && base.dropLevel <= 1;
    })!;
    const account = newAccount("ranger");
    account.gold = 1e9;
    const rarities: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const gold = account.gold;
      const item = gambleItem(account, unique.baseId);
      expect(item?.baseId).toBe(unique.baseId);
      rarities.push(item!.rarity);
      if (i === 0) expect(gold - account.gold).toBe(Math.round(1.5 * (10 + 2 * 1) * 2.5));
    }
    expect(share(rarities, "magic")).toBeCloseTo(0.75, 1);
    expect(share(rarities, "rare")).toBeCloseTo(0.22, 1);
    expect(share(rarities, "unique")).toBeGreaterThan(0.02);
    expect(share(rarities, "unique")).toBeLessThan(0.04);
  });

  test("a base with no demo unique never reveals one", () => {
    const base = baseItems().find(
      (b) => b.dropLevel <= 1 && !uniques().some((u) => u.baseId === b.id),
    )!;
    const account = newAccount("ranger");
    account.gold = 1e9;
    for (let i = 0; i < 500; i++) expect(gambleItem(account, base.id)?.rarity).not.toBe("unique");
  });

  test("a hero gamble by role reveals that role at Magic 70% / Rare 30% over 2,000 rolls", () => {
    const account = newAccount("ranger");
    account.firstClears = ["level-1", "level-2", "level-3", "level-4"];
    account.gold = 1e9;
    const rarities: string[] = [];
    // 2,000, not 10,000: each hero rolls its supports (~0.5 ms); ±0.04 is about 4σ.
    for (let i = 0; i < 2_000; i++) {
      const hero = gambleHero(account, { role: "ranged" })!;
      expect(["basicRanged", "advancedRanged"]).toContain(catalogEntry(hero.skillId).role);
      rarities.push(hero.rarity);
    }
    expect(Math.abs(share(rarities, "magic") - 0.7)).toBeLessThan(0.04);
    expect(Math.abs(share(rarities, "rare") - 0.3)).toBeLessThan(0.04);
  });

  test("a gamble with too little gold is refused and changes nothing", () => {
    const account = newAccount("ranger");
    const before = structuredClone(account);
    expect(gambleHero(account, { tag: "fire" })).toBeNull();
    expect(gambleItem(account, baseItems()[0]!.id)).toBeNull();
    expect(account).toEqual(before);
  });
});
