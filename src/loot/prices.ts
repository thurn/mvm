import type { HeroInstance } from "../heroes/model/hero";
import { catalogEntry } from "../heroes/model/catalog";
import type { ItemInstance } from "../heroes/model/item";
import { VENDOR_TUNING } from "../tuning/economy";
import { LOOT_TUNING } from "../tuning/loot";

/** Prices are whole gold. */
const gold = (value: number) => Math.round(value);

/** An item's price before rarity: (10 + 2 × ilvl) (Appendix E §5.2). */
const itemBase = (itemLevel: number) =>
  LOOT_TUNING.priceBase + LOOT_TUNING.pricePerItemLevel * itemLevel;

/** What a vendor sells an item for (Appendix E §5.2); a unique's figure is only its fixed sell price. */
export function itemBuyPrice(item: Pick<ItemInstance, "rarity" | "itemLevel">): number {
  const base = itemBase(item.itemLevel);
  if (item.rarity === "unique") return gold(base * LOOT_TUNING.uniqueSellMultiplier);
  return gold(base * LOOT_TUNING.priceRarity[item.rarity]);
}

/** What selling an item earns: 20% of its buy price, or a unique's fixed price (E §5.2). */
export function itemSellPrice(item: Pick<ItemInstance, "rarity" | "itemLevel">): number {
  if (item.rarity === "unique") return itemBuyPrice(item);
  return gold(itemBuyPrice(item) * LOOT_TUNING.sellShare);
}

/** What a vendor sells a hero for, or a spell at 1.2× (E §5.2). */
export function heroBuyPrice(hero: Pick<HeroInstance, "level" | "rarity" | "skillId">): number {
  const t = VENDOR_TUNING;
  const price =
    (t.heroPriceBase + t.heroPricePerLevel * hero.level) * LOOT_TUNING.priceRarity[hero.rarity];
  return gold(catalogEntry(hero.skillId).role === "spell" ? price * t.spellPriceMultiplier : price);
}

/** What selling a hero or spell earns: 20% of its buy price. */
export function heroSellPrice(hero: Pick<HeroInstance, "level" | "rarity" | "skillId">): number {
  return gold(heroBuyPrice(hero) * LOOT_TUNING.sellShare);
}

/** An item gamble at an item level: 1.5× the magic buy price (E §5.3). */
export function itemGamblePrice(itemLevel: number): number {
  return gold(VENDOR_TUNING.gambleCost * itemBuyPrice({ rarity: "magic", itemLevel }));
}

/** A hero gamble at a level: 1.5× the magic hero price (E §5.3). */
export function heroGamblePrice(level: number): number {
  const t = VENDOR_TUNING;
  return gold(
    t.gambleCost * (t.heroPriceBase + t.heroPricePerLevel * level) * LOOT_TUNING.priceRarity.magic,
  );
}
