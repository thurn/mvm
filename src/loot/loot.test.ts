import { id } from "../types/ids";
import { describe, expect, test } from "vitest";
import { seededRng } from "../combat/test-rng";
import { baseItems, mods } from "../data";
import { LOOT_TUNING } from "../tuning/loot";
import { rollDrops, type Drop } from "./drops";
import { goldPileSize } from "./gold";
import { generateGear, itemLevel } from "./items";
import { itemSellPrice } from "./prices";
import { starterItem } from "./starter";

let counter = 0;
const newId = () => id<"Item">(`item-${counter++}`);
const modById = new Map(mods().map((m) => [m.id as string, m]));

describe("Appendix C §C.6.1: a rare spear from a rare monster at area level 14", () => {
  test("has the documented shape: item level 15, 4–6 mods, legal tiers and caps", () => {
    expect(itemLevel(14, "rare")).toBe(15);
    expect(itemLevel(14, "normal")).toBe(14);
    expect(itemLevel(14, "boss")).toBe(16);
    for (let seed = 0; seed < 50; seed++) {
      const item = generateGear(
        { ilvl: 15, rarity: "rare", itemClass: "Spear", newId },
        seededRng(seed),
      );
      const base = baseItems().find((b) => b.id === item.baseId)!;
      expect(base.itemClass).toBe("Spear");
      expect(base.dropLevel).toBeLessThanOrEqual(15);
      expect(item.itemLevel).toBe(15);
      expect(item.mods.length).toBeGreaterThanOrEqual(4);
      expect(item.mods.length).toBeLessThanOrEqual(6);
      const rolled = item.mods.map((m) => modById.get(m.modId)!);
      expect(rolled.filter((m) => m.generationType === "prefix").length).toBeLessThanOrEqual(3);
      expect(rolled.filter((m) => m.generationType === "suffix").length).toBeLessThanOrEqual(3);
      const groups = rolled.flatMap((m) => m.groups);
      expect(new Set(groups).size).toBe(groups.length);
      for (const [i, m] of rolled.entries()) {
        m.stats.forEach((stat, s) => {
          const value = item.mods[i]!.values[s]!;
          expect(value).toBeGreaterThanOrEqual(stat.min);
          expect(value).toBeLessThanOrEqual(stat.max);
        });
      }
    }
  });
});

test("an affix above its item-level gate never rolls (1,000 seeds)", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const ilvl = 1 + (seed % 10);
    const item = generateGear({ ilvl, rarity: "rare", newId }, seededRng(seed));
    for (const m of item.mods)
      expect(modById.get(m.modId)!.requiredLevel).toBeLessThanOrEqual(ilvl);
    expect(baseItems().find((b) => b.id === item.baseId)!.dropLevel).toBeLessThanOrEqual(ilvl);
  }
});

test("magic items have at most one prefix and one suffix", () => {
  for (let seed = 0; seed < 300; seed++) {
    const item = generateGear({ ilvl: 10, rarity: "magic", newId }, seededRng(seed));
    const rolled = item.mods.map((m) => modById.get(m.modId)!);
    expect(rolled.length).toBeGreaterThanOrEqual(1);
    expect(rolled.filter((m) => m.generationType === "prefix").length).toBeLessThanOrEqual(1);
    expect(rolled.filter((m) => m.generationType === "suffix").length).toBeLessThanOrEqual(1);
  }
});

describe("per-kill drops (Appendix E §3–§5)", () => {
  function kills(n: number, rarity: "normal" | "magic" | "rare", seed = 1, affixes = 0) {
    const rng = seededRng(seed);
    const drops: Drop[] = [];
    for (let i = 0; i < n; i++) {
      drops.push(
        ...rollDrops(
          { rarity, affixCount: affixes, areaLevel: 1 },
          { newId, rosterWeaponClasses: [] },
          rng,
        ),
      );
    }
    return drops;
  }

  test("over 10,000 normal kills at area level 1, the item rarity mix matches E §3.2", () => {
    const drops = kills(10_000, "normal");
    const items = drops.filter((d) => d.kind !== "currency" && d.kind !== "gold");
    expect(items.length / 10_000).toBeGreaterThan(0.065);
    expect(items.length / 10_000).toBeLessThan(0.095);
    const rarity = (d: Drop) =>
      d.kind === "item" ? d.item.rarity : d.kind === "hero" || d.kind === "spell" ? d.rarity : "";
    const share = (r: string) => items.filter((d) => rarity(d) === r).length / items.length;
    expect(share("normal")).toBeGreaterThan(0.7);
    expect(share("normal")).toBeLessThan(0.82);
    expect(share("magic")).toBeGreaterThan(0.14);
    expect(share("magic")).toBeLessThan(0.26);
    expect(share("rare")).toBeGreaterThan(0.01);
    expect(share("rare")).toBeLessThan(0.07);
    const gear = items.filter((d) => d.kind === "item").length / items.length;
    expect(gear).toBeGreaterThan(0.8);
    expect(gear).toBeLessThan(0.9);
  });

  test("currency and gold rates follow E §4.1 and §5.1", () => {
    const drops = kills(10_000, "normal", 2);
    const currency = drops.filter((d) => d.kind === "currency");
    expect(currency.length / 10_000).toBeCloseTo(LOOT_TUNING.currencyChance.normal, 2);
    // At area level 1 only Transmutation and Augmentation can drop.
    for (const d of currency) {
      expect(d.kind === "currency" && d.currencyId).toMatch(
        /CurrencyUpgradeToMagic$|CurrencyAddModToMagic$/,
      );
    }
    const gold = drops.filter((d) => d.kind === "gold");
    expect(gold.length / 10_000).toBeCloseTo(0.25, 1);
  });

  test("magic monsters drop more and better", () => {
    const normal = kills(5_000, "normal", 3).filter((d) => d.kind === "item").length;
    const magic = kills(5_000, "magic", 3, 1).filter((d) => d.kind === "item").length;
    expect(magic).toBeGreaterThan(normal * 4);
  });
});

describe("gold piles (E §5.1)", () => {
  test.each([1, 10, 29])("pile size at area level %d stays in the formula's bounds", (area) => {
    const rng = seededRng(area);
    const low = Math.round((2 + 0.4 * area) * 0.75);
    const high = Math.round((2 + 0.4 * area) * 1.25);
    for (let i = 0; i < 2000; i++) {
      const size = goldPileSize(area, 0, rng);
      expect(size).toBeGreaterThanOrEqual(low);
      expect(size).toBeLessThanOrEqual(high);
    }
    expect(goldPileSize(area, 100, () => 0.5)).toBe(Math.round((2 + 0.4 * area) * 2));
  });
});

test("starter bases and sell prices", () => {
  const bow = starterItem("Bow", id<"Item">("starter-bow"));
  expect(baseItems().find((b) => b.id === bow.baseId)!.name).toBe("Crude Bow");
  expect(bow).toMatchObject({ rarity: "normal", itemLevel: 1, mods: [] });
  expect(itemSellPrice({ ...bow, itemLevel: 14, rarity: "magic" })).toBeCloseTo(
    0.2 * (10 + 28) * 2.5,
  );
  expect(itemSellPrice({ ...bow, itemLevel: 14, rarity: "unique" })).toBe((10 + 28) * 4);
});

test("an item level no base can drop at fails loudly instead of looping", () => {
  expect(() => generateGear({ ilvl: 0, rarity: "normal", newId }, seededRng(1))).toThrow(
    /item level 0/,
  );
});
