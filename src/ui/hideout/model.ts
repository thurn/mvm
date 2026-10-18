import { isUpgrade } from "../../account/upgrades";
import type { AccountState } from "../../account/state";
import type { HeroInstance } from "../../heroes/model/hero";
import { itemSlot, type ItemInstance, type ItemSlot } from "../../heroes/model/item";

export interface StashFilter {
  slot: "all" | ItemSlot | "hero";
  rarity: "all" | ItemInstance["rarity"];
  upgradeOnly: boolean;
  sort: "newest" | "rarity" | "level";
}

export type StashEntry =
  { kind: "item"; item: ItemInstance; upgrade: boolean } | { kind: "hero"; hero: HeroInstance };

const RARITY_RANK = { normal: 0, magic: 1, rare: 2, unique: 3 } as const;

function rarityOf(entry: StashEntry) {
  return RARITY_RANK[entry.kind === "item" ? entry.item.rarity : entry.hero.rarity];
}

function levelOf(entry: StashEntry) {
  return entry.kind === "item" ? entry.item.itemLevel : entry.hero.level;
}

/**
 * The stash as uniform cards (GDD §15): filtered by slot (or heroes),
 * rarity and Upgrade; sorted newest first, rarest first (then highest
 * level), or highest level first (then rarest).
 */
export function stashView(account: AccountState, filter: StashFilter): StashEntry[] {
  const entries: StashEntry[] = [
    ...account.stash.items.map((item): StashEntry => ({
      kind: "item",
      item,
      upgrade: isUpgrade(account, item),
    })),
    ...account.stash.heroes.map((hero): StashEntry => ({ kind: "hero", hero })),
  ];
  const kept = entries
    .map((entry, order) => ({ entry, order }))
    .filter(({ entry }) => {
      if (filter.slot === "hero") {
        if (entry.kind !== "hero") return false;
      } else if (filter.slot !== "all") {
        if (entry.kind !== "item" || itemSlot(entry.item) !== filter.slot) return false;
      }
      if (filter.rarity !== "all" && rarityOf(entry) !== RARITY_RANK[filter.rarity]) return false;
      if (filter.upgradeOnly && !(entry.kind === "item" && entry.upgrade)) return false;
      return true;
    });
  kept.sort((a, b) => {
    if (filter.sort === "rarity")
      return rarityOf(b.entry) - rarityOf(a.entry) || levelOf(b.entry) - levelOf(a.entry);
    if (filter.sort === "level")
      return levelOf(b.entry) - levelOf(a.entry) || rarityOf(b.entry) - rarityOf(a.entry);
    return b.order - a.order;
  });
  return kept.map(({ entry }) => entry);
}
