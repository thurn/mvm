import type { ItemInstance } from "../heroes/model/item";
import { LOOT_TUNING } from "../tuning/loot";

/** What a vendor sells an item for (Appendix E §5.2). Uniques are never sold. */
function itemBuyPrice(item: ItemInstance): number {
  const t = LOOT_TUNING;
  const base = t.priceBase + t.pricePerItemLevel * item.itemLevel;
  if (item.rarity === "unique") return base * t.uniqueSellMultiplier;
  return base * t.priceRarity[item.rarity];
}

/** What selling an item earns: 20% of its buy price, or a unique's fixed price (E §5.2). */
export function itemSellPrice(item: ItemInstance): number {
  if (item.rarity === "unique") return itemBuyPrice(item);
  return itemBuyPrice(item) * LOOT_TUNING.sellShare;
}
