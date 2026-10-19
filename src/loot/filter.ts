import { mods } from "../data";
import type { ModData } from "../data/types";
import type { ItemInstance } from "../heroes/model/item";

/** The loot filter's three presets (Appendix C §C.7, GDD §11). */
export type LootFilter = "showAll" | "hideNormal" | "hideLowMagic";

/**
 * An affix's rank at an item level (C §C.7): 1 for the best tier of its
 * family the level allows, 2 for the next lower, and so on.
 */
export function affixRank(
  mod: ModData,
  itemLevel: number,
  catalog: readonly ModData[] = mods(),
): number {
  const better = catalog.filter(
    (m) =>
      m.type === mod.type &&
      m.generationType === mod.generationType &&
      m.requiredLevel <= itemLevel &&
      m.requiredLevel > mod.requiredLevel,
  );
  return better.length + 1;
}

/**
 * Whether a preset hides a drop (C §C.7). Only equipment can hide: Normal
 * items under 'hideNormal' and 'hideLowMagic', and Magic items whose every
 * affix is rank 3 or worse under 'hideLowMagic'. Rares and uniques never.
 */
export function isHidden(
  item: ItemInstance,
  filter: LootFilter,
  catalog: readonly ModData[] = mods(),
): boolean {
  if (filter === "showAll") return false;
  if (item.rarity === "normal") return true;
  if (filter !== "hideLowMagic" || item.rarity !== "magic" || item.mods.length === 0) return false;
  return item.mods.every((m) => {
    const mod = catalog.find((c) => c.id === m.modId);
    return mod !== undefined && affixRank(mod, item.itemLevel, catalog) >= 3;
  });
}
