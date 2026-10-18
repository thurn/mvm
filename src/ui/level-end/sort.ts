import type { Drop } from "../../loot/drops";

type Rarity = "normal" | "magic" | "rare" | "unique";
const RANK: Record<Rarity, number> = { normal: 0, magic: 1, rare: 2, unique: 3 };
const KIND = { item: 0, spell: 1, hero: 2 } as const;

/** A drop shown as a card: an item, or a hero or spell waiting for generation. */
export type CardDrop = Extract<Drop, { kind: "item" | "hero" | "spell" }>;

export interface SortedLoot {
  /** Ascending rarity, as they flip left to right (H §3.10); items before spells before heroes within a rarity. */
  cards: { drop: CardDrop; upgrade: boolean }[];
  gold: number;
  /** Counts by currency ID. */
  currency: Record<string, number>;
}

export function dropRarity(drop: CardDrop): Rarity {
  return drop.kind === "item" ? drop.item.rarity : drop.rarity;
}

/** The level's loot for the summary (GDD §15): cards sorted by rarity, gold and currency totalled. */
export function sortDrops(drops: readonly { drop: Drop; upgrade: boolean }[]): SortedLoot {
  const cards: SortedLoot["cards"] = [];
  let gold = 0;
  const currency: Record<string, number> = {};
  for (const { drop, upgrade } of drops) {
    if (drop.kind === "gold") gold += drop.amount;
    else if (drop.kind === "currency")
      currency[drop.currencyId] = (currency[drop.currencyId] ?? 0) + 1;
    else cards.push({ drop, upgrade });
  }
  // Array sort is stable, so equal cards keep their drop order.
  cards.sort(
    (a, b) =>
      RANK[dropRarity(a.drop)] - RANK[dropRarity(b.drop)] || KIND[a.drop.kind] - KIND[b.drop.kind],
  );
  return { cards, gold, currency };
}
